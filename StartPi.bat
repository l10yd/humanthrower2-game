@echo off
setlocal DisableDelayedExpansion
set "PI_LAUNCH_DIR=%~dp0"
start "" powershell.exe -NoLogo -NoProfile -NoExit -Command "$Host.UI.RawUI.BackgroundColor = 'DarkBlue'; $Host.UI.RawUI.ForegroundColor = 'Gray'; Clear-Host; Set-Location -LiteralPath $env:PI_LAUNCH_DIR -ErrorAction Stop; & pi.cmd --model gpt-6.1-sol --thinking high"
endlocal
