import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { parseExcelBuffer } from '@/lib/excel';

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const sheetType = formData.get('sheet_type') || 'INDIVIDUAL';
    const customTitle = formData.get('title');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Please select an Excel file (.xlsx, .xls) to upload' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Excel file size exceeds 5MB limit. Please upload a smaller file.' }, { status: 400 });
    }

    const fileName = file.name || '';
    if (!/\.(xlsx|xls)$/i.test(fileName)) {
      return NextResponse.json({ error: 'Invalid file format. Only Excel spreadsheets (.xlsx, .xls) are allowed.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsedTasks = parseExcelBuffer(buffer);

    if (!parsedTasks || parsedTasks.length === 0) {
      return NextResponse.json({ error: 'No valid task rows found in the uploaded file' }, { status: 400 });
    }

    const db = getDb();
    const sheetId = `sheet-${crypto.randomUUID()}`;
    const title = customTitle?.trim() || file.name.replace(/\.[^/.]+$/, '');

    // Transaction to insert sheet and tasks
    const insertSheet = db.prepare(`
      INSERT INTO task_sheets (id, user_id, title, sheet_type)
      VALUES (?, ?, ?, ?)
    `);

    const insertTask = db.prepare(`
      INSERT INTO tasks (id, sheet_id, task_id, title, assignee, status, severity, deadline, progress_percent, daily_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      insertSheet.run(sheetId, user.id, title, sheetType);
      for (const t of parsedTasks) {
        const taskId = `tsk-${crypto.randomUUID()}`;
        insertTask.run(
          taskId,
          sheetId,
          t.task_id,
          t.title,
          t.assignee || user.empid,
          t.status || 'Pending',
          t.severity || 'Medium',
          t.deadline || '',
          t.progress_percent || 0,
          t.daily_notes || ''
        );
      }
    });

    transaction();

    // Fetch created tasks
    const savedTasks = db.prepare('SELECT * FROM tasks WHERE sheet_id = ?').all(sheetId);

    return NextResponse.json({
      success: true,
      sheet: {
        id: sheetId,
        title,
        sheet_type: sheetType,
        task_count: savedTasks.length,
      },
      tasks: savedTasks,
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading Excel:', error);
    return NextResponse.json({ error: 'Failed to process and parse Excel file' }, { status: 500 });
  }
}
