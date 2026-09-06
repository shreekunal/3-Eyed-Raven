import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb, purgeOldScreenshots } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { uploadScreenshotToS3 } from '@/lib/storage';

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { session_id, image_data, width = 1280, height = 720 } = body;

    if (!session_id || !image_data) {
      return NextResponse.json({ error: 'Session ID and image data are required' }, { status: 400 });
    }

    if (!image_data.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format. Expected data URL.' }, { status: 400 });
    }

    const db = getDb();

    // Verify session belongs to user and is currently ACTIVE
    const validSession = db.prepare(`
      SELECT id FROM work_sessions
      WHERE id = ? AND user_id = ? AND status = 'ACTIVE'
    `).get(session_id, user.id);

    if (!validSession) {
      return NextResponse.json({ error: 'Unauthorized or invalid active session' }, { status: 403 });
    }

    const screenshotId = `sc-${crypto.randomUUID()}`;

    // Upload to Supabase S3 Cloud Storage bucket
    const finalImageUrl = await uploadScreenshotToS3(image_data, screenshotId);

    db.prepare(`
      INSERT INTO screenshots (id, session_id, user_id, captured_at, image_data, width, height)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(screenshotId, session_id, user.id, new Date().toISOString(), finalImageUrl, width, height);

    // Auto-purge screenshots older than 24 hours
    const purged = purgeOldScreenshots(24);

    return NextResponse.json({
      success: true,
      message: 'Screenshot uploaded successfully',
      id: screenshotId,
      purged_old_count: purged,
    });
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    return NextResponse.json({ error: 'Failed to save screenshot' }, { status: 500 });
  }
}
