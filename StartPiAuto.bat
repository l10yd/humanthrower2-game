@echo off
setlocal DisableDelayedExpansion
set "PI_LAUNCH_DIR=%~dp0"
set "PI_AUTO_CONTINUE_SECONDS=30"
if not "%~1"=="" set "PI_AUTO_CONTINUE_SECONDS=%~1"
start "" powershell.exe -NoLogo -NoProfile -NoExit -Command "$seconds = 0; if (-not [int]::TryParse($env:PI_AUTO_CONTINUE_SECONDS, [ref]$seconds) -or $seconds -lt 5 -or $seconds -gt 86400) { Write-Host 'Interval must be an integer from 5 to 86400 seconds.' -ForegroundColor Red; return }; $Host.UI.RawUI.BackgroundColor = 'DarkBlue'; $Host.UI.RawUI.ForegroundColor = 'Gray'; Clear-Host; Set-Location -LiteralPath $env:PI_LAUNCH_DIR -ErrorAction Stop; & pi.cmd --model gpt-6.1-sol --thinking high --extension (Join-Path $env:PI_LAUNCH_DIR '.pi\extensions\auto-continue.ts') --auto-continue --auto-continue-seconds $seconds"
endlocal
