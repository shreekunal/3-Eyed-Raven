import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (user) {
      const db = getDb();
      // Auto-close active work sessions for this employee on logout
      db.prepare(`
        UPDATE work_sessions 
        SET status = 'COMPLETED', end_time = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND status = 'ACTIVE'
      `).run(user.id);
    }
  } catch (err) {
    console.error('Error closing active session on logout:', err);
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set('raven_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return response;
}
