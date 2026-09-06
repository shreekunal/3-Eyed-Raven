import { NextResponse } from 'next/server';
import { getDb, purgeOldScreenshots } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const intervalRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('capture_interval_minutes');
    const intervalMinutes = parseInt(intervalRow?.value || '30', 10);

    // Screenshot metrics
    const stats = db.prepare(`
      SELECT 
        COUNT(id) as total_screenshots,
        SUM(LENGTH(image_data)) as total_bytes
      FROM screenshots
    `).get();

    return NextResponse.json({
      capture_interval_minutes: intervalMinutes,
      total_screenshots: stats.total_screenshots || 0,
      storage_kb: Math.round((stats.total_bytes || 0) / 1024),
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { capture_interval_minutes } = await request.json();
    const parsed = parseInt(capture_interval_minutes, 10);

    if (isNaN(parsed) || parsed < 1 || parsed > 720) {
      return NextResponse.json({ error: 'Interval must be between 1 and 720 minutes' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES ('capture_interval_minutes', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(String(parsed));

    return NextResponse.json({
      success: true,
      message: `Screenshot interval updated to ${parsed} minutes`,
      capture_interval_minutes: parsed
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getSessionUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Default to 24 hours purge or custom query param
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);

    const deletedCount = purgeOldScreenshots(hours);

    return NextResponse.json({
      success: true,
      message: `Purged ${deletedCount} screenshots older than ${hours} hours.`,
      purged: deletedCount,
    });
  } catch (error) {
    console.error('Error purging screenshots:', error);
    return NextResponse.json({ error: 'Failed to purge screenshots' }, { status: 500 });
  }
}
