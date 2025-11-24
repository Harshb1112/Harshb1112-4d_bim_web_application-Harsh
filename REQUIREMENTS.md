# 4D BIM Application - Complete Requirements

## 1. User Roles & Permissions

### Admin
- **Can Add:**
  - New Admin (with same full permissions)
  - Manager
  - Team Leader
  - Member
- **Permissions:**
  - Full access to all teams
  - Full access to all projects
  - View complete Gantt Chart (all teams)
  - Manage all permissions
  - Delete projects
- **Note:** When Admin adds another Admin, the new Admin gets EXACTLY the same permissions

### Manager
- **Can Add:**
  - Team Leader
  - Member
- **Cannot Add:**
  - Admin
  - Another Manager
- **Permissions:**
  - View only assigned teams
  - View only assigned projects
  - View Gantt Chart (team-restricted)
  - Manage Team Leaders and Members
  - Cannot modify Admin permissions

### Team Leader
- **Can Add:**
  - Member only
- **Cannot Add:**
  - Admin
  - Manager
  - Another Team Leader
- **Permissions:**
  - View only their team
  - View only their team projects
  - View Gantt Chart (their team only)
  - Assign Members to their team
  - Edit team tasks

### Member
- **Can Add:**
  - Nothing
- **Permissions:**
  - View only their assigned tasks
  - Update their task entries
  - View their timeline on Gantt Chart
  - Cannot add any users

---

## 2. Authentication & Registration

### Demo Accounts (Pre-created by you)
- **Admin** - Demo email provided by you
- **Manager** - Demo email provided by you

### Real Registration (Email Verification Required)
- **Team Leader** - Must register with real email
- **Member** - Must register with real email

### Registration Flow:
1. User signs up with real email
2. System sends verification email
3. User clicks verification link
4. Email verified ✓
5. User can now login
6. Access dashboard

### Login Flow:
1. User enters email/password
2. System checks if email is verified
3. If NOT verified → Show error: "Please verify your email first"
4. If verified → Login successful → Redirect to dashboard

---

## 3. Invite System

### When Admin Invites a User:
1. Admin selects:
   - Role (Admin / Manager / Team Leader / Member)
   - Team (dropdown)
   - Permissions template (optional)
2. User receives invitation email
3. User clicks invite link
4. User completes registration
5. Email verification sent
6. After verification → Role activated

### When Manager Invites a User:
1. Manager selects:
   - Role (Team Leader / Member only)
   - Team (from their assigned teams)
2. Same flow as Admin invite

### When Team Leader Invites a Member:
1. Team Leader selects:
   - Role (Member only)
   - Team (automatically their team)
2. Same flow as above

---

## 4. Team Structure & Filtering

### Team Hierarchy:
```
Admin
  └── Manager
       └── Team Leader
            └── Member
```

### Team Selection Logic:

**When adding Team Leader:**
- Admin → Select any team
- Manager → Select from their assigned teams
- After adding → Team Leader sees only their team data (filtered automatically)

**When adding Member:**
- Admin → Select any team + Select Team Leader (optional)
- Manager → Select from their assigned teams + Select Team Leader
- Team Leader → Automatically assigned to their team
- After adding → Member sees only their tasks (filtered automatically)

---

## 5. Gantt Chart Dashboard

### Features Required:
- **Professional animated Gantt Chart**
- **Smooth animations**
- **Rotation/scrolling**
- **Time Views:**
  - Week view
  - Month view
  - Year view (1 year, 2 years, 3 years, etc.)

### Filters:
- Team filter
- User filter
- Role filter
- Date range filter

### Real Working Features:
- Tasks with dependencies
- Progress bars
- Start & End dates
- Drag and drop
- Real-time updates
- Color coding by status

### Visibility by Role:

**Admin:**
- Full Gantt Chart view
- All teams
- All projects
- All tasks

**Manager:**
- Gantt Chart (team-restricted)
- Only their assigned teams
- Only their team projects
- Only their team tasks

**Team Leader:**
- Gantt Chart (their team only)
- Only their team
- Only their team projects
- Only their team tasks

**Member:**
- Gantt Chart (their tasks only)
- Only tasks assigned to them
- Their timeline only

---

## 6. Add User Interface

### Admin Add User Form:
```
┌─────────────────────────────────────┐
│ Add New User                        │
├─────────────────────────────────────┤
│ Full Name: [____________]           │
│ Email:     [____________]           │
│ Role:      [▼ Select Role]          │
│            - Admin                  │
│            - Manager                │
│            - Team Leader            │
│            - Member                 │
│ Team:      [▼ Select Team]          │
│            - Team A                 │
│            - Team B                 │
│            - Create New Team        │
│ Team Leader: [▼ Select Leader]      │
│              (if Member selected)   │
│                                     │
│ [Cancel]  [Send Invitation]         │
└─────────────────────────────────────┘
```

### Manager Add User Form:
```
┌─────────────────────────────────────┐
│ Add New User                        │
├─────────────────────────────────────┤
│ Full Name: [____________]           │
│ Email:     [____________]           │
│ Role:      [▼ Select Role]          │
│            - Team Leader            │
│            - Member                 │
│ Team:      [▼ Select Team]          │
│            (Only your teams shown)  │
│ Team Leader: [▼ Select Leader]      │
│              (if Member selected)   │
│                                     │
│ [Cancel]  [Send Invitation]         │
└─────────────────────────────────────┘
```

### Team Leader Add User Form:
```
┌─────────────────────────────────────┐
│ Add New Member                      │
├─────────────────────────────────────┤
│ Full Name: [____________]           │
│ Email:     [____________]           │
│ Role:      Member (fixed)           │
│ Team:      Your Team (auto-filled)  │
│                                     │
│ [Cancel]  [Send Invitation]         │
└─────────────────────────────────────┘
```

---

## 7. Dashboard Views

### Admin Dashboard:
- Total users count
- Total teams count
- Total projects count
- Full Gantt Chart
- All team activities
- User management panel
- Team management panel

### Manager Dashboard:
- Their teams count
- Their team members count
- Their projects count
- Team-restricted Gantt Chart
- Their team activities
- Add Team Leader/Member button

### Team Leader Dashboard:
- Their team members count
- Their team projects count
- Team-only Gantt Chart
- Their team tasks
- Add Member button

### Member Dashboard:
- Their assigned tasks count
- Their task progress
- Personal Gantt Chart (their tasks only)
- Task list
- Update task status

---

## 8. Email Templates

### Verification Email:
```
Subject: Verify Your Email - 4D BIM Application

Hi [Name],

Welcome to 4D BIM Application!

Please verify your email address to activate your account:

[Verify Email Button]

This link expires in 24 hours.
```

### Invitation Email:
```
Subject: You're invited to join 4D BIM Application

Hi [Name],

[Inviter Name] has invited you to join 4D BIM Application.

Your Role: [Role]
Team: [Team Name]

[Accept Invitation Button]

This invitation expires in 7 days.
```

---

## 9. Real Implementation Checklist

- [ ] Email verification system
- [ ] Invite system with role-based permissions
- [ ] Admin can add Admin with same permissions
- [ ] Manager can add Team Leader & Member only
- [ ] Team Leader can add Member only
- [ ] Team filtering (auto-applied based on role)
- [ ] Gantt Chart with animations
- [ ] Gantt Chart filters (team, user, role, date)
- [ ] Week/Month/Year views
- [ ] Real task dependencies
- [ ] Progress tracking
- [ ] Role-based dashboard views
- [ ] Email service integration
- [ ] Team selection dropdown
- [ ] Team Leader selection (for Members)

---

## 10. Technical Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL with Prisma
- **Authentication:** JWT (30 days expiry)
- **Email:** (To be configured - Gmail/SendGrid/Resend)
- **Gantt Chart:** Custom component with animations

---

## Notes:
- All users except Admin & Manager must register with real email
- Email verification is mandatory before login
- Permissions are strictly enforced at API level
- Team filtering is automatic based on user role
- Gantt Chart visibility is role-based
