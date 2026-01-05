@echo off
REM 4D BIM Web Application Deployment Script for Windows
REM This script handles the complete deployment process

echo 🚀 Starting 4D BIM Web Application Deployment...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

REM Navigate to deployment directory
cd /d "%~dp0"

echo [INFO] Checking environment configuration...

REM Check if production environment file exists
if not exist ".env.production" (
    echo [WARNING] Production environment file not found. Creating from template...
    copy ".env.production" ".env.production.backup" >nul 2>&1
    echo [WARNING] Please update .env.production with your production values before continuing.
    pause
    exit /b 1
)

echo [INFO] Building Docker images...
docker-compose build --no-cache

echo [INFO] Starting services...
docker-compose up -d

echo [INFO] Waiting for services to start...
timeout /t 30 /nobreak >nul

echo [INFO] Running database migrations...
docker-compose exec app npx prisma migrate deploy

echo [INFO] Seeding database...
docker-compose exec app npm run seed

echo [INFO] Checking service health...
curl -f http://localhost:3000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Application is running successfully!
) else (
    echo [ERROR] Application health check failed. Check logs with: docker-compose logs app
    pause
    exit /b 1
)

echo.
echo 🎉 4D BIM Web Application deployed successfully!
echo [INFO] Application is available at: http://localhost:3000
echo [INFO] To view logs: docker-compose logs -f
echo [INFO] To stop services: docker-compose down
echo.
echo 📋 Default Login Credentials:
echo Admin: admin@company.com / admin123
echo Manager: manager@company.com / manager123
echo.
echo 🔧 Management Commands:
echo - View logs: docker-compose logs -f app
echo - Restart app: docker-compose restart app
echo - Database backup: docker-compose exec app npm run backup
echo - Database studio: docker-compose exec app npx prisma studio

pause