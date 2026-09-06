import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const adminUser = await getSessionUser(request);
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { target_user_id } = await request.json();

    if (!target_user_id) {
      return NextResponse.json({ error: 'target_user_id is required' }, { status: 400 });
    }

    const db = getDb();

    // Verify employee exists and has an active work session
    const activeSession = db.prepare(`
      SELECT ws.id 
      FROM work_sessions ws
      WHERE ws.user_id = ? AND ws.status = 'ACTIVE'
      ORDER BY ws.start_time DESC LIMIT 1
    `).get(target_user_id);

    if (!activeSession) {
      return NextResponse.json({ error: 'Employee does not have an active work shift right now' }, { status: 400 });
    }

    const reqId = `req-${crypto.randomUUID()}`;

    // Cancel any existing pending requests for this user to prevent clutter
    db.prepare(`
      UPDATE pending_screenshot_requests 
      SET status = 'CANCELLED' 
      WHERE user_id = ? AND status = 'PENDING'
    `).run(target_user_id);

    // Insert new pending request
    db.prepare(`
      INSERT INTO pending_screenshot_requests (id, user_id, requested_by, status)
      VALUES (?, ?, ?, 'PENDING')
    `).run(reqId, target_user_id, adminUser.id);

    return NextResponse.json({
      success: true,
      message: 'On-demand screenshot requested! Frame will be captured automatically.',
      request_id: reqId,
    });

  } catch (error) {
    console.error('Error requesting snapshot:', error);
    return NextResponse.json({ error: 'Failed to request screenshot capture' }, { status: 500 });
  }
}
