/**
 * db:seed — Applies the full schema and inserts all seed users.
 * Safe to run multiple times (idempotent via INSERT OR IGNORE).
 *
 * Usage:  npm run db:seed
 */

const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');
const fs       = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'raven.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    empid      TEXT UNIQUE NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    pass       TEXT NOT NULL,
    role       TEXT NOT NULL CHECK(role IN ('ADMIN','EMPLOYEE')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS work_sessions (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL,
    start_time       DATETIME NOT NULL,
    end_time         DATETIME,
    duration_seconds INTEGER DEFAULT 0,
    date             TEXT NOT NULL,
    status           TEXT DEFAULT 'ACTIVE',
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS screenshots (
    id         TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    captured_at DATETIME NOT NULL,
    image_data  TEXT NOT NULL,
    width       INTEGER,
    height      INTEGER,
    FOREIGN KEY(session_id) REFERENCES work_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id)    REFERENCES users(id)          ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_sheets (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    title      TEXT NOT NULL,
    sheet_type TEXT NOT NULL CHECK(sheet_type IN ('INDIVIDUAL','TEAM')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id               TEXT PRIMARY KEY,
    sheet_id         TEXT NOT NULL,
    task_id          TEXT NOT NULL,
    title            TEXT NOT NULL,
    assignee         TEXT NOT NULL,
    status           TEXT NOT NULL,
    severity         TEXT NOT NULL,
    deadline         TEXT,
    progress_percent INTEGER DEFAULT 0,
    daily_notes      TEXT,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sheet_id) REFERENCES task_sheets(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_screenshots_user_captured ON screenshots(user_id, captured_at);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_date        ON work_sessions(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_tasks_sheet               ON tasks(sheet_id);
`);

// ── Default settings ──────────────────────────────────────────────────────────
db.prepare(`
  INSERT OR IGNORE INTO settings (key, value) VALUES ('capture_interval_minutes', '30')
`).run();

// ── Seed users ────────────────────────────────────────────────────────────────
const adminHash = bcrypt.hashSync('admin123', 10);
const empHash   = bcrypt.hashSync('emp123', 10);

const users = [
  { id: 'user-admin-001', name: 'Admin',   empid: 'ADMIN01', email: 'admin@raven.local',   pass: adminHash, role: 'ADMIN'    },
  { id: 'user-emp-001',   name: 'Akshat',  empid: 'EMP001',  email: 'akshat@raven.local',  pass: empHash,   role: 'EMPLOYEE' },
  { id: 'user-emp-002',   name: 'Aryan',   empid: 'EMP002',  email: 'aryan@raven.local',   pass: empHash,   role: 'EMPLOYEE' },
  { id: 'user-emp-003',   name: 'Ayush',   empid: 'EMP003',  email: 'ayush@raven.local',   pass: empHash,   role: 'EMPLOYEE' },
  { id: 'user-emp-004',   name: 'Harshit', empid: 'EMP004',  email: 'harshit@raven.local', pass: empHash,   role: 'EMPLOYEE' },
  { id: 'user-emp-005',   name: 'Kunal',   empid: 'EMP005',  email: 'kunal@raven.local',   pass: empHash,   role: 'EMPLOYEE' },
  { id: 'user-emp-006',   name: 'Lakshya', empid: 'EMP006',  email: 'lakshya@raven.local', pass: empHash,   role: 'EMPLOYEE' },
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO users (id, name, empid, email, pass, role)
  VALUES (@id, @name, @empid, @email, @pass, @role)
`);

let created = 0;
for (const u of users) {
  const info = insert.run(u);
  if (info.changes) created++;
}

db.close();

console.log('\n🌱  Seeding complete');
console.log(`   Database : ${dbPath}`);
console.log(`   Users    : ${created} inserted, ${users.length - created} already existed\n`);
console.log('   ┌─────────┬──────────┬──────────────────────────┬────────────┐');
console.log('   │ Name    │ Emp ID   │ Email                    │ Password   │');
console.log('   ├─────────┼──────────┼──────────────────────────┼────────────┤');
for (const u of users) {
  const pw = u.role === 'ADMIN' ? 'admin123' : 'emp123';
  console.log(`   │ ${u.name.padEnd(7)} │ ${u.empid.padEnd(8)} │ ${u.email.padEnd(24)} │ ${pw.padEnd(10)} │`);
}
console.log('   └─────────┴──────────┴──────────────────────────┴────────────┘\n');
