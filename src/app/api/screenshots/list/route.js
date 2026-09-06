import { NextResponse } from 'next/server';
import { getDb, purgeOldScreenshots } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { resolveScreenshotUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterUserId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '60', 10);

    // Non-admins can only see their own screenshots
    const targetUserId = user.role === 'ADMIN' ? filterUserId : user.id;

    // Run rolling purge before query
    purgeOldScreenshots(24);

    const db = getDb();
    let query = `
      SELECT 
        s.id,
        s.session_id,
        s.user_id,
        s.captured_at,
        s.image_data,
        s.width,
        s.height,
        u.name as user_name,
        u.empid as user_empid,
        u.email as user_email
      FROM screenshots s
      JOIN users u ON s.user_id = u.id
      WHERE s.captured_at >= datetime('now', '-24 hours')
    `;

    const params = [];
    if (targetUserId) {
      query += ` AND s.user_id = ? `;
      params.push(targetUserId);
    }

    query += ` ORDER BY s.captured_at DESC LIMIT ? `;
    params.push(limit);

    const rawScreenshots = db.prepare(query).all(...params);

    const screenshots = await Promise.all(
      rawScreenshots.map(async (s) => ({
        ...s,
        image_data: await resolveScreenshotUrl(s.image_data),
      }))
    );

    return NextResponse.json({ screenshots });
  } catch (error) {
    console.error('Error fetching screenshots:', error);
    return NextResponse.json({ error: 'Failed to fetch screenshots' }, { status: 500 });
  }
}
