<#
Start-All.ps1
PowerShell script to start backend, frontend (Vite) and Python ML service
Opens each service in its own CMD window so logs remain visible.

Usage: Right-click -> "Run with PowerShell" or from PowerShell:
  .\start-all.ps1
#>

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "Starting Backend..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/k`,cd /d `"$root\Backend`" && node app.js" -WindowStyle Normal -NoNewWindow:$false

Write-Host "Starting Frontend (Vite)..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/k`,cd /d `"$root\frontend\vite-project`" && npm run dev" -WindowStyle Normal -NoNewWindow:$false

Write-Host "Starting Python ML service..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/k`,cd /d `"$root\PythonService`" && .\venv\Scripts\python.exe app.py" -WindowStyle Normal -NoNewWindow:$false

Write-Host "All start commands issued. Close the opened windows to stop services."
