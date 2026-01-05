#!/bin/bash

# 4D BIM Web Application Deployment Script
# This script handles the complete deployment process

set -e

echo "🚀 Starting 4D BIM Web Application Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Navigate to deployment directory
cd "$(dirname "$0")"

print_status "Checking environment configuration..."

# Check if production environment file exists
if [ ! -f ".env.production" ]; then
    print_warning "Production environment file not found. Creating from template..."
    cp .env.production.template .env.production
    print_warning "Please update .env.production with your production values before continuing."
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

print_status "Building Docker images..."
docker-compose build --no-cache

print_status "Starting services..."
docker-compose up -d

print_status "Waiting for services to start..."
sleep 30

print_status "Running database migrations..."
docker-compose exec app npx prisma migrate deploy

print_status "Seeding database..."
docker-compose exec app npm run seed

print_status "Checking service health..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    print_success "Application is running successfully!"
else
    print_error "Application health check failed. Check logs with: docker-compose logs app"
    exit 1
fi

print_success "🎉 4D BIM Web Application deployed successfully!"
print_status "Application is available at: http://localhost:3000"
print_status "To view logs: docker-compose logs -f"
print_status "To stop services: docker-compose down"

echo ""
echo "📋 Default Login Credentials:"
echo "Admin: admin@company.com / admin123"
echo "Manager: manager@company.com / manager123"
echo ""
echo "🔧 Management Commands:"
echo "- View logs: docker-compose logs -f app"
echo "- Restart app: docker-compose restart app"
echo "- Database backup: docker-compose exec app npm run backup"
echo "- Database studio: docker-compose exec app npx prisma studio"