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
    const sheetId = searchParams.get('sheetId');
    const targetUserId = searchParams.get('userId');

    const db = getDb();

    // 1. Fetch available sheets
    let sheetsQuery = `
      SELECT 
        ts.*,
        u.name as owner_name,
        u.empid as owner_empid,
        (SELECT COUNT(t.id) FROM tasks t WHERE t.sheet_id = ts.id) as total_tasks,
        (SELECT COUNT(t.id) FROM tasks t WHERE t.sheet_id = ts.id AND t.status = 'Completed') as completed_tasks,
        (SELECT ROUND(AVG(t.progress_percent)) FROM tasks t WHERE t.sheet_id = ts.id) as avg_progress
      FROM task_sheets ts
      JOIN users u ON ts.user_id = u.id
      WHERE 1=1
    `;
    const sheetParams = [];

    if (user.role !== 'ADMIN') {
      // Employees see their own individual sheets OR any team sheets
      sheetsQuery += ` AND (ts.user_id = ? OR ts.sheet_type = 'TEAM') `;
      sheetParams.push(user.id);
    } else if (targetUserId) {
      sheetsQuery += ` AND ts.user_id = ? `;
      sheetParams.push(targetUserId);
    }

    sheetsQuery += ` ORDER BY ts.created_at DESC `;
    const sheets = db.prepare(sheetsQuery).all(...sheetParams);

    // 2. If a specific sheetId is requested, return its tasks
    let tasks = [];
    const activeSheetId = sheetId || (sheets.length > 0 ? sheets[0].id : null);

    if (activeSheetId) {
      tasks = db.prepare(`
        SELECT * FROM tasks 
        WHERE sheet_id = ? 
        ORDER BY 
          CASE severity 
            WHEN 'Critical' THEN 1 
            WHEN 'High' THEN 2 
            WHEN 'Medium' THEN 3 
            WHEN 'Low' THEN 4 
            ELSE 5 
          END ASC, 
          task_id ASC
      `).all(activeSheetId);
    }

    return NextResponse.json({
      sheets,
      activeSheetId,
      tasks,
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}
