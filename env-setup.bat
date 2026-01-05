@echo off
echo Setting up Vercel Environment Variables...

echo Adding DATABASE_URL...
echo postgres://7025358418fbfa80b0eff267379ce5d533a39480a109aea953d44cd80dfe6227:sk_y0yLtYx7lfDAqima_Gaag@db.prisma.io:5432/postgres?sslmode=require^&connection_limit=10^&pool_timeout=30^&connect_timeout=30 | vercel env add DATABASE_URL production

echo Adding JWT_SECRET...
echo f10f7ab919fdbbf3039736add6948fb18246a403fa193a0d4300ae9b2ddecd1b | vercel env add JWT_SECRET production

echo Adding AUTH_SECRET...
echo fYgxlg5yBjSWnK0qEXZbjzJU4dJs8U4dfcyegulAR28= | vercel env add AUTH_SECRET production

echo Done! Environment variables added.
pause