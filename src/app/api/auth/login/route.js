import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Please provide email/employee ID and password' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(email) = LOWER(?) OR LOWER(empid) = LOWER(?)
    `).get(identifier.trim(), identifier.trim());

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials. User not found.' }, { status: 401 });
    }

    const isMatch = bcrypt.compareSync(password, user.pass);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials. Incorrect password.' }, { status: 401 });
    }

    const token = signToken(user);

    const safeUser = {
      id: user.id,
      name: user.name,
      empid: user.empid,
      email: user.email,
      role: user.role,
    };

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      token,
    });

    // Set HTTP-only session cookie
    response.cookies.set('raven_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error during login' }, { status: 500 });
  }
}
