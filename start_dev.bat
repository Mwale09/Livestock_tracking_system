@echo off
echo Starting Livestock Tracking System Development Environment...

echo.
echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && python manage.py runserver"

echo.
echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm start"

echo.
echo Development servers started!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo Admin Panel: http://localhost:8000/admin

pause






