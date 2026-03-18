@echo off
echo Creating Python virtual environment...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

REM Create virtual environment
python -m venv venv

REM Activate virtual environment and install dependencies
call venv\Scripts\activate.bat

echo.
echo Virtual environment created and activated!
echo Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ✅ Setup complete!
echo.
echo To activate the virtual environment in the future, run:
echo   venv\Scripts\activate
echo.
echo To start the ML service:
echo   python app.py
echo.
pause
