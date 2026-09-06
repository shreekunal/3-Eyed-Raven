import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { resolveScreenshotUrl } from '@/lib/storage';

export async function GET(request) {
  try {
    const currentUser = await getSessionUser(request);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const rawUsers = db.prepare(`
      SELECT 
        u.id, 
        u.name, 
        u.empid, 
        u.email, 
        u.role, 
        u.created_at,
        (
          SELECT status FROM work_sessions ws 
          WHERE ws.user_id = u.id AND ws.date = ? 
          ORDER BY ws.start_time DESC LIMIT 1
        ) as current_status,
        (
          SELECT duration_seconds FROM work_sessions ws 
          WHERE ws.user_id = u.id AND ws.date = ? 
          ORDER BY ws.start_time DESC LIMIT 1
        ) as today_duration,
        (
          SELECT COUNT(s.id) FROM screenshots s 
          WHERE s.user_id = u.id AND s.captured_at >= datetime('now', '-24 hours')
        ) as screenshot_count,
        (
          SELECT s.image_data FROM screenshots s 
          WHERE s.user_id = u.id 
          ORDER BY s.captured_at DESC LIMIT 1
        ) as latest_screenshot,
        (
          SELECT s.captured_at FROM screenshots s 
          WHERE s.user_id = u.id 
          ORDER BY s.captured_at DESC LIMIT 1
        ) as latest_screenshot_captured_at
      FROM users u
      ORDER BY u.role ASC, u.name ASC
    `).all(today, today);

    const users = await Promise.all(
      rawUsers.map(async (u) => ({
        ...u,
        latest_screenshot: await resolveScreenshotUrl(u.latest_screenshot),
      }))
    );

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const currentUser = await getSessionUser(request);
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { name, empid, email, password, role } = await request.json();

    if (!name || !empid || !email || !password || !role) {
      return NextResponse.json({ error: 'All fields (name, empid, email, password, role) are required' }, { status: 400 });
    }

    const userRole = role.toUpperCase();
    if (userRole !== 'ADMIN' && userRole !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Role must be either ADMIN or EMPLOYEE' }, { status: 400 });
    }

    const db = getDb();

    // Check duplicate email or empid
    const existing = db.prepare(`
      SELECT id FROM users 
      WHERE LOWER(email) = LOWER(?) OR LOWER(empid) = LOWER(?)
    `).get(email.trim(), empid.trim());

    if (existing) {
      return NextResponse.json({ error: 'User with this Email or Employee ID already exists' }, { status: 409 });
    }

    const newId = `user-${crypto.randomUUID()}`;
    const passHash = bcrypt.hashSync(password, 10);

    db.prepare(`
      INSERT INTO users (id, name, empid, email, pass, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(newId, name.trim(), empid.trim(), email.trim().toLowerCase(), passHash, userRole);

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: { id: newId, name: name.trim(), empid: empid.trim(), email: email.trim().toLowerCase(), role: userRole }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error creating user' }, { status: 500 });
  }
}
