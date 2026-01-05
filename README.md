# 🏗️ 4D BIM Web Application

> **Complete Production-Ready 4D Building Information Modeling Platform**

## 🚀 **LIVE DEPLOYMENT**
**🌐 Application URL:** https://4d-bim-web-app-new.vercel.app

**🔑 Demo Credentials:**
- **Admin**: admin@company.com / admin123
- **Manager**: manager@company.com / manager123

**📊 Deployment Status:**
- ✅ **Production**: Live on Vercel
- ✅ **Database**: PostgreSQL Cloud
- ✅ **Status**: Fully Operational

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Cloud-336791)](https://www.postgresql.org/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000)](https://4d-bim-web-app-new.vercel.app)
[![Deployment](https://img.shields.io/badge/Deployment-Active-success)](https://4d-bim-web-app-new.vercel.app)

---

## 🎯 Overview

A comprehensive 4D BIM web application that combines **3D Building Information Models** with **project scheduling** to create a powerful construction management platform.

### Key Capabilities

- ✅ **Multi-Source BIM Integration** - Speckle, Local IFC, Autodesk ACC/Drive
- ✅ **Advanced Gantt Chart** - Project timeline visualization with filters
- ✅ **Team Management** - Role-based access control
- ✅ **Task Scheduling** - Dependencies, progress tracking
- ✅ **Real-time Analytics** - Project insights and statistics
- ✅ **Secure Authentication** - JWT-based with role permissions
- ✅ **Database Backup/Restore** - Safe data management

---

## ✨ Features

### 🔐 Authentication & Authorization

- **JWT-based authentication** with secure token management
- **4 User Roles**: Admin, Manager, Team Leader, Member
- **Role-based access control** (RBAC)
- **Team-based data isolation**
- **Secure password hashing** (bcrypt)

### 👥 Team Management

- Create and manage multiple teams
- Assign team leaders and members
- Team-based project access
- Role hierarchy enforcement

### 📁 Project Management

- **Multiple BIM Sources**:
  - 🌐 Speckle integration
  - 📁 Local IFC file upload (max 100MB)
  - 🏗️ Autodesk Construction Cloud
  - 💾 Autodesk Drive
- Project creation with team assignment
- Start/End date tracking
- Progress monitoring
- Team leader assignment

### 📊 Advanced Gantt Chart

- **5 View Modes**: Week, Month, 1 Year, 2 Years, 3 Years
- **Project Selector**: View all projects or specific project
- **Smart Filters**:
  - Team filter
  - User filter
  - Role filter
- **Visual Features**:
  - Color-coded task status
  - Progress bars
  - Hover tooltips
  - Task statistics
- **Role-Based Views**:
  - Admin: All tasks
  - Manager: Their teams' tasks
  - Team Leader: Their team's tasks
  - Member: Only their tasks

### ✅ Task Management

- Create tasks with hierarchy
- Parent-child relationships
- Task dependencies (FS, SS, FF, SF)
- Progress tracking (0-100%)
- Status management (To Do, In Progress, Done)
- Priority levels
- Assignee management
- Link tasks to BIM elements

### 💰 Resource Management

- **Resource Library** - Labor, Equipment, Materials, Subcontractors
- **Multi-Currency Support** - INR, USD, AED, GBP, EUR with real exchange rates
- **AI Resource Creation** - Natural language input ("Add 5 masons at ₹800/day")
- **Excel Import** - Bulk import resources from spreadsheet
- **Cost Tracking** - Automatic cost calculation on task assignment
- **Utilization Dashboard** - Resource allocation visualization
- **Resource Calendar** - View assignments by date

### 📅 Schedule Management

- **Gantt Chart** - Professional timeline with zoom controls
- **Task List View** - Tabular task management
- **Critical Path Analysis** - Identify project bottlenecks
- **Baselines** - Save and compare schedule versions
- **Import Schedules** - MS Project XML, Primavera P6 XML/XER support

### 📈 Dashboard & Analytics

- Project statistics
- Task completion rates
- Team performance metrics
- Recent activity feed
- Progress charts
- Resource allocation

### 💾 Database Management

- **Safe Seed System**: No data deletion
- **Backup System**: JSON-based backups
- **Restore System**: Point-in-time recovery
- **Prisma Studio**: Visual database browser

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with SSR
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - Beautiful UI components
- **Lucide Icons** - Modern icon library
- **date-fns** - Date manipulation

### Backend
- **Next.js API Routes** - Serverless functions
- **Prisma ORM** - Type-safe database client
- **PostgreSQL** - Relational database
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

### 3D/BIM Integration
- **Speckle Viewer** - 3D model visualization
- **web-ifc** - IFC file parsing
- **Autodesk Forge/APS** - ACC/Drive integration

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Static typing
- **Prisma Studio** - Database GUI

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (or use Prisma Cloud)
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Harshb1112/4d_bim_web_application-harsh.git
cd 4d_bim_web_application-harsh
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env with your values
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

4. **Set up database**
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (safe - no deletion)
npm run seed
```

5. **Start development server**
```bash
npm run dev
```

6. **Open browser**
```
http://localhost:3000
```

### Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | admin123 |
| Manager | manager@company.com | manager123 |

---

## 🎉 Status

✅ **PRODUCTION READY & DEPLOYED**

- All features implemented
- Database optimized
- Security hardened
- Documentation complete
- Backup system ready
- Successfully deployed on Vercel
- No known bugs

---

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Email: harsh.bagadiya@krishnaos.com

---

**Last Updated**: January 2025
**Version**: 1.1.0
**Deployment**: https://4d-bim-web-app-new.vercel.app