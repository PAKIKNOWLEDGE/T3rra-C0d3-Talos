@echo off
setlocal
set "PATH=C:\Program Files\nodejs;%PATH%"
set "NODE_OPTIONS="
set "NODE_PATH="
echo [LOCAL ACCEPTANCE] @pakiknowledge/tal0s-code 0.5.7 - NOT PUBLISHED
echo Uses your existing .talos profile. Credentials are not copied.
set "MINIMAX_DATA_DIR=%USERPROFILE%\.talos"
set "MAVIS_DATA_DIR=%MINIMAX_DATA_DIR%"
cd /d "%~dp0workspace"
call "%~dp0prefix\talos.cmd" %*
set "TALOS_EXIT=%ERRORLEVEL%"
if not "%TALOS_EXIT%"=="0" pause
exit /b %TALOS_EXIT%
