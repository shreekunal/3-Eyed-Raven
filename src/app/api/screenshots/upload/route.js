import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb, purgeOldScreenshots } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

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
    const screenshotId = `sc-${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO screenshots (id, session_id, user_id, captured_at, image_data, width, height)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
    `).run(screenshotId, session_id, user.id, image_data, width, height);

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
