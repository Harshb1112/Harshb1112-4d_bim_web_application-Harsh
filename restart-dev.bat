@echo off
echo Stopping any running Node processes...
taskkill /F /IM node.exe 2>nul

echo.
echo Cleaning Prisma client...
rmdir /S /Q node_modules\.prisma 2>nul

echo.
echo Regenerating Prisma client...
call npx prisma generate

echo.
echo Starting development server...
call npm run dev
