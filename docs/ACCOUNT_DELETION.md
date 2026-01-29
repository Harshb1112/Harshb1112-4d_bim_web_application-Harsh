# Account Deletion Feature

## Overview
This is a **REAL** account deletion system with a 30-day grace period, email notifications, and automatic permanent deletion.

## How It Works

### 1. User Requests Deletion
- User goes to **Settings → Advanced → Data Management**
- Clicks **"Delete My Account"** button
- Confirms the deletion request

### 2. Account Marked for Deletion
- Account is marked with `deletionRequestedAt` timestamp
- Deletion scheduled for 30 days later (`deletionScheduledFor`)
- User receives confirmation email
- **Admins and Managers** receive notification emails

### 3. Grace Period (30 Days)
- User can **restore account** by simply logging in
- Login automatically cancels the deletion request
- User receives restoration confirmation email

### 4. Reminder Email (3 Days Before)
- System sends **final warning email** 3 days before deletion
- Email includes last chance to restore account
- Reminder flag set to prevent duplicate emails

### 5. Permanent Deletion
- After 30 days, cron job permanently deletes the account
- All related data deleted (cascade deletion via Prisma)
- Final deletion confirmation email sent to user
- Admins and managers notified of completed deletion

## Email Notifications

### To User:
1. **Deletion Request Confirmed** - Immediate
2. **Final Reminder** - 3 days before deletion
3. **Account Permanently Deleted** - After deletion
4. **Account Restored** - If user logs in during grace period

### To Admins/Managers:
1. **User Deletion Request** - When user requests deletion
2. **Account Permanently Deleted** - After deletion completes

## API Endpoints

### Request Account Deletion
```
POST /api/user/delete-account
```
Marks account for deletion with 30-day grace period.

### Restore Account (Cancel Deletion)
```
DELETE /api/user/delete-account
```
Cancels deletion request (also automatic on login).

### Process Deletions (Cron Job)
```
GET /api/cron/process-account-deletions
Authorization: Bearer {CRON_SECRET}
```
Runs every 6 hours to:
- Send reminder emails (3 days before)
- Permanently delete expired accounts

## Cron Job Configuration

The cron job runs every 6 hours via Vercel Cron:

```json
{
  "path": "/api/cron/process-account-deletions",
  "schedule": "0 */6 * * *"
}
```

## Database Schema

Added fields to User model:

```prisma
model User {
  // ... existing fields
  deletionRequestedAt  DateTime?  @map("deletion_requested_at")
  deletionScheduledFor DateTime?  @map("deletion_scheduled_for")
  deletionReminderSent Boolean    @default(false) @map("deletion_reminder_sent")
}
```

## Security

- Cron endpoint protected with `CRON_SECRET` environment variable
- Only authenticated users can request deletion
- Automatic restoration on login prevents accidental deletion
- All emails sent to verify actions

## Testing

### Manual Test (Development)
```bash
# Set CRON_SECRET in .env
CRON_SECRET=your-secret-key

# Call cron endpoint
curl -H "Authorization: Bearer your-secret-key" \
  http://localhost:3000/api/cron/process-account-deletions
```

### Test Flow
1. Request account deletion from settings
2. Check email for confirmation
3. Log in to restore account
4. Check email for restoration confirmation

## Migration

Run this to add the new fields:

```bash
npx prisma migrate dev --name add_account_deletion_fields
```

Or manually add to your database:

```sql
ALTER TABLE users 
ADD COLUMN deletion_requested_at TIMESTAMP,
ADD COLUMN deletion_scheduled_for TIMESTAMP,
ADD COLUMN deletion_reminder_sent BOOLEAN DEFAULT FALSE;
```

## Important Notes

- ✅ This is a **REAL** deletion system, not fake or demo
- ✅ Data is **permanently deleted** after 30 days
- ✅ Users can **restore** within 30 days by logging in
- ✅ **All stakeholders** (user, admins, managers) are notified
- ✅ **Automatic reminders** sent before final deletion
- ✅ **Cascade deletion** removes all user data (projects, tasks, etc.)

## Production Deployment

1. Set `CRON_SECRET` in Vercel environment variables
2. Deploy to Vercel (cron jobs auto-configured)
3. Verify cron job in Vercel dashboard
4. Test with a test account

## Support

If you need to manually restore an account:

```sql
UPDATE users 
SET deletion_requested_at = NULL,
    deletion_scheduled_for = NULL,
    deletion_reminder_sent = FALSE
WHERE email = 'user@example.com';
```
