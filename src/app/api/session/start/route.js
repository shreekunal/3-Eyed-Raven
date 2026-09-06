import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // Check if there's already an active session for this user today
    let activeSession = db.prepare(`
      SELECT * FROM work_sessions 
      WHERE user_id = ? AND status = 'ACTIVE' 
      ORDER BY start_time DESC LIMIT 1
    `).get(user.id);

    if (!activeSession) {
      const sessionId = `sess-${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO work_sessions (id, user_id, start_time, duration_seconds, date, status)
        VALUES (?, ?, CURRENT_TIMESTAMP, 0, ?, 'ACTIVE')
      `).run(sessionId, user.id, today);

      activeSession = db.prepare('SELECT * FROM work_sessions WHERE id = ?').get(sessionId);
    }

    // Calculate cumulative total seconds worked today so far
    const todayRow = db.prepare(`
      SELECT SUM(duration_seconds) as total_seconds 
      FROM work_sessions 
      WHERE user_id = ? AND date = ?
    `).get(user.id, today);
    const todayCumulativeSeconds = todayRow?.total_seconds || 0;

    // Fetch current capture interval
    const intervalRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('capture_interval_minutes');
    const intervalMinutes = parseInt(intervalRow?.value || '30', 10);

    return NextResponse.json({
      success: true,
      session: activeSession,
      today_cumulative_seconds: todayCumulativeSeconds,
      capture_interval_minutes: intervalMinutes,
    });
  } catch (error) {
    console.error('Error starting session:', error);
    return NextResponse.json({ error: 'Failed to start work session' }, { status: 500 });
  }
}
