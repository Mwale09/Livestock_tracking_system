@echo off
echo Starting Livestock Tracking System...
echo.

echo Starting Backend Server (Django)...
start "Backend Server" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\activate && python manage.py runserver"

echo.
echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend Server (React)...
start "Frontend Server" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo Both servers are starting!
echo.
echo Once both are running, you can access:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:8000/api/
echo - Admin Panel: http://localhost:8000/admin
echo.
echo Press any key to close this window...
pause > nul

