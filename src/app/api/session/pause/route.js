import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id, action } = await request.json(); // action: 'pause' | 'resume'

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const db = getDb();
    const session = db.prepare('SELECT * FROM work_sessions WHERE id = ? AND user_id = ?').get(session_id, user.id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const newStatus = action === 'resume' ? 'ACTIVE' : 'PAUSED';

    db.prepare(`
      UPDATE work_sessions 
      SET status = ? 
      WHERE id = ? AND user_id = ?
    `).run(newStatus, session_id, user.id);

    const updated = db.prepare('SELECT * FROM work_sessions WHERE id = ?').get(session_id);

    return NextResponse.json({
      success: true,
      session: updated,
      message: action === 'resume' ? 'Shift resumed' : 'Shift paused for break',
    });

  } catch (error) {
    console.error('Error toggling session pause state:', error);
    return NextResponse.json({ error: 'Failed to update session pause state' }, { status: 500 });
  }
}
