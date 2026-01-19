import { NextRequest, NextResponse } from 'next/server';
import { runAutoBackupScheduler } from '@/lib/auto-backup';

// This endpoint should be called by a cron job service (e.g., Vercel Cron, GitHub Actions, or external cron)
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CRON] Auto-backup job triggered');
    
    await runAutoBackupScheduler();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Auto-backup scheduler completed',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[CRON] Auto-backup job failed:', error);
    return NextResponse.json({ 
      error: 'Auto-backup job failed',
      message: error.message 
    }, { status: 500 });
  }
}

// Allow POST as well for flexibility
export async function POST(req: NextRequest) {
  return GET(req);
}
