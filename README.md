# 🦅 3-Eyed Raven — Workforce Monitoring & Task Tracking Platform

> **"I see everything. I remember everything."**  
> A web-based employee monitoring, screen time tracking, screenshot audit, and Excel-driven task management platform.

---

## 📖 Project Overview

**3-Eyed Raven** is a self-hosted, full-stack web application for small-to-medium teams. It gives administrators complete visibility into employee productivity through:

- **Automated screen snapshots** at admin-configurable intervals (browser-based, zero native software required)
- **Daily / Weekly / Monthly screen time tracking** with persistent analytics
- **Rolling 24-hour screenshot retention** — old captures auto-purge to keep storage lean
- **Excel-driven task management** — employees upload `.xlsx` sheets that render as interactive data tables with inline progress editing

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 14** (App Router — unified frontend + backend API) |
| UI | **React 18** + **Tailwind CSS 3** |
| Icons | **Lucide React** |
| Auth | **JWT** (HTTP-only cookie) + **bcryptjs** |
| Database | **SQLite** via `better-sqlite3` (single file `data/raven.db`) |
| Excel | **SheetJS (`xlsx`)** for parse + generate |
| Screen Capture | Browser **`navigator.mediaDevices.getDisplayMedia`** API |
| Theme | Adaptive **Light / Dark** mode (class-based Tailwind + localStorage) |

---

## 🗂️ Directory Structure

```
Three-Eyed Raven/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.js        ✅ Implemented
│   │   │   │   ├── logout/route.js       ✅ Implemented
│   │   │   │   └── me/route.js           ✅ Implemented
│   │   │   ├── users/route.js            ✅ Implemented (GET list + POST create)
│   │   │   ├── settings/route.js         ✅ Implemented (GET + POST interval + DELETE purge)
│   │   │   ├── session/
│   │   │   │   ├── start/route.js        ✅ Implemented
│   │   │   │   ├── heartbeat/route.js    ✅ Implemented (auto-purge + interval sync)
│   │   │   │   ├── end/route.js          ✅ Implemented
│   │   │   │   └── stats/route.js        ✅ Implemented (daily/weekly/monthly)
│   │   │   ├── screenshots/
│   │   │   │   ├── upload/route.js       ✅ Implemented (Base64 store + auto-purge)
│   │   │   │   └── list/route.js         ✅ Implemented (rolling 24h query)
│   │   │   └── tasks/
│   │   │       ├── template/route.js     ✅ Implemented (XLSX download)
│   │   │       ├── upload/route.js       ✅ Implemented (parse + insert)
│   │   │       ├── list/route.js         ✅ Implemented (sheets + tasks)
│   │   │       ├── update/route.js       ✅ Implemented (progress/notes/status)
│   │   │       └── export/route.js       ✅ Implemented (XLSX export)
│   │   ├── login/page.jsx                ✅ Implemented
│   │   ├── dashboard/page.jsx            ⏳ TODO
│   │   ├── admin/page.jsx                ⏳ TODO
│   │   ├── layout.jsx                    ✅ Implemented
│   │   ├── page.jsx                      ✅ Implemented (auth redirect)
│   │   └── globals.css                   ✅ Implemented
│   ├── components/
│   │   ├── Navbar.jsx                    ✅ Implemented
│   │   ├── SessionTracker.jsx            ✅ Implemented (getDisplayMedia + capture)
│   │   ├── ScreenTimeStats.jsx           ✅ Implemented (daily/weekly/monthly charts)
│   │   ├── TaskDataTable.jsx             ✅ Implemented (interactive table + upload modal)
│   │   ├── ScreenshotModal.jsx           ✅ Implemented (full-res inspector)
│   │   └── UserModal.jsx                 ✅ Implemented (admin user creation)
│   ├── context/
│   │   ├── AuthContext.jsx               ✅ Implemented
│   │   └── ThemeContext.jsx              ✅ Implemented
│   └── lib/
│       ├── db.js                         ✅ Implemented (SQLite schema + seeder + purge)
│       ├── auth.js                       ✅ Implemented (JWT sign/verify/getSessionUser)
│       └── excel.js                      ✅ Implemented (parse + template + export)
├── .env.local                            ✅ (never commit — in .gitignore)
├── .gitignore                            ✅ Implemented
├── next.config.js                        ✅ Implemented
├── tailwind.config.js                    ✅ Implemented
├── postcss.config.js                     ✅ Implemented
└── package.json                          ✅ Implemented
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (already created)
`.env.local` contains:
```
JWT_SECRET=three-eyed-raven-super-secret-key-2026-secure
PORT=3000
```

### 3. Run Development Server
```bash
npm run dev
```

The app starts at **http://localhost:3000**

The SQLite database (`data/raven.db`) is created automatically on first run with two seeded accounts.

### 4. Default Login Credentials

| Role | Identifier | Password |
|---|---|---|
| **Admin** | `admin@raven.local` or `ADMIN01` | `admin123` |
| **Employee** | `EMP001` | `emp123` |

---

## 🗃️ Database Schema

All data is stored in `data/raven.db` (SQLite).

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (UUID) | PK |
| `name` | TEXT | Display name |
| `empid` | TEXT | Unique employee code, used for login |
| `email` | TEXT | Unique email, used for login |
| `pass` | TEXT | bcrypt hashed |
| `role` | TEXT | `'ADMIN'` or `'EMPLOYEE'` |
| `created_at` | DATETIME | |

### `settings`
| Key | Default Value | Description |
|---|---|---|
| `capture_interval_minutes` | `30` | Admin-configurable screenshot interval |

### `work_sessions`
Tracks active work shifts. Permanent — never purged. Used for screen time analytics.

### `screenshots`
Stores compressed WebP Base64 data URLs. **Automatically purged after 24 hours** on every upload/heartbeat.

### `task_sheets` + `tasks`
Permanent. Stores parsed Excel uploads and employee progress updates.

---

## ✨ Key Features

### Employee Dashboard (⏳ `src/app/dashboard/page.jsx` — TODO)
- **Start Work** button → browser requests screen share (`getDisplayMedia`)
- Live session timer (HH:MM:SS)
- Auto screenshots at admin-set interval (compressed WebP → SQLite)
- Screen time stats: Today / Weekly chart / Monthly total
- Excel task upload with inline progress slider + daily notes

### Admin Control Center (⏳ `src/app/admin/page.jsx` — TODO)
- Live employee status cards (active shifts + latest snapshot thumbnail)
- Screenshot interval slider (1m – 720m range, updates live for all sessions)
- Screenshot timeline gallery: Select employee → see today's rolling captures → click for full-res modal
- Employee management: Create new users with name/empid/email/password/role
- Task review: Browse employee & team Excel sheets, view progress, export updated Excel

### Screen Capture Engine (`src/components/SessionTracker.jsx`)
- Uses `navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'monitor' } })`
- Employee approves once — captures silently at configured interval
- Canvas-based frame extraction → `canvas.toDataURL('image/webp', 0.7)` for ~80–120KB per capture
- Heartbeat every 30s syncs duration and latest interval config from server
- Handles stream stop gracefully (browser toolbar or tab close)

### 24-Hour Rolling Screenshot Storage
- `purgeOldScreenshots(24)` runs on every upload and heartbeat
- `DELETE FROM screenshots WHERE captured_at < datetime('now', '-24 hours')`
- Admin can manually trigger purge from settings panel
- Screen time duration data (`work_sessions`) is **never purged**

---

## 📋 Excel Task Schema

Expected columns in uploaded `.xlsx` files:

| Column | Required | Notes |
|---|---|---|
| `Task ID` | ✅ | e.g. `TSK-101` |
| `Task Title` | ✅ | Task description |
| `Assignee` | ✅ | Employee name or EmpID |
| `Status` | ✅ | `Pending`, `In Progress`, `Completed`, `Blocked` |
| `Severity` | ✅ | `Low`, `Medium`, `High`, `Critical` |
| `Deadline` | Optional | `YYYY-MM-DD` |

Download the pre-formatted template from the dashboard or via `/api/tasks/template`.

---

## 🔐 Authentication

- JWT stored in HTTP-only cookie (`raven_token`, 7-day TTL)
- Login via **email** OR **empid** + password
- Protected API routes check cookie via `getSessionUser(request)` in `src/lib/auth.js`
- Role guard: Admin-only routes return `403` for employees

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login, sets JWT cookie |
| POST | `/api/auth/logout` | Auth | Clear JWT cookie |
| GET | `/api/auth/me` | Auth | Get current user |
| GET | `/api/users` | Admin | List all users with live status |
| POST | `/api/users` | Admin | Create new user |
| GET | `/api/settings` | Auth | Get capture interval + storage stats |
| POST | `/api/settings` | Admin | Update capture interval |
| DELETE | `/api/settings` | Admin | Purge old screenshots |
| POST | `/api/session/start` | Auth | Start work session |
| POST | `/api/session/heartbeat` | Auth | Tick duration + sync interval |
| POST | `/api/session/end` | Auth | End work session |
| GET | `/api/session/stats` | Auth | Daily/weekly/monthly stats |
| POST | `/api/screenshots/upload` | Auth | Store Base64 screenshot |
| GET | `/api/screenshots/list` | Auth | List rolling 24h captures |
| GET | `/api/tasks/template` | Auth | Download XLSX template |
| POST | `/api/tasks/upload` | Auth | Upload + parse Excel sheet |
| GET | `/api/tasks/list` | Auth | List sheets + tasks |
| POST | `/api/tasks/update` | Auth | Update task progress/notes |
| GET | `/api/tasks/export` | Auth | Export sheet to XLSX |
