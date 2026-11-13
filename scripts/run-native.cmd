@echo off
setlocal
for %%I in ("%~dp0..\.pi\native-build") do set "NATIVE_ROOT=%%~fI\"
set "CARGO_HOME=%NATIVE_ROOT%cargo"
set "RUSTUP_HOME=%NATIVE_ROOT%rustup"
set "CARGO_TARGET_DIR=%NATIVE_ROOT%target"
set "WASM_PACK_CACHE=%NATIVE_ROOT%wasm-pack-cache"
set "RUSTUP_TOOLCHAIN=1.100.0-x86_64-pc-windows-msvc"
if not exist "%CARGO_HOME%\bin\cargo.exe" (
  echo Local Rust toolchain is missing. See NATIVE_PHYSICS.md.
  exit /b 1
)
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
set "VSROOT="
if exist "%VSWHERE%" for /f "usebackq tokens=*" %%I in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set "VSROOT=%%I"
if not defined VSROOT (
  echo Visual Studio C++ Build Tools are missing. No automatic system installation.
  exit /b 1
)
call "%VSROOT%\VC\Auxiliary\Build\vcvars64.bat" >nul
if errorlevel 1 exit /b 1
set "PATH=%CARGO_HOME%\bin;%NATIVE_ROOT%tools\bin;%PATH%"
if "%~1"=="" (
  echo Usage: scripts\run-native.cmd ^<command^> [arguments]
  exit /b 2
)
%*
exit /b %errorlevel%
