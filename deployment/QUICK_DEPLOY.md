# ⚡ Quick Deployment Guide - 4D BIM Web Application

## 🚀 1-Minute Deployment

### Prerequisites (One-time setup):
1. **Install Docker Desktop**: https://www.docker.com/products/docker-desktop/
2. **Start Docker Desktop** and wait for it to be ready

### Deploy in 3 Steps:

#### Step 1: Open Terminal/PowerShell
```bash
cd C:\Users\Bimboss\Documents\4d_bim_web_application-v28\deployment
```

#### Step 2: Run Deployment Script

**Windows (PowerShell):**
```powershell
.\deploy.ps1
```

**Windows (Command Prompt):**
```cmd
deploy.bat
```

**Linux/macOS:**
```bash
./deploy.sh
```

#### Step 3: Access Application
- Open browser: http://localhost:3000
- Login: admin@company.com / admin123

## 🎯 That's It!

Your complete 4D BIM application is now running with:
- ✅ Web Application (Next.js)
- ✅ Database (PostgreSQL)
- ✅ 3D BIM Viewer (Speckle + Autodesk)
- ✅ AI Task Generator
- ✅ Gantt Charts
- ✅ Team Management
- ✅ File Upload System
- ✅ Email Notifications
- ✅ Backup System

## 🔧 Quick Commands

```bash
# View logs
docker-compose logs -f app

# Stop application
docker-compose down

# Restart application
docker-compose restart app

# Database backup
docker-compose exec app npm run backup

# Database studio (GUI)
docker-compose exec app npx prisma studio
```

## 🆘 Troubleshooting

**Port 3000 already in use?**
```bash
# Stop any existing services
docker-compose down
# Or change port in docker-compose.yml
```

**Docker not running?**
- Start Docker Desktop
- Wait for green status indicator

**Need help?**
- Check logs: `docker-compose logs app`
- Contact: harsh.bagadiya@krishnaos.com

---

**Total deployment time: ~5 minutes** ⏱️