@echo off
setlocal
call "C:\Program Files\Microsoft Visual Studio\18\Community\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
if errorlevel 1 (
  echo [build-tauri] VsDevCmd failed
  exit /b 1
)
if /i "%~1"=="tauri" (
  cd /d "%~dp0..\apps\desktop"
  echo [build-tauri] npx tauri build --bundles nsis
  npx tauri build --bundles nsis
  exit /b %errorlevel%
)
cd /d "%~dp0..\apps\desktop\src-tauri"
echo [build-tauri] cargo %*
cargo %*
exit /b %errorlevel%
