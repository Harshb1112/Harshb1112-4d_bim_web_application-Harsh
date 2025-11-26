# 📦 Database Backup & Restore Guide

## Quick Commands

```bash
# Create backup
npm run backup

# Restore from backup
npm run restore backups/backup-2025-11-25T08-21-56-973Z.json

# View database
npx prisma studio
```

---

## 1. Create Backup

### Command:
```bash
npm run backup
```

### Output:
```
📦 Starting database backup...
✅ Backup created successfully!
📁 File: backups/backup-2025-11-25T08-21-56-973Z.json
📊 Stats:
   - Users: 5
   - Teams: 2
   - Projects: 3
   - Tasks: 10
```

### What it does:
- ✅ Creates JSON backup file
- ✅ Saves in `backups/` folder
- ✅ Includes all data (users, teams, projects, tasks)
- ✅ Timestamped filename
- ✅ **Does NOT delete anything**

---

## 2. Restore Backup

### Command:
```bash
npm run restore backups/backup-FILENAME.json
```

### Example:
```bash
npm run restore backups/backup-2025-11-25T08-21-56-973Z.json
```

### Output:
```
📦 Starting database restore...
📁 File: backups/backup-2025-11-25T08-21-56-973Z.json
⚠️  WARNING: This will DELETE all existing data!
📊 Backup contains:
   - Users: 5
   - Teams: 2
   - Projects: 3
   - Tasks: 10

🗑️  Clearing existing data...
📥 Restoring data...
   Restoring 5 users...
   Restoring 2 teams...
   Restoring 3 projects...
   Restoring 10 tasks...

✅ Restore completed successfully!
📅 Backup from: 2025-11-25T08:21:56.973Z
```

### What it does:
- ⚠️ **DELETES all current data**
- ✅ Restores data from backup file
- ✅ Recreates all users, teams, projects, tasks

---

## 3. List Backups

### Windows:
```bash
dir backups
```

### Output:
```
backup-2025-11-25T08-21-56-973Z.json
backup-2025-11-24T15-30-00-123Z.json
backup-2025-11-23T10-15-45-456Z.json
```

---

## Backup Strategy

### Daily Backup (Recommended)
```bash
# Run every day before making changes
npm run backup
```

### Before Major Changes
```bash
# Before seed
npm run backup

# Before testing
npm run backup

# Before deployment
npm run backup
```

### Automatic Backup (Optional)
Add to your workflow:
```json
// package.json
"scripts": {
  "dev:safe": "npm run backup && npm run dev",
  "seed:safe": "npm run backup && npm run seed"
}
```

---

## Backup File Structure

```json
{
  "timestamp": "2025-11-25T08:21:56.973Z",
  "users": [...],
  "teams": [...],
  "teamMemberships": [...],
  "projects": [...],
  "tasks": [...],
  "models": [...],
  "elements": [...],
  "dependencies": [...]
}
```

---

## Important Notes

### ✅ Safe Operations:
- `npm run backup` - Always safe
- `npm run seed` - Now safe (doesn't delete)
- `npx prisma studio` - View only

### ⚠️ Destructive Operations:
- `npm run restore` - Deletes all data first
- Manual database operations

### 💡 Best Practices:
1. **Backup before restore**
2. **Keep multiple backups**
3. **Test restore on copy first**
4. **Don't delete old backups**
5. **Backup before deployment**

---

## Troubleshooting

### Backup fails?
```bash
# Check database connection
npx prisma db pull

# Check Prisma client
npx prisma generate
```

### Restore fails?
```bash
# Check backup file exists
dir backups

# Check file is valid JSON
type backups\backup-FILENAME.json
```

### Can't find backup?
```bash
# List all backups
dir backups

# Check current directory
cd
```

---

## Recovery Scenarios

### Scenario 1: Accidentally deleted data
```bash
# Find latest backup
dir backups

# Restore it
npm run restore backups/backup-LATEST.json
```

### Scenario 2: Testing went wrong
```bash
# Restore from before testing
npm run restore backups/backup-BEFORE-TEST.json
```

### Scenario 3: Need to reset
```bash
# Create backup first
npm run backup

# Then restore old backup
npm run restore backups/backup-OLD.json
```

---

## Backup Location

```
project-root/
├── backups/
│   ├── backup-2025-11-25T08-21-56-973Z.json
│   ├── backup-2025-11-24T15-30-00-123Z.json
│   └── backup-2025-11-23T10-15-45-456Z.json
├── scripts/
│   ├── backup-db.js
│   └── restore-db.js
└── prisma/
    └── schema.prisma
```

---

## Git & Backups

### .gitignore (Already added)
```
backups/
*.backup
```

### Keep backups safe:
- ✅ Store in cloud (Google Drive, Dropbox)
- ✅ Keep local copies
- ✅ Don't commit to git (sensitive data)

---

## Quick Reference

| Command | Safe? | What it does |
|---------|-------|--------------|
| `npm run backup` | ✅ YES | Creates backup |
| `npm run restore` | ⚠️ NO | Deletes & restores |
| `npm run seed` | ✅ YES | Adds default users |
| `npx prisma studio` | ✅ YES | View database |

---

**Last Updated:** November 25, 2025
**Status:** ✅ Production Ready
