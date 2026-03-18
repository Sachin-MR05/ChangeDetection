@echo off
rem Start all services in separate command windows (Windows)

set ROOT_DIR=%~dp0

echo Starting Backend...
start "Backend" cmd /k "cd /d %ROOT_DIR%Backend && node app.js"

echo Starting Frontend (Vite)...
start "Frontend" cmd /k "cd /d %ROOT_DIR%frontend\vite-project && npm run dev"

echo Starting Python ML service...
start "PythonService" cmd /k "cd /d %ROOT_DIR%PythonService && .\venv\Scripts\python.exe app.py"

echo All start commands issued. Close the windows to stop each service.
exit /b 0
