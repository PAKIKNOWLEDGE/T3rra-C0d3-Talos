@echo off
setlocal
set "PATH=C:\Program Files\nodejs;%PATH%"
set "NODE_OPTIONS="
set "NODE_PATH="
echo [OFFLINE PREVIEW] Version 0.5.8 is FAKE. No model requests.
set "HOME=%~dp0preview-home"
set "USERPROFILE=%~dp0preview-home"
set "MINIMAX_DATA_DIR=%~dp0preview-data"
set "MAVIS_DATA_DIR=%MINIMAX_DATA_DIR%"
set "HTTP_PROXY="
set "HTTPS_PROXY="
set "ALL_PROXY="
set "NO_PROXY="
set "NODE_OPTIONS=--import=file:///C:/DEV/develop/T3rra-C0d3-Talos/.talos/acceptance/pakiknowledge-4e9f1ba/preview-registry.mjs"
cd /d "%~dp0preview-workspace"
call "%~dp0prefix\talos.cmd" %*
set "TALOS_EXIT=%ERRORLEVEL%"
if not "%TALOS_EXIT%"=="0" pause
exit /b %TALOS_EXIT%
