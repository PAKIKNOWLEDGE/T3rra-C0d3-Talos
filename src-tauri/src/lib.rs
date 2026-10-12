use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use tauri::webview::WebviewUrl;
use tauri::{AppHandle, Emitter, Manager, RunEvent, State, WebviewWindowBuilder};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use url::Url;

struct DesktopService {
    child: Mutex<Option<CommandChild>>,
    origin: Mutex<Option<String>>,
}

#[derive(serde::Serialize)]
struct DesktopServiceStatus {
    ready: bool,
    origin: Option<String>,
}

fn config_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("workspace.json"))
}

fn read_saved_workspace(app: &AppHandle) -> Option<String> {
    let path = config_file(app).ok()?;
    let raw = fs::read_to_string(path).ok()?;
    let parsed = serde_json::from_str::<serde_json::Value>(&raw).ok()?;
    parsed
        .get("cwd")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

#[tauri::command]
fn pick_workspace_directory(app: AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .set_title("选择工作区")
        .blocking_pick_folder()
        .map(|p| p.to_string())
}

#[tauri::command]
fn remember_workspace_directory(app: AppHandle, cwd: String) -> Result<(), String> {
    let path = config_file(&app)?;
    let payload = serde_json::json!({ "cwd": cwd });
    fs::write(path, payload.to_string()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn desktop_service_status(state: State<'_, DesktopService>) -> DesktopServiceStatus {
    let origin = state.origin.lock().ok().and_then(|v| v.clone());
    DesktopServiceStatus {
        ready: origin.is_some(),
        origin,
    }
}

fn spawn_desktop_service(app: &AppHandle, service: &DesktopService) -> Result<(), String> {
    let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    let service_script = resource_dir.join("desktop").join("talos-desktop-service.mjs");
    let static_dir = resource_dir.join("desktop").join("static");
    if !service_script.exists() || !static_dir.exists() {
        return Err(format!(
            "Desktop service assets missing under {}",
            resource_dir.display()
        ));
    }

    let node = app.shell().sidecar("node").map_err(|e| e.to_string())?;

    let mut command = node.args([
        service_script.to_string_lossy().as_ref(),
        "--static-dir",
        static_dir.to_string_lossy().as_ref(),
        "--port",
        "0",
    ]);

    if let Some(cwd) = read_saved_workspace(app) {
        if !cwd.trim().is_empty() {
            command = command.args(["--cwd", cwd.as_str()]);
        }
    }

    let (mut rx, child) = command.spawn().map_err(|e| e.to_string())?;
    if let Ok(mut slot) = service.child.lock() {
        *slot = Some(child);
    }

    let app_handle = app.clone();
    let origin_slot = service.origin.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line) = event {
                let text = String::from_utf8_lossy(&line).trim().to_string();
                if let Some(url) = text.strip_prefix("TALOS_DESKTOP_READY ") {
                    if let Ok(mut origin) = origin_slot.lock() {
                        *origin = Some(url.trim().to_string());
                    }
                    let _ = app_handle.emit("desktop-service-ready", url.trim());
                }
            }
        }
    });

    Ok(())
}

fn stop_desktop_service(service: &DesktopService) {
    if let Ok(mut child_slot) = service.child.lock() {
        if let Some(child) = child_slot.take() {
            let _ = child.kill();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(DesktopService {
            child: Mutex::new(None),
            origin: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            pick_workspace_directory,
            remember_workspace_directory,
            desktop_service_status,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let service_state = app.state::<DesktopService>();
            spawn_desktop_service(&handle, service_state.inner())?;

            let service_state = app.state::<DesktopService>();
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                for _ in 0..120 {
                    let origin = service_state
                        .origin
                        .lock()
                        .ok()
                        .and_then(|v| v.clone());
                    if let Some(origin) = origin {
                        if let Ok(parsed) = Url::parse(&origin) {
                            let _ = WebviewWindowBuilder::new(
                                &app_handle,
                                "main",
                                WebviewUrl::External(parsed),
                            )
                            .title("TALOS · 作业终端")
                            .inner_size(1440.0, 900.0)
                            .build();
                        }
                        break;
                    }
                    tauri::async_runtime::sleep(std::time::Duration::from_millis(250)).await;
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if matches!(event, RunEvent::Exit) {
                let service = app.state::<DesktopService>();
                stop_desktop_service(service.inner());
            }
        });
}
