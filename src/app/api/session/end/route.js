import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      UPDATE work_sessions 
      SET status = 'COMPLETED', end_time = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `).run(session_id, user.id);

    const session = db.prepare('SELECT * FROM work_sessions WHERE id = ?').get(session_id);

    return NextResponse.json({
      success: true,
      message: 'Work session ended successfully',
      session,
    });
  } catch (error) {
    console.error('Error ending session:', error);
    return NextResponse.json({ error: 'Failed to end work session' }, { status: 500 });
  }
}
