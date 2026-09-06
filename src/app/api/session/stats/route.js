import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = (user.role === 'ADMIN' && searchParams.get('userId')) 
      ? searchParams.get('userId') 
      : user.id;

    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = today.substring(0, 7); // 'YYYY-MM'

    // Today's total duration in seconds
    const todayRow = db.prepare(`
      SELECT SUM(duration_seconds) as total_seconds 
      FROM work_sessions 
      WHERE user_id = ? AND date = ?
    `).get(targetUserId, today);
    const todaySeconds = todayRow?.total_seconds || 0;

    // Monthly total duration
    const monthRow = db.prepare(`
      SELECT SUM(duration_seconds) as total_seconds 
      FROM work_sessions 
      WHERE user_id = ? AND date LIKE ? || '%'
    `).get(targetUserId, currentMonthPrefix);
    const monthSeconds = monthRow?.total_seconds || 0;

    // Past 7 days daily breakdown
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayRow = db.prepare(`
        SELECT SUM(duration_seconds) as total_seconds 
        FROM work_sessions 
        WHERE user_id = ? AND date = ?
      `).get(targetUserId, dateStr);

      const secs = dayRow?.total_seconds || 0;
      weeklyData.push({
        date: dateStr,
        day: dayName,
        seconds: secs,
        hours: Number((secs / 3600).toFixed(2)),
      });
    }

    // Active session if any
    const activeSession = db.prepare(`
      SELECT * FROM work_sessions 
      WHERE user_id = ? AND status = 'ACTIVE' 
      ORDER BY start_time DESC LIMIT 1
    `).get(targetUserId);

    return NextResponse.json({
      target_user_id: targetUserId,
      today: {
        seconds: todaySeconds,
        hours: Number((todaySeconds / 3600).toFixed(2)),
        formatted: formatDuration(todaySeconds),
      },
      monthly: {
        seconds: monthSeconds,
        hours: Number((monthSeconds / 3600).toFixed(2)),
        formatted: formatDuration(monthSeconds),
      },
      weekly: weeklyData,
      active_session: activeSession || null,
    });

  } catch (error) {
    console.error('Error fetching session stats:', error);
    return NextResponse.json({ error: 'Failed to fetch session statistics' }, { status: 500 });
  }
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}
