import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email-service';

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 3); // 3 days before deletion

    // Find accounts scheduled for deletion
    const accountsToDelete = await prisma.user.findMany({
      where: {
        deletionScheduledFor: {
          lte: now,
        },
        deletionRequestedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        deletionScheduledFor: true,
      },
    });

    // Find accounts that need reminder (3 days before deletion)
    const accountsNeedingReminder = await prisma.user.findMany({
      where: {
        deletionScheduledFor: {
          lte: reminderDate,
          gt: now,
        },
        deletionRequestedAt: {
          not: null,
        },
        deletionReminderSent: false,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        deletionScheduledFor: true,
      },
    });

    let deletedCount = 0;
    let remindersSent = 0;

    // Send reminders
    for (const user of accountsNeedingReminder) {
      try {
        await sendEmail({
          to: user.email,
          subject: 'URGENT: Account Deletion in 3 Days',
          html: `
            <h2>⚠️ Final Reminder: Account Deletion</h2>
            <p>Dear ${user.fullName},</p>
            <p><strong>Your account will be permanently deleted in 3 days!</strong></p>
            <p><strong>Deletion Date: ${user.deletionScheduledFor?.toLocaleDateString()}</strong></p>
            <p>This is your last chance to restore your account.</p>
            <p>To restore your account, simply log in before the deletion date.</p>
            <p>After deletion, all your data will be permanently removed and cannot be recovered.</p>
            <br/>
            <p>Best regards,<br/>4D BIM Team</p>
          `,
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { deletionReminderSent: true },
        });

        remindersSent++;
      } catch (error) {
        console.error(`Failed to send reminder to user ${user.id}:`, error);
      }
    }

    // Permanently delete accounts
    for (const user of accountsToDelete) {
      try {
        // Send final notification
        await sendEmail({
          to: user.email,
          subject: 'Account Permanently Deleted',
          html: `
            <h2>Account Deleted</h2>
            <p>Dear ${user.fullName},</p>
            <p>Your account has been permanently deleted as requested.</p>
            <p>All your data has been removed from our system.</p>
            <p>If you wish to use our services again, you will need to create a new account.</p>
            <br/>
            <p>Best regards,<br/>4D BIM Team</p>
          `,
        });

        // Get admins and managers
        const adminsAndManagers = await prisma.user.findMany({
          where: {
            role: {
              in: ['admin', 'manager'],
            },
            id: {
              not: user.id, // Don't notify if the deleted user is admin/manager
            },
          },
          select: {
            email: true,
            fullName: true,
          },
        });

        // Notify admins and managers
        for (const admin of adminsAndManagers) {
          await sendEmail({
            to: admin.email,
            subject: 'User Account Permanently Deleted',
            html: `
              <h2>Account Deletion Completed</h2>
              <p>Dear ${admin.fullName},</p>
              <p>User <strong>${user.fullName}</strong> (${user.email}) has been permanently deleted from the system.</p>
              <p>Deletion Date: ${now.toLocaleDateString()}</p>
              <br/>
              <p>Best regards,<br/>4D BIM System</p>
            `,
          });
        }

        // Permanently delete the user and all related data
        // Prisma will handle cascade deletions based on schema
        await prisma.user.delete({
          where: { id: user.id },
        });

        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete user ${user.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      remindersSent,
      message: `Processed ${deletedCount} deletions and sent ${remindersSent} reminders`,
    });
  } catch (error) {
    console.error('Error processing account deletions:', error);
    return NextResponse.json(
      { error: 'Failed to process account deletions' },
      { status: 500 }
    );
  }
}
