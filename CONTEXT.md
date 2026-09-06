# 🤖 AI Continuation Context — 3-Eyed Raven

> This file is written for any AI agent continuing development of this project.
> Read it fully before writing any code. It captures all confirmed decisions,
> what is already built, and exactly what remains to be done.

---

## 🎯 Project Identity

- **Project Name**: 3-Eyed Raven
- **Root Directory**: `/home/shrik/Work/Three-Eyed Raven`
- **Type**: Full-stack web application (Next.js 14 App Router)
- **Purpose**: Employee workforce monitoring — screen time analytics, rolling 24-hour screenshot capture, and Excel-driven task management

---

## ✅ Confirmed Product Decisions

| Decision | Choice |
|---|---|
| Architecture | Next.js 14 (App Router) — unified frontend + API routes |
| Theme | Adaptive Light/Dark mode (Tailwind `darkMode: 'class'`, localStorage persistence) |
| Screenshot Capture | Browser Web Screen Capture API (`navigator.mediaDevices.getDisplayMedia`) — no native desktop agent |
| Screenshot Interval | Admin-configurable (1 – 720 minutes). Stored in `settings` table, key `capture_interval_minutes` |
| Screenshot Storage | SQLite BLOB/Base64 (compressed WebP ~70% quality, ~80-120KB per capture) |
| Screenshot Retention | **Rolling 24-hour auto-purge only** — no historical screenshots stored |
| Screen Time Records | **Permanent** — `work_sessions` (duration, date) never purged |
| Task Records | **Permanent** — `task_sheets` and `tasks` never purged |
| Excel Schema | `Task ID`, `Task Title`, `Assignee`, `Status`, `Severity`, `Deadline` (parser also reads `Progress`, `Daily Notes`) |
| Task UI | Dense Excel Data Table with inline progress slider + status dropdown + daily notes input |
| Task Types | Individual (only uploader sees) + Team (all employees see) |
| Database | SQLite via `better-sqlite3` at `data/raven.db`. Auto-created on first run |
| Authentication | JWT in HTTP-only cookie (`raven_token`), 7-day TTL, login via email OR empid |
| User Roles | `ADMIN` and `EMPLOYEE` in single `users` table |
| Default Seed | Admin: `admin@raven.local` / `ADMIN01` / `admin123`. Employee: `EMP001` / `emp123` |

---

## ✅ What Is Already Built (Do NOT recreate)

### Configuration & Tooling
- `package.json` — Dependencies: next, react, tailwindcss, better-sqlite3, xlsx, bcryptjs, jsonwebtoken, lucide-react, clsx, tailwind-merge
- `next.config.js` — `better-sqlite3` externalized, 10MB body limit for server actions
- `tailwind.config.js` — `darkMode: 'class'`, custom `raven` color palette
- `postcss.config.js`
- `.env.local` — `JWT_SECRET` configured (never commit)
- `.gitignore` — excludes `node_modules/`, `.next/`, `data/`, `*.db`, `.env*`
- `node_modules/` — already installed via `npm install`

### Library Utilities (`src/lib/`)
- `db.js` — SQLite initialization, full schema migration, default seeding, `purgeOldScreenshots(hours)` export
- `auth.js` — `signToken()`, `verifyToken()`, `getSessionUser(request)` (reads Bearer header or `raven_token` cookie)
- `excel.js` — `generateSampleTemplateBuffer()`, `parseExcelBuffer(buffer)`, `exportTasksToExcelBuffer(tasks, title)`

### Context Providers (`src/context/`)
- `AuthContext.jsx` — `AuthProvider`, `useAuth()` hook with `user`, `loading`, `login()`, `logout()`, `refreshUser()`
- `ThemeContext.jsx` — `ThemeProvider`, `useTheme()` hook with `theme`, `toggleTheme()`

### UI Components (`src/components/`)
- `Navbar.jsx` — Brand, nav links (Employee Space / Admin Center), theme toggle, user badge with role pill, logout
- `SessionTracker.jsx` — Full screen capture engine: `getDisplayMedia`, canvas frame capture, WebP compression, 30s heartbeat, periodic capture at configurable interval, Start/End Work buttons
- `ScreenTimeStats.jsx` — Three-panel component: Today's hours card, Monthly hours card, 7-day bar chart
- `TaskDataTable.jsx` — Dense table: sheet selector, search, status/severity filter, inline progress slider, status dropdown, debounced notes, upload modal, download template link, export button
- `ScreenshotModal.jsx` — Full-res screenshot inspector modal with download button
- `UserModal.jsx` — Admin create-user form modal

### App Shell (`src/app/`)
- `globals.css` — Tailwind directives + CSS custom properties for light/dark + scrollbars
- `layout.jsx` — Root layout wrapping with `ThemeProvider` + `AuthProvider` + `Navbar` + footer
- `page.jsx` — Root `/` route: redirects to `/login`, `/dashboard`, or `/admin` based on auth
- `login/page.jsx` — Login form with quick-fill demo credential buttons

### Backend API Routes (all in `src/app/api/`)
- `auth/login/route.js` — POST: credential check, JWT generation, cookie set
- `auth/logout/route.js` — POST: clear `raven_token` cookie
- `auth/me/route.js` — GET: returns current user from JWT
- `users/route.js` — GET (admin): list all users with live session status + latest screenshot. POST (admin): create user
- `settings/route.js` — GET: capture interval + storage stats. POST (admin): update interval. DELETE (admin): trigger manual purge
- `session/start/route.js` — POST: start or resume work session for today
- `session/heartbeat/route.js` — POST: increment duration_seconds, trigger rolling purge, return latest interval
- `session/end/route.js` — POST: mark session `COMPLETED`
- `session/stats/route.js` — GET: today/monthly/weekly breakdowns + active session info
- `screenshots/upload/route.js` — POST: store Base64 image, trigger 24h purge
- `screenshots/list/route.js` — GET: rolling 24h captures, optionally filtered by userId
- `tasks/template/route.js` — GET: download pre-filled sample XLSX
- `tasks/upload/route.js` — POST: FormData with file + sheet_type, parses and inserts tasks
- `tasks/list/route.js` — GET: returns accessible sheets + tasks for selected sheet (sorted by severity)
- `tasks/update/route.js` — POST: update status/progress_percent/daily_notes with auto-status logic
- `tasks/export/route.js` — GET: download updated XLSX for a given sheetId

---

## ⏳ What Remains To Be Built

### 1. Employee Dashboard — `src/app/dashboard/page.jsx`

This is the main page employees see after login.

**Required sections (top to bottom):**
1. **Auth guard**: If not logged in → redirect to `/login`. If admin → optionally show a banner.
2. **Greeting header**: `"Good [morning/afternoon], {user.name}"` + date
3. **`<SessionTracker onSessionUpdate={refreshStats} />`** — Full-width work session controller
4. **`<ScreenTimeStats stats={stats} />`** — Three-column stats grid
5. **`<TaskDataTable />`** — Full task management interface

**Data fetching:**
- On mount: `GET /api/session/stats` → populate `stats` state
- `refreshStats()` function re-fetches stats (called by `SessionTracker` via `onSessionUpdate`)
- Polling `stats` every 60 seconds is nice-to-have

---

### 2. Admin Control Center — `src/app/admin/page.jsx`

Admin-only page. Redirect non-admins to `/dashboard`.

**Required sections (top to bottom):**

#### A. Top Stats Bar
Four quick metric cards:
- Total Employees (count of role=EMPLOYEE)
- Currently Active (count of sessions with status=ACTIVE today)
- Today's Screenshots (count of screenshots from last 24h)
- Open High/Critical Tasks (count of tasks with severity IN ('High','Critical') and status != 'Completed')

#### B. Live Workforce Cards
Fetch `GET /api/users` which returns all users with:
- `current_status` (ACTIVE / null)
- `today_duration` (seconds)
- `screenshot_count` (today's 24h window)
- `latest_screenshot` (Base64 data URL or null)

For each **EMPLOYEE**:
- Show a card: name, empid, role badge
- Status indicator: pulsing green dot if ACTIVE, grey if offline
- Today's work duration in `Xh Ym` format
- Latest screenshot thumbnail (if available, show `<img>` with click-to-open `ScreenshotModal`)
- Screenshot count badge

#### C. Screenshot Timeline (Audit Browser)
- Employee selector dropdown (list of employees)
- On select: fetch `GET /api/screenshots/list?userId={id}` (returns today's 24h captures)
- Render chronological grid of thumbnail images with timestamp labels
- Click thumbnail → open `<ScreenshotModal screenshot={...} onClose={...} />`

#### D. Settings Panel (Interval + Storage)
- Fetch `GET /api/settings` on mount: `capture_interval_minutes`, `total_screenshots`, `storage_kb`
- Interval selector: `<select>` with options [1, 5, 10, 15, 30, 60, 120] minutes
- On change: `POST /api/settings` with `{ capture_interval_minutes: value }`
- Show storage stats: e.g. "47 screenshots stored (~3.8 MB)"
- "Purge Old Screenshots Now" button → `DELETE /api/settings` → refresh stats

#### E. Employee Management (User Table + Create Button)
- Table listing all users: name, empid, email, role badge, created_at
- "Add New User" button → opens `<UserModal onUserCreated={refreshUsers} onClose={...} />`
- On `onUserCreated`: re-fetch user list

#### F. Task Overview (All Team + Individual Sheets)
- Fetch `GET /api/tasks/list` (admin sees all)
- Sheet selector dropdown
- Show read-only task table (same columns as employee view but no editing controls)
- "Export Sheet" button → links to `/api/tasks/export?sheetId={id}`

---

### 3. Minor Remaining Items
- `src/app/dashboard/layout.jsx` (optional) — or just include auth guard inline in page
- Verify the build compiles: `npm run build`
- Ensure `npm run dev` runs cleanly

---

## ⚠️ Important Implementation Notes

### `better-sqlite3` + Next.js
- `better-sqlite3` is a **native Node.js addon**. It MUST only run server-side.
- It is listed in `next.config.js` under `webpack externals` for server builds.
- **Never import `db.js` in client components or pages marked `'use client'`**.
- All DB access goes through API routes (`src/app/api/**`).

### Screen Capture in Next.js
- `SessionTracker.jsx` is `'use client'` and uses browser APIs (`navigator.mediaDevices`, `HTMLVideoElement`, `HTMLCanvasElement`).
- It will error on SSR. Wrap in dynamic import with `{ ssr: false }` if importing in a server component:
  ```js
  import dynamic from 'next/dynamic';
  const SessionTracker = dynamic(() => import('@/components/SessionTracker'), { ssr: false });
  ```

### Data URL Size
- Each WebP screenshot is ~80–120KB as a Base64 string.
- The `/api/screenshots/upload` and heartbeat routes together keep only today's data.
- `next.config.js` sets `bodySizeLimit: '10mb'` for server actions — API routes handle large payloads natively.

### Auto-purge Timing
- `purgeOldScreenshots(24)` is called inside:
  - `POST /api/screenshots/upload`
  - `POST /api/session/heartbeat`
  - `GET /api/screenshots/list`
- Admin can manually trigger via `DELETE /api/settings`

---

## 🎨 Design System Reference

All styling uses Tailwind CSS utility classes. Key patterns:

```
Card:        bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm
Input:       px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none
Btn Primary: bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-md shadow-blue-600/20
Btn Danger:  bg-red-600 hover:bg-red-500 text-white rounded-xl
Btn Ghost:   border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800
Badge Admin: bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800
Badge Emp:   bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800
Severity Critical: bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-900
Severity High:     bg-amber-100 text-amber-700
Severity Medium:   bg-blue-100 text-blue-700
Severity Low:      bg-slate-100 text-slate-700
```

---

## 🔧 Running the Project

```bash
# Install (already done)
npm install

# Start dev server
npm run dev
# → http://localhost:3000

# Build for production
npm run build
npm start
```

The SQLite database auto-initializes at `data/raven.db` on first server start.

---

## 📝 Remaining Files To Create

| File | Priority | Notes |
|---|---|---|
| `src/app/dashboard/page.jsx` | 🔴 Critical | Employee dashboard — compose SessionTracker + ScreenTimeStats + TaskDataTable |
| `src/app/admin/page.jsx` | 🔴 Critical | Admin control center — all 6 sections detailed above |
