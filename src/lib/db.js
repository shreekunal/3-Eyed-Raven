import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

let dbInstance = null;

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'raven.db');
  dbInstance = new Database(dbPath);

  // Optimize SQLite performance
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  // Initialize Tables
  initSchema(dbInstance);

  return dbInstance;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      empid TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      pass TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'EMPLOYEE')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS work_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      duration_seconds INTEGER DEFAULT 0,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      last_heartbeat DATETIME,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS screenshots (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      captured_at DATETIME NOT NULL,
      image_data TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      FOREIGN KEY(session_id) REFERENCES work_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pending_screenshot_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_sheets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sheet_type TEXT NOT NULL CHECK(sheet_type IN ('INDIVIDUAL', 'TEAM')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      sheet_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      title TEXT NOT NULL,
      assignee TEXT NOT NULL,
      status TEXT NOT NULL,
      severity TEXT NOT NULL,
      deadline TEXT,
      progress_percent INTEGER DEFAULT 0,
      daily_notes TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sheet_id) REFERENCES task_sheets(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_screenshots_user_captured ON screenshots(user_id, captured_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON work_sessions(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_tasks_sheet ON tasks(sheet_id);
  `);

  // Safe migration for existing databases missing last_heartbeat column
  try {
    db.exec(`ALTER TABLE work_sessions ADD COLUMN last_heartbeat DATETIME`);
  } catch (e) {
    // Column already exists
  }

  // Seed default settings
  const settingCheck = db.prepare('SELECT value FROM settings WHERE key = ?').get('capture_interval_minutes');
  if (!settingCheck) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('capture_interval_minutes', '30');
  }

  // Seed default admin + team employees
  const adminCheck = db.prepare('SELECT id FROM users WHERE role = ?').get('ADMIN');
  if (!adminCheck) {
    const adminPassHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (id, name, empid, email, pass, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('user-admin-001', 'Admin', 'ADMIN01', 'admin@raven.local', adminPassHash, 'ADMIN');

    // Seed team employees
    const employees = [
      { id: 'user-emp-001', name: 'Akshat',  empid: 'EMP001', email: 'akshat@raven.local' },
      { id: 'user-emp-002', name: 'Aryan',   empid: 'EMP002', email: 'aryan@raven.local'  },
      { id: 'user-emp-003', name: 'Ayush',   empid: 'EMP003', email: 'ayush@raven.local'  },
      { id: 'user-emp-004', name: 'Harshit', empid: 'EMP004', email: 'harshit@raven.local' },
      { id: 'user-emp-005', name: 'Kunal',   empid: 'EMP005', email: 'kunal@raven.local'  },
      { id: 'user-emp-006', name: 'Lakshya', empid: 'EMP006', email: 'lakshya@raven.local' },
    ];

    const insertUser = db.prepare(`
      INSERT INTO users (id, name, empid, email, pass, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const empPassHash = bcrypt.hashSync('emp123', 10);
    for (const emp of employees) {
      insertUser.run(emp.id, emp.name, emp.empid, emp.email, empPassHash, 'EMPLOYEE');
    }
  }
}

/**
 * Automatically purge screenshots older than specified hours (default: 24 hours).
 * Screen time work_sessions and tasks remain untouched.
 */
export function purgeOldScreenshots(hours = 24) {
  const db = getDb();
  const info = db.prepare(`
    DELETE FROM screenshots 
    WHERE captured_at < datetime('now', '-' || ? || ' hours')
  `).run(hours);
  return info.changes;
}

/**
 * Auto-closes any active work sessions that haven't received a heartbeat in > timeoutMinutes (default: 5 minutes).
 * End time is accurately capped to the last received heartbeat timestamp.
 */
export function purgeStaleSessions(timeoutMinutes = 5) {
  const db = getDb();
  const info = db.prepare(`
    UPDATE work_sessions 
    SET status = 'COMPLETED', 
        end_time = COALESCE(last_heartbeat, start_time) 
    WHERE status = 'ACTIVE' 
    AND datetime(COALESCE(last_heartbeat, start_time), '+' || ? || ' minutes') < datetime('now')
  `).run(timeoutMinutes);
  return info.changes;
}

export default getDb;
