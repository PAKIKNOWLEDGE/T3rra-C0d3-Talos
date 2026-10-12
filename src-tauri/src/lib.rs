use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, RunEvent, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

mod process_job;

struct DesktopService {
    child: Mutex<Option<CommandChild>>,
    status: Arc<Mutex<DesktopServiceStatus>>,
    job: Mutex<Option<process_job::ProcessJob>>,
}
#[derive(Clone, serde::Serialize, Default)]
struct DesktopServiceStatus {
    origin: Option<String>,
    error: Option<String>,
}
fn config_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("workspace.json"))
}
fn read_saved_workspace(app: &AppHandle) -> Option<String> {
    let raw = fs::read_to_string(config_file(app).ok()?).ok()?;
    let parsed: serde_json::Value = serde_json::from_str(&raw).ok()?;
    parsed
        .get("cwd")?
        .as_str()
        .filter(|s| !s.is_empty())
        .map(str::to_owned)
}
#[tauri::command]
async fn pick_workspace_directory(app: AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("选择工作区")
            .blocking_pick_folder()
            .map(|p| p.to_string())
    })
    .await
    .map_err(|e| e.to_string())
}
#[tauri::command]
fn remember_workspace_directory(app: AppHandle, cwd: String) -> Result<(), String> {
    if !std::path::Path::new(&cwd).is_absolute() || !std::path::Path::new(&cwd).is_dir() {
        return Err("工作区目录无效".into());
    }
    fs::write(
        config_file(&app)?,
        serde_json::json!({"cwd":cwd}).to_string(),
    )
    .map_err(|e| e.to_string())
}
#[tauri::command]
fn desktop_service_status(state: State<'_, DesktopService>) -> DesktopServiceStatus {
    state.status.lock().map(|s| s.clone()).unwrap_or_default()
}
fn spawn_desktop_service(app: &AppHandle, service: &DesktopService) -> Result<(), String> {
    let raw_resources = app.path().resource_dir().map_err(|e| e.to_string())?;
    // Node's CLI entry resolver does not accept Windows verbatim path prefixes.
    let text = raw_resources.to_string_lossy();
    let resources = PathBuf::from(text.strip_prefix(r"\\?\").unwrap_or(&text));
    let script = resources.join("desktop/talos-desktop-service.mjs");
    let static_dir = resources.join("desktop/static");
    if !script.is_file() || !static_dir.is_dir() {
        return Err("桌面服务资源缺失，请重新安装 TALOS。".into());
    }
    let mut command = app
        .shell()
        .sidecar("node")
        .map_err(|e| e.to_string())?
        .args([
            script.to_string_lossy().into_owned(),
            "--static-dir".into(),
            static_dir.to_string_lossy().into_owned(),
            "--port".into(),
            "0".into(),
        ]);
    if let Some(cwd) = read_saved_workspace(app) {
        command = command.args(["--cwd", &cwd]);
    }
    let (mut rx, child) = command.spawn().map_err(|e| e.to_string())?;
    match process_job::ProcessJob::attach(child.pid()) {
        Ok(job) => *service.job.lock().map_err(|e| e.to_string())? = Some(job),
        Err(error) => {
            let _ = child.kill();
            return Err(error);
        }
    }
    *service.child.lock().map_err(|e| e.to_string())? = Some(child);
    let status = service.status.clone();
    let diagnostics = config_file(app)?.with_file_name("startup-error.txt");
    let _ = fs::write(&diagnostics, "");
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let text = String::from_utf8_lossy(&line);
                    if let Some(origin) = text.trim().strip_prefix("TALOS_DESKTOP_READY ") {
                        if let Ok(mut s) = status.lock() {
                            s.origin = Some(origin.into());
                            s.error = None;
                        }
                    }
                }
                CommandEvent::Stderr(line) => {
                    if let Ok(mut file) = fs::OpenOptions::new().append(true).open(&diagnostics) {
                        let _ = file.write_all(&line);
                        let _ = file.write_all(b"\n");
                    }
                }
                CommandEvent::Terminated(_) => {
                    if let Ok(mut s) = status.lock() {
                        s.origin = None;
                        s.error = Some("桌面服务已退出，请重新启动 TALOS。".into());
                    }
                }
                _ => {}
            }
        }
    });
    Ok(())
}
fn stop_desktop_service(service: &DesktopService) {
    if let Ok(mut slot) = service.child.lock() {
        if let Some(mut child) = slot.take() {
            let _ = child.write(b"shutdown\n");
            std::thread::sleep(std::time::Duration::from_millis(700));
            let _ = child.kill();
        }
    }
    if let Ok(mut slot) = service.job.lock() {
        slot.take();
    }
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(DesktopService {
            child: Mutex::new(None),
            job: Mutex::new(None),
            status: Arc::new(Mutex::new(DesktopServiceStatus::default())),
        })
        .invoke_handler(tauri::generate_handler![
            pick_workspace_directory,
            remember_workspace_directory,
            desktop_service_status
        ])
        .setup(|app| {
            let state = app.state::<DesktopService>();
            if let Err(error) = spawn_desktop_service(app.handle(), state.inner()) {
                if let Ok(path) = config_file(app.handle()) {
                    let _ = fs::write(path.with_file_name("startup-error.txt"), &error);
                }
                state.status.lock().unwrap().error = Some(error);
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("TALOS host initialization failed")
        .run(|app, event| {
            if matches!(event, RunEvent::Exit) {
                stop_desktop_service(app.state::<DesktopService>().inner());
            }
        });
}
