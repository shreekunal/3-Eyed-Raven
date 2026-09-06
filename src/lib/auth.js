import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'three-eyed-raven-super-secret-key-2026-secure';

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      empid: user.empid,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export async function getSessionUser(request) {
  let token = null;

  // Check Authorization header
  if (request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // Fallback to cookie
  if (!token) {
    try {
      const cookieStore = cookies();
      const authCookie = cookieStore.get('raven_token');
      if (authCookie) {
        token = authCookie.value;
      }
    } catch (e) {
      // cookies() might fail outside Next.js request context
    }
  }

  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  // Verify user still exists in DB
  const db = getDb();
  const user = db.prepare('SELECT id, name, empid, email, role FROM users WHERE id = ?').get(decoded.id);
  return user || null;
}
