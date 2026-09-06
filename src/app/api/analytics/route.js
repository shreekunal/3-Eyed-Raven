import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized — Admin access required' }, { status: 401 });
    }

    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch 24-Hour Activity Heatmap Data for Today
    // Break down today's sessions by hour of start_time (0 to 23)
    const sessionsToday = db.prepare(`
      SELECT user_id, start_time, duration_seconds, status
      FROM work_sessions
      WHERE date = ?
    `).all(today);

    // Initialize 24 hour buckets (00:00 to 23:00)
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      activeSeconds: 0,
      activeUsers: new Set(),
    }));

    sessionsToday.forEach(s => {
      if (s.start_time) {
        const d = new Date(s.start_time);
        const hour = d.getHours();
        if (hour >= 0 && hour < 24) {
          hourlyActivity[hour].activeSeconds += (s.duration_seconds || 0);
          hourlyActivity[hour].activeUsers.add(s.user_id);
        }
      }
    });

    const hourlyHeatmap = hourlyActivity.map(h => ({
      hour: h.hour,
      label: h.label,
      activeMinutes: Math.round(h.activeSeconds / 60),
      activeUserCount: h.activeUsers.size,
      intensity: h.activeSeconds > 7200 ? 'high' : h.activeSeconds > 1800 ? 'medium' : h.activeSeconds > 0 ? 'low' : 'none'
    }));

    // 2. Fetch Employee Workload & Focus Distribution
    const employees = db.prepare(`
      SELECT id, name, empid, email, created_at
      FROM users
      WHERE role = 'EMPLOYEE'
      ORDER BY name ASC
    `).all();

    const employeeAnalytics = employees.map(emp => {
      // Today duration
      const todayRow = db.prepare(`
        SELECT SUM(duration_seconds) as total_sec
        FROM work_sessions
        WHERE user_id = ? AND date = ?
      `).get(emp.id, today);
      const todaySeconds = todayRow?.total_sec || 0;

      // Active status check
      const activeSess = db.prepare(`
        SELECT id FROM work_sessions
        WHERE user_id = ? AND status = 'ACTIVE'
        LIMIT 1
      `).get(emp.id);

      // Tasks stats for employee
      const taskStats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN (severity = 'High' OR severity = 'Critical') AND status != 'Completed' THEN 1 ELSE 0 END) as open_critical
        FROM tasks
        WHERE assignee = ? OR assignee = ?
      `).get(emp.name, emp.empid);

      // Screenshot count today
      const shotRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM screenshots
        WHERE user_id = ? AND DATE(captured_at) = ?
      `).get(emp.id, today);

      return {
        id: emp.id,
        name: emp.name,
        empid: emp.empid,
        email: emp.email,
        isActive: !!activeSess,
        todaySeconds,
        todayHours: Number((todaySeconds / 3600).toFixed(2)),
        todayFormatted: formatDuration(todaySeconds),
        screenshotCount: shotRow?.count || 0,
        totalTasks: taskStats?.total || 0,
        completedTasks: taskStats?.completed || 0,
        inProgressTasks: taskStats?.in_progress || 0,
        openCriticalTasks: taskStats?.open_critical || 0,
        taskCompletionRate: taskStats?.total ? Math.round((taskStats.completed / taskStats.total) * 100) : 0
      };
    });

    // 3. Past 7 Days Workload Distribution Trend
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayTotalRow = db.prepare(`
        SELECT SUM(duration_seconds) as total_sec
        FROM work_sessions
        WHERE date = ?
      `).get(dateStr);

      const secs = dayTotalRow?.total_sec || 0;
      weeklyTrend.push({
        date: dateStr,
        day: dayName,
        totalHours: Number((secs / 3600).toFixed(2)),
      });
    }

    return NextResponse.json({
      success: true,
      heatmap: hourlyHeatmap,
      team: employeeAnalytics,
      weeklyTrend,
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to compute productivity analytics' }, { status: 500 });
  }
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
