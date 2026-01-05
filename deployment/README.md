# 🚀 4D BIM Web Application - Deployment Guide

Complete deployment setup for the 4D BIM Web Application with all backend connections and configurations.

## 📋 Prerequisites

### Required Software:
- **Docker Desktop** - Container platform
- **Docker Compose** - Multi-container orchestration
- **Git** - Version control (for updates)

### System Requirements:
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB free space
- **CPU**: 2 cores minimum, 4 cores recommended
- **OS**: Windows 10/11, macOS, or Linux

## 🛠️ Deployment Options

### Option 1: Docker Deployment (Recommended)
Complete containerized deployment with all services.

### Option 2: Cloud Deployment
Deploy to cloud platforms like Vercel, AWS, or DigitalOcean.

### Option 3: VPS Deployment
Deploy to your own Virtual Private Server.

---

## 🐳 Docker Deployment

### Step 1: Prepare Environment

1. **Copy production environment file:**
```bash
cp .env.production .env.production.local
```

2. **Update environment variables in `.env.production.local`:**
```env
# Update these with your production values
DATABASE_URL="your-production-database-url"
JWT_SECRET="your-secure-jwt-secret"
NEXTAUTH_URL="https://your-domain.com"
EMAIL_HOST="your-email-smtp-host"
EMAIL_USER="your-email@domain.com"
EMAIL_PASSWORD="your-email-password"
OPENAI_API_KEY="your-openai-api-key"
```

### Step 2: Deploy Application

**Windows:**
```cmd
cd deployment
deploy.bat
```

**Linux/macOS:**
```bash
cd deployment
chmod +x deploy.sh
./deploy.sh
```

### Step 3: Access Application

- **Application**: http://localhost:3000
- **Database Studio**: Run `docker-compose exec app npx prisma studio`

---

## ☁️ Cloud Deployment

### Vercel Deployment

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
vercel --prod
```

3. **Configure Environment Variables:**
Add all environment variables in Vercel dashboard.

### AWS/DigitalOcean Deployment

1. **Create server instance**
2. **Install Docker and Docker Compose**
3. **Clone repository**
4. **Run deployment script**

---

## 🔧 Configuration Details

### Database Configuration

**Option 1: Use Existing Prisma Cloud Database**
```env
DATABASE_URL="postgres://7025358418fbfa80b0eff267379ce5d533a39480a109aea953d44cd80dfe6227:sk_y0yLtYx7lfDAqima_Gaag@db.prisma.io:5432/postgres?sslmode=require&connection_limit=10&pool_timeout=30&connect_timeout=30"
```

**Option 2: Use Local PostgreSQL**
```env
DATABASE_URL="postgresql://bim_user:password@postgres:5432/bim_database"
```

**Option 3: Use Cloud Database (AWS RDS, etc.)**
```env
DATABASE_URL="postgresql://username:password@your-db-host:5432/database"
```

### Email Configuration

**Zoho Mail:**
```env
EMAIL_HOST="smtp.zoho.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@domain.com"
EMAIL_PASSWORD="your-app-password"
```

**Gmail:**
```env
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
```

### BIM Integration Configuration

**Speckle:**
```env
NEXT_PUBLIC_SPECKLE_TOKEN="your-speckle-token"
NEXT_PUBLIC_SPECKLE_SERVER_URL="https://app.speckle.systems"
```

**Autodesk Forge/APS:**
```env
AUTODESK_CLIENT_ID="your-client-id"
AUTODESK_CLIENT_SECRET="your-client-secret"
```

---

## 🔐 Security Configuration

### SSL/HTTPS Setup

1. **Obtain SSL Certificate:**
   - Let's Encrypt (free)
   - CloudFlare (free)
   - Commercial certificate

2. **Update nginx.conf:**
```nginx
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
```

### Firewall Configuration

**Allow required ports:**
- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 22 (SSH)

---

## 📊 Monitoring & Maintenance

### Health Checks

**Application Health:**
```bash
curl http://localhost:3000/api/health
```

**Database Health:**
```bash
docker-compose exec postgres pg_isready
```

### Backup & Restore

**Create Backup:**
```bash
docker-compose exec app npm run backup
```

**Restore Backup:**
```bash
docker-compose exec app npm run restore backups/backup-filename.json
```

### Log Management

**View Application Logs:**
```bash
docker-compose logs -f app
```

**View Database Logs:**
```bash
docker-compose logs -f postgres
```

---

## 🚀 Production Optimizations

### Performance Tuning

1. **Enable Redis Caching:**
```yaml
# Uncomment Redis service in docker-compose.yml
redis:
  image: redis:7-alpine
```

2. **Database Connection Pooling:**
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30"
```

3. **CDN Configuration:**
- Use CloudFlare or AWS CloudFront
- Cache static assets
- Optimize images

### Scaling Options

**Horizontal Scaling:**
- Load balancer (nginx)
- Multiple app instances
- Database read replicas

**Vertical Scaling:**
- Increase server resources
- Optimize database queries
- Enable caching

---

## 🔧 Management Commands

### Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart application
docker-compose restart app

# View logs
docker-compose logs -f app

# Execute commands in container
docker-compose exec app npm run seed

# Update application
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

### Database Commands

```bash
# Run migrations
docker-compose exec app npx prisma migrate deploy

# Open Prisma Studio
docker-compose exec app npx prisma studio

# Reset database (careful!)
docker-compose exec app npx prisma migrate reset
```

---

## 🆘 Troubleshooting

### Common Issues

**1. Port Already in Use:**
```bash
# Check what's using port 3000
netstat -tulpn | grep :3000

# Kill process
sudo kill -9 <process-id>
```

**2. Database Connection Failed:**
- Check DATABASE_URL format
- Verify database is running
- Check network connectivity

**3. File Upload Issues:**
- Check UPLOAD_DIR permissions
- Verify disk space
- Check file size limits

**4. SSL Certificate Issues:**
- Verify certificate files exist
- Check certificate validity
- Update nginx configuration

### Getting Help

**Check Logs:**
```bash
docker-compose logs app
```

**Database Issues:**
```bash
docker-compose logs postgres
```

**Network Issues:**
```bash
docker network ls
docker network inspect deployment_bim-network
```

---

## 📞 Support

For deployment issues:
- Check logs first
- Review environment variables
- Verify all services are running
- Contact: harsh.bagadiya@krishnaos.com

---

## 🎯 Default Credentials

After successful deployment:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | admin123 |
| Manager | manager@company.com | manager123 |

**⚠️ Change default passwords immediately after first login!**

---

**Deployment Status**: ✅ Production Ready
**Last Updated**: January 2025
**Version**: 1.1.0