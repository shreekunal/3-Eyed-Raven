/**
 * db:seed — Applies schema and populates rich sample data for demo.
 * Safe to run multiple times (idempotent via INSERT OR REPLACE).
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
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL,
    user_id     TEXT NOT NULL,
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
  INSERT OR REPLACE INTO settings (key, value) VALUES ('capture_interval_minutes', '30')
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

const insertUser = db.prepare(`
  INSERT OR REPLACE INTO users (id, name, empid, email, pass, role)
  VALUES (@id, @name, @empid, @email, @pass, @role)
`);

for (const u of users) {
  insertUser.run(u);
}

// ── Helper: Mock SVG Screenshot Generator ─────────────────────────────────────
function createMockScreenshotSvg(title, subtitle, accentColor = '#3b82f6', bg = '#0f172a') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
    <rect width="1280" height="720" fill="${bg}"/>
    <!-- Window Bar -->
    <rect width="1280" height="40" fill="#1e293b"/>
    <circle cx="20" cy="20" r="6" fill="#ef4444"/>
    <circle cx="40" cy="20" r="6" fill="#f59e0b"/>
    <circle cx="60" cy="20" r="6" fill="#10b981"/>
    <text x="90" y="25" fill="#94a3b8" font-family="monospace" font-size="13">${title} — 3-Eyed Raven</text>
    
    <!-- Sidebar -->
    <rect x="0" y="40" width="220" height="680" fill="#1e293b" opacity="0.7"/>
    <rect x="20" y="70" width="180" height="32" rx="6" fill="${accentColor}" opacity="0.3"/>
    <rect x="20" y="120" width="140" height="14" rx="4" fill="#475569"/>
    <rect x="20" y="150" width="160" height="14" rx="4" fill="#334155"/>
    <rect x="20" y="180" width="120" height="14" rx="4" fill="#334155"/>
    <rect x="20" y="210" width="150" height="14" rx="4" fill="#334155"/>

    <!-- Main Workspace -->
    <rect x="250" y="70" width="990" height="610" rx="12" fill="#1e293b"/>
    <text x="280" y="115" fill="#f8fafc" font-family="sans-serif" font-size="22" font-weight="bold">${title}</text>
    <text x="280" y="142" fill="#94a3b8" font-family="sans-serif" font-size="13">${subtitle}</text>
    
    <!-- Code Editor Card -->
    <rect x="280" y="175" width="480" height="230" rx="8" fill="#0f172a"/>
    <rect x="300" y="200" width="220" height="12" rx="3" fill="${accentColor}"/>
    <rect x="300" y="225" width="380" height="10" rx="3" fill="#475569"/>
    <rect x="300" y="245" width="300" height="10" rx="3" fill="#334155"/>
    <rect x="300" y="265" width="420" height="10" rx="3" fill="#334155"/>
    <rect x="300" y="285" width="260" height="10" rx="3" fill="#475569"/>
    <rect x="300" y="305" width="340" height="10" rx="3" fill="${accentColor}" opacity="0.7"/>
    <rect x="300" y="325" width="200" height="10" rx="3" fill="#10b981"/>

    <!-- Chart Card -->
    <rect x="780" y="175" width="460" height="230" rx="8" fill="#0f172a"/>
    <rect x="800" y="200" width="160" height="12" rx="3" fill="#f59e0b"/>
    <path d="M 810 350 Q 870 260 930 310 T 1050 240 T 1190 280" fill="none" stroke="${accentColor}" stroke-width="4"/>
    <circle cx="1050" cy="240" r="6" fill="#10b981"/>

    <!-- Bottom Data Grid -->
    <rect x="280" y="430" width="960" height="220" rx="8" fill="#0f172a"/>
    <rect x="300" y="455" width="280" height="14" rx="3" fill="#cbd5e1"/>
    <rect x="300" y="485" width="920" height="36" rx="6" fill="#1e293b"/>
    <rect x="300" y="535" width="920" height="36" rx="6" fill="#1e293b"/>
    <rect x="300" y="590" width="920" height="36" rx="6" fill="#1e293b"/>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// ── Sample Work Sessions & Screenshots ────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];

const sampleEmpData = [
  {
    userId: 'user-emp-001',
    name: 'Akshat',
    status: 'ACTIVE',
    duration: 23400, // 6h 30m
    shots: [
      { title: 'Akshat - VS Code (Frontend Refactor)', subtitle: 'Editing src/app/admin/page.jsx & ShadcnSelect components', color: '#3b82f6', minsAgo: 15 },
      { title: 'Akshat - Next.js Build Console', subtitle: 'Checking server bundle compilation and route speed', color: '#8b5cf6', minsAgo: 75 },
    ]
  },
  {
    userId: 'user-emp-002',
    name: 'Aryan',
    status: 'ACTIVE',
    duration: 26400, // 7h 20m
    shots: [
      { title: 'Aryan - SQLite Migration Suite', subtitle: 'Writing indexing scripts for high-frequency work sessions', color: '#10b981', minsAgo: 20 },
      { title: 'Aryan - JWT Auth Debugger', subtitle: 'Testing session start & end cookie verification', color: '#3b82f6', minsAgo: 90 },
    ]
  },
  {
    userId: 'user-emp-003',
    name: 'Ayush',
    status: 'OFFLINE',
    duration: 16200, // 4h 30m
    shots: [
      { title: 'Ayush - Excel Data Processing', subtitle: 'Validating XLSX parsing logic for task sheet upload', color: '#f59e0b', minsAgo: 140 },
    ]
  },
  {
    userId: 'user-emp-004',
    name: 'Harshit',
    status: 'ACTIVE',
    duration: 29400, // 8h 10m
    shots: [
      { title: 'Harshit - Render Blueprint Configuration', subtitle: 'Updating render.yaml & database seed scripts', color: '#ec4899', minsAgo: 10 },
      { title: 'Harshit - Team Workload Heatmap', subtitle: 'Testing daily shift aggregation & completion metrics', color: '#8b5cf6', minsAgo: 60 },
    ]
  },
  {
    userId: 'user-emp-005',
    name: 'Kunal',
    status: 'ACTIVE',
    duration: 18900, // 5h 15m
    shots: [
      { title: 'Kunal - Tailwind v3 Styling Audit', subtitle: 'Ensuring responsive grid layouts across screen sizes', color: '#06b6d4', minsAgo: 45 },
    ]
  },
  {
    userId: 'user-emp-006',
    name: 'Lakshya',
    status: 'OFFLINE',
    duration: 13800, // 3h 50m
    shots: [
      { title: 'Lakshya - Task Export Utility', subtitle: 'Testing XLSX.utils.aoa_to_sheet template generation', color: '#f97316', minsAgo: 210 },
    ]
  },
];

// Insert Work Sessions & Screenshots
const insertSession = db.prepare(`
  INSERT OR REPLACE INTO work_sessions (id, user_id, start_time, end_time, duration_seconds, date, status)
  VALUES (@id, @user_id, @start_time, @end_time, @duration_seconds, @date, @status)
`);

const insertShot = db.prepare(`
  INSERT OR REPLACE INTO screenshots (id, session_id, user_id, captured_at, image_data, width, height)
  VALUES (@id, @session_id, @user_id, @captured_at, @image_data, @width, @height)
`);

for (const emp of sampleEmpData) {
  const sessionId = `sess-${emp.name.toLowerCase()}-today`;
  const startTime = new Date(Date.now() - emp.duration * 1000).toISOString();
  const endTime   = emp.status === 'ACTIVE' ? null : new Date().toISOString();

  insertSession.run({
    id: sessionId,
    user_id: emp.userId,
    start_time: startTime,
    end_time: endTime,
    duration_seconds: emp.duration,
    date: today,
    status: emp.status === 'ACTIVE' ? 'ACTIVE' : 'COMPLETED'
  });
}

// ── Sample Task Sheet & Tasks ─────────────────────────────────────────────────
const sheetId = 'sheet-team-sprint-q3';
db.prepare(`
  INSERT OR REPLACE INTO task_sheets (id, user_id, title, sheet_type, created_at)
  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
`).run(sheetId, 'user-admin-001', 'Q3 Sprint & Product Roadmap', 'TEAM');

const sampleTasks = [
  { id: 'task-001', sheet_id: sheetId, task_id: 'RAV-101', title: 'Next.js Mobile UI Optimization', assignee: 'Akshat', status: 'Completed', severity: 'High', deadline: '2026-09-10', progress_percent: 100, daily_notes: 'Glassy bottom dock navigation implemented & tested' },
  { id: 'task-002', sheet_id: sheetId, task_id: 'RAV-102', title: 'Auth Cookie Expiration & Refresh', assignee: 'Aryan', status: 'In Progress', severity: 'Critical', deadline: '2026-09-12', progress_percent: 65, daily_notes: 'JWT verification middleware active' },
  { id: 'task-003', sheet_id: sheetId, task_id: 'RAV-103', title: 'Screenshot Capture Cleanup Job', assignee: 'Ayush', status: 'In Progress', severity: 'Medium', deadline: '2026-09-15', progress_percent: 40, daily_notes: 'Retention policy defined for 30 days' },
  { id: 'task-004', sheet_id: sheetId, task_id: 'RAV-104', title: 'SQLite WAL Mode & Performance Tuning', assignee: 'Harshit', status: 'Completed', severity: 'High', deadline: '2026-09-08', progress_percent: 100, daily_notes: 'Pragma settings applied, index speed improved 4x' },
  { id: 'task-005', sheet_id: sheetId, task_id: 'RAV-105', title: 'Team Workload & Output Heatmap', assignee: 'Kunal', status: 'In Progress', severity: 'Critical', deadline: '2026-09-11', progress_percent: 80, daily_notes: 'Workload calculations connected to live sessions' },
  { id: 'task-006', sheet_id: sheetId, task_id: 'RAV-106', title: 'Excel Blank Template Export Utility', assignee: 'Lakshya', status: 'Completed', severity: 'Medium', deadline: '2026-09-09', progress_percent: 100, daily_notes: 'Headers-only XLSX file generation verified' },
  { id: 'task-007', sheet_id: sheetId, task_id: 'RAV-107', title: 'Render Cloud Deployment Configuration', assignee: 'Harshit', status: 'In Progress', severity: 'Critical', deadline: '2026-09-14', progress_percent: 75, daily_notes: 'render.yaml persistent disk & build commands configured' },
];

const insertTask = db.prepare(`
  INSERT OR REPLACE INTO tasks (id, sheet_id, task_id, title, assignee, status, severity, deadline, progress_percent, daily_notes)
  VALUES (@id, @sheet_id, @task_id, @title, @assignee, @status, @severity, @deadline, @progress_percent, @daily_notes)
`);

for (const t of sampleTasks) {
  insertTask.run(t);
}

db.close();

console.log('\n🌱  Seeding complete');
console.log(`   Database     : ${dbPath}`);
console.log(`   Users        : ${users.length} configured`);
console.log(`   Work Sessions: ${sampleEmpData.length} active sessions created`);
console.log(`   Task Sheet   : 1 Team Sheet created with ${sampleTasks.length} tasks\n`);
