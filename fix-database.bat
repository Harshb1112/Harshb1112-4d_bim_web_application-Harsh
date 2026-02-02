@echo off
echo ========================================
echo Database Connection Fix Script
echo ========================================
echo.

echo Option 1: Test Supabase Connection
echo Option 2: Switch to Local PostgreSQL
echo Option 3: Exit
echo.

set /p choice="Enter your choice (1/2/3): "

if "%choice%"=="1" (
    echo.
    echo Testing Supabase connection...
    node test-db-connection.js
    pause
) else if "%choice%"=="2" (
    echo.
    echo Switching to local PostgreSQL...
    echo.
    echo Make sure PostgreSQL is installed and running!
    echo Default credentials: postgres/postgres
    echo.
    
    REM Update .env.local to use local database
    echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bim_app_dev" > .env.local.new
    echo DIRECT_URL="postgresql://postgres:postgres@localhost:5432/bim_app_dev" >> .env.local.new
    
    REM Copy other variables from existing .env.local
    findstr /V "DATABASE_URL DIRECT_URL" .env.local >> .env.local.new
    
    REM Backup and replace
    copy .env.local .env.local.backup
    move /Y .env.local.new .env.local
    
    echo.
    echo ✅ Updated .env.local to use local database
    echo.
    echo Next steps:
    echo 1. Create database: psql -U postgres -c "CREATE DATABASE bim_app_dev;"
    echo 2. Run migrations: npx prisma migrate deploy
    echo 3. Generate client: npx prisma generate
    echo 4. Seed database: node prisma/seed.js
    echo 5. Restart dev server: npm run dev
    echo.
    pause
) else (
    echo Exiting...
    exit
)
