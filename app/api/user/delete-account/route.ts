import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { sendEmail } from '@/lib/email-service';

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;

    // Check if already marked for deletion
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        deletionRequestedAt: true,
        deletionScheduledFor: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.deletionRequestedAt) {
      return NextResponse.json(
        { error: 'Account deletion already requested' },
        { status: 400 }
      );
    }

    // Set deletion date to 30 days from now
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    // Mark account for deletion
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: new Date(),
        deletionScheduledFor: deletionDate,
        deletionReminderSent: false,
      },
    });

    // Send email to user
    await sendEmail({
      to: user.email,
      subject: 'Account Deletion Request Confirmed',
      html: `
        <h2>Account Deletion Request</h2>
        <p>Dear ${user.fullName},</p>
        <p>Your account deletion request has been received and confirmed.</p>
        <p><strong>Your account will be permanently deleted on: ${deletionDate.toLocaleDateString()}</strong></p>
        <p>You have 30 days to restore your account if you change your mind.</p>
        <p>To restore your account, simply log in before the deletion date.</p>
        <p>If you did not request this, please contact support immediately.</p>
        <br/>
        <p>Best regards,<br/>4D BIM Team</p>
      `,
    });

    // Get all admins and managers to notify them
    const adminsAndManagers = await prisma.user.findMany({
      where: {
        role: {
          in: ['admin', 'manager'],
        },
      },
      select: {
        email: true,
        fullName: true,
      },
    });

    // Send notification to admins and managers
    for (const admin of adminsAndManagers) {
      await sendEmail({
        to: admin.email,
        subject: 'User Account Deletion Request',
        html: `
          <h2>Account Deletion Notification</h2>
          <p>Dear ${admin.fullName},</p>
          <p>User <strong>${user.fullName}</strong> (${user.email}) has requested account deletion.</p>
          <p><strong>Scheduled deletion date: ${deletionDate.toLocaleDateString()}</strong></p>
          <p>The account will be permanently deleted after 30 days unless the user restores it.</p>
          <br/>
          <p>Best regards,<br/>4D BIM System</p>
        `,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Account marked for deletion. You have 30 days to restore it.',
      deletionDate: deletionDate.toISOString(),
    });
  } catch (error) {
    console.error('Error marking account for deletion:', error);
    return NextResponse.json(
      { error: 'Failed to process deletion request' },
      { status: 500 }
    );
  }
}

// Restore account (cancel deletion)
export async function DELETE(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        deletionRequestedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.deletionRequestedAt) {
      return NextResponse.json(
        { error: 'No deletion request found' },
        { status: 400 }
      );
    }

    // Cancel deletion
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: null,
        deletionScheduledFor: null,
        deletionReminderSent: false,
      },
    });

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Account Restored Successfully',
      html: `
        <h2>Account Restored</h2>
        <p>Dear ${user.fullName},</p>
        <p>Your account has been successfully restored.</p>
        <p>The deletion request has been cancelled.</p>
        <br/>
        <p>Best regards,<br/>4D BIM Team</p>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Account deletion cancelled successfully',
    });
  } catch (error) {
    console.error('Error restoring account:', error);
    return NextResponse.json(
      { error: 'Failed to restore account' },
      { status: 500 }
    );
  }
}
