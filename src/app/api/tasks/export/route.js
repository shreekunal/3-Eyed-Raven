import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { exportTasksToExcelBuffer } from '@/lib/excel';

export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get('sheetId');

    if (!sheetId) {
      return NextResponse.json({ error: 'sheetId is required' }, { status: 400 });
    }

    const db = getDb();
    const sheet = db.prepare('SELECT * FROM task_sheets WHERE id = ?').get(sheetId);

    if (!sheet) {
      return NextResponse.json({ error: 'Task sheet not found' }, { status: 404 });
    }

    // Permission check
    if (user.role !== 'ADMIN' && sheet.user_id !== user.id && sheet.sheet_type !== 'TEAM') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const tasks = db.prepare(`
      SELECT * FROM tasks 
      WHERE sheet_id = ? 
      ORDER BY task_id ASC
    `).all(sheetId);

    const buffer = exportTasksToExcelBuffer(tasks, sheet.title);

    const safeTitle = sheet.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeTitle}_Updated_Progress.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error exporting tasks:', error);
    return NextResponse.json({ error: 'Failed to export tasks to Excel' }, { status: 500 });
  }
}
