# 4D BIM Web Application Deployment Script for PowerShell
# This script handles the complete deployment process

param(
    [switch]$Production,
    [switch]$Development,
    [string]$Environment = "production"
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting 4D BIM Web Application Deployment..." -ForegroundColor Blue

# Function to write colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Status "Docker is installed"
} catch {
    Write-Error "Docker is not installed. Please install Docker Desktop first."
    exit 1
}

# Check if Docker Compose is installed
try {
    docker-compose --version | Out-Null
    Write-Status "Docker Compose is installed"
} catch {
    Write-Error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
}

# Navigate to deployment directory
Set-Location $PSScriptRoot

Write-Status "Checking environment configuration..."

# Check if production environment file exists
if (-not (Test-Path ".env.production")) {
    Write-Warning "Production environment file not found. Creating from template..."
    if (Test-Path ".env.production") {
        Copy-Item ".env.production" ".env.production.backup"
    }
    Write-Warning "Please update .env.production with your production values before continuing."
    Read-Host "Press Enter to continue after updating .env.production"
}

Write-Status "Building Docker images..."
docker-compose build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed"
    exit 1
}

Write-Status "Starting services..."
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start services"
    exit 1
}

Write-Status "Waiting for services to start..."
Start-Sleep -Seconds 30

Write-Status "Running database migrations..."
docker-compose exec app npx prisma migrate deploy

Write-Status "Seeding database..."
docker-compose exec app npm run seed

Write-Status "Checking service health..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Success "Application is running successfully!"
    } else {
        Write-Error "Application health check failed. Status code: $($response.StatusCode)"
        Write-Host "Check logs with: docker-compose logs app"
        exit 1
    }
} catch {
    Write-Error "Application health check failed. Error: $($_.Exception.Message)"
    Write-Host "Check logs with: docker-compose logs app"
    exit 1
}

Write-Success "🎉 4D BIM Web Application deployed successfully!"
Write-Host ""
Write-Status "Application is available at: http://localhost:3000"
Write-Status "To view logs: docker-compose logs -f"
Write-Status "To stop services: docker-compose down"
Write-Host ""
Write-Host "📋 Default Login Credentials:" -ForegroundColor Yellow
Write-Host "Admin: admin@company.com / admin123"
Write-Host "Manager: manager@company.com / manager123"
Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Yellow
Write-Host "- View logs: docker-compose logs -f app"
Write-Host "- Restart app: docker-compose restart app"
Write-Host "- Database backup: docker-compose exec app npm run backup"
Write-Host "- Database studio: docker-compose exec app npx prisma studio"

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")