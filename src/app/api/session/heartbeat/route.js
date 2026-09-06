import { NextResponse } from 'next/server';
import { getDb, purgeOldScreenshots } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id, increment_seconds = 30 } = await request.json();

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const db = getDb();

    // Verify session belongs to user and is ACTIVE
    const session = db.prepare(`
      SELECT * FROM work_sessions 
      WHERE id = ? AND user_id = ? AND status = 'ACTIVE'
    `).get(session_id, user.id);

    if (!session) {
      return NextResponse.json({ error: 'No active session found' }, { status: 404 });
    }

    // Rate-limiting check: Reject heartbeats sent less than 10 seconds apart to prevent replay attacks
    if (session.last_heartbeat) {
      const secondsSinceLast = (Date.now() - new Date(session.last_heartbeat).getTime()) / 1000;
      if (secondsSinceLast < 10) {
        return NextResponse.json({ error: 'Heartbeat rate limit exceeded. Requests must be at least 10 seconds apart.' }, { status: 429 });
      }
    }

    // Increment duration and update last_heartbeat timestamp
    const safeIncrement = Math.min(Math.max(1, parseInt(increment_seconds, 10)), 35);
    db.prepare(`
      UPDATE work_sessions 
      SET duration_seconds = duration_seconds + ?, last_heartbeat = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(safeIncrement, session_id);

    const updated = db.prepare('SELECT duration_seconds FROM work_sessions WHERE id = ?').get(session_id);

    // Opportunistic rolling 24-hour cleanup
    purgeOldScreenshots(24);

    // Check if an admin requested an on-demand instant snapshot for this user
    let forceCapture = false;
    const pendingReq = db.prepare(`
      SELECT id FROM pending_screenshot_requests
      WHERE user_id = ? AND status = 'PENDING'
      ORDER BY created_at DESC LIMIT 1
    `).get(user.id);

    if (pendingReq) {
      forceCapture = true;
      db.prepare(`
        UPDATE pending_screenshot_requests
        SET status = 'FULFILLED'
        WHERE id = ?
      `).run(pendingReq.id);
    }

    // Fetch latest capture interval in case admin updated it
    const intervalRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('capture_interval_minutes');
    const intervalMinutes = parseInt(intervalRow?.value || '30', 10);

    return NextResponse.json({
      success: true,
      duration_seconds: updated.duration_seconds,
      capture_interval_minutes: intervalMinutes,
      force_capture: forceCapture,
    });
  } catch (error) {
    console.error('Error during session heartbeat:', error);
    return NextResponse.json({ error: 'Failed to process heartbeat' }, { status: 500 });
  }
}
