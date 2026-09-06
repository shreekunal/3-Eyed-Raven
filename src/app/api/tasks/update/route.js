import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, status, progress_percent, daily_notes } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const db = getDb();

    // Verify task exists
    const task = db.prepare(`
      SELECT t.*, ts.user_id as sheet_owner, ts.sheet_type
      FROM tasks t
      JOIN task_sheets ts ON t.sheet_id = ts.id
      WHERE t.id = ?
    `).get(id);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check permission: Admin, Sheet Owner, or Assigned Employee in Team Sheet
    if (user.role !== 'ADMIN' && task.sheet_owner !== user.id) {
      if (task.sheet_type !== 'TEAM') {
        return NextResponse.json({ error: 'Permission denied for this task' }, { status: 403 });
      }
      // For Team Sheets, regular employees can only edit tasks assigned to their name or empid
      const isAssignedToUser = 
        task.assignee === user.name || 
        task.assignee === user.empid ||
        task.assignee.toLowerCase() === user.name.toLowerCase() ||
        task.assignee.toLowerCase() === user.empid.toLowerCase();
      
      if (!isAssignedToUser) {
        return NextResponse.json({ error: 'Permission denied. You can only update tasks assigned to you.' }, { status: 403 });
      }
    }

    let nextProgress = typeof progress_percent === 'number' 
      ? Math.min(100, Math.max(0, Math.round(progress_percent))) 
      : task.progress_percent;

    let nextStatus = status || task.status;
    if (nextProgress === 100 && (!status || status === 'Pending')) {
      nextStatus = 'Completed';
    } else if (nextProgress > 0 && nextProgress < 100 && nextStatus === 'Pending') {
      nextStatus = 'In Progress';
    }

    const nextNotes = daily_notes !== undefined ? daily_notes : task.daily_notes;

    db.prepare(`
      UPDATE tasks 
      SET status = ?, progress_percent = ?, daily_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nextStatus, nextProgress, nextNotes, id);

    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });

  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
