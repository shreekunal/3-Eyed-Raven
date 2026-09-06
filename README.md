# 🦅 3-Eyed Raven — Workforce Monitoring & Task Tracking Platform

> **"I see everything. I remember everything."**  
> A full-stack employee screen time monitoring, screenshot audit, Cloud Object Storage, anti-cheating, and Excel-driven task management platform built with Next.js 14, Tailwind CSS, SQLite, and Supabase S3 Cloud Storage.

---

## 📖 Overview

**3-Eyed Raven** gives administrators complete, real-time visibility into employee productivity through:

- 📷 **Cloud Object Storage Screenshot Telemetry**: Screen captures uploaded directly to private Supabase S3 Cloud Storage (`3-Eyed-Raven`) with AWS SigV4 presigned GET URLs for high security.
- ⚡ **On-Demand Admin Instant Capture**: Admins can trigger immediate screen captures for any active employee directly from the Admin Live Workforce cards.
- 🛡️ **Anti-Cheating & Security Guard**:
  - **Strict Full-Screen Policy**: Enforces `displaySurface: 'monitor'` (entire screen share required; single window or tab sharing is blocked).
  - **Mobile Clock-in Guard**: Restricts shift clock-in to desktop browsers (Windows, macOS, Linux).
  - **Multi-Tab Lock**: `BroadcastChannel` prevents double-counting timer seconds across multiple browser tabs.
  - **Heartbeat Rate-Limiting & Stale Session Cleaner**: Auto-closes abandoned sessions missing heartbeats for > 5 minutes.
  - **Shift Pause / Take Break**: Built-in break controls pause shift timers and screenshot telemetry.
- 📊 **24-Hour Rolling Audit & Analytics**: Screenshots auto-purge after 24 hours to keep storage lean while permanent shift metrics render on 24-hour activity heatmaps and past-7-day workload charts.
- 📋 **Excel Task Management**: Import and export `.xlsx` sheets with inline progress sliders, severity tags, and daily notes. Non-admin task updates are strictly restricted to assigned team members.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | **Next.js 14** (App Router — unified API routes & Server Components) |
| **UI & Styling** | **React 18** + **Tailwind CSS 3** + **Lucide React** icons |
| **Cloud Storage** | **Supabase S3 Object Storage** via `@aws-sdk/client-s3` & `@aws-sdk/s3-request-presigner` |
| **Database** | **SQLite** via `better-sqlite3` (WAL mode enabled at `data/raven.db`) |
| **Auth** | **JWT** (HTTP-only cookie `raven_token`) + **bcryptjs** password hashing |
| **Excel Parser** | **SheetJS (`xlsx`)** for template generation, parsing, and export |
| **Telemetry** | Browser **`navigator.mediaDevices.getDisplayMedia`** HTML5 API |

---

## 🗂️ Project Structure

```
Three-Eyed Raven/
├── public/
│   ├── logo.png                      # Application branding
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── admin/page.jsx            # Admin control dashboard & workforce carousel
│   │   ├── dashboard/page.jsx        # Employee shift clock-in & task sheet view
│   │   ├── login/page.jsx            # Authentication portal
│   │   ├── settings/page.jsx         # Interval customizer, password change, user creation
│   │   ├── api/
│   │   │   ├── analytics/route.js    # 24h heatmap & team workload metrics
│   │   │   ├── auth/
│   │   │   │   ├── change-password/  # Password update API
│   │   │   │   ├── login/route.js    # JWT login
│   │   │   │   ├── logout/route.js   # Clear session & auto-close active shift
│   │   │   │   └── me/route.js       # Current session check
│   │   │   ├── screenshots/
│   │   │   │   ├── list/route.js     # Rolling 24h captures with presigned S3 URLs
│   │   │   │   ├── request/route.js  # Admin on-demand capture trigger
│   │   │   │   └── upload/route.js   # WebP upload to Supabase S3
│   │   │   ├── session/
│   │   │   │   ├── end/route.js      # Clock out shift
│   │   │   │   ├── heartbeat/route.js# 30s tick & rate-limiting
│   │   │   │   ├── pause/route.js    # Take break / resume shift toggle
│   │   │   │   ├── start/route.js    # Desktop guard & start shift
│   │   │   │   └── stats/route.js    # Shift stopwatch & cumulative metrics
│   │   │   ├── settings/route.js     # Interval config & manual purge
│   │   │   ├── tasks/                # Excel import/export & progress updates
│   │   │   └── users/route.js        # User management & latest screenshot query
│   ├── components/
│   │   ├── Navbar.jsx                # Top bar with theme toggle & logout
│   │   ├── ProductivityAnalytics.jsx # Heatmap & weekly trend charts
│   │   ├── ScreenshotModal.jsx       # Inspector for high-res screenshot view
│   │   ├── SessionTracker.jsx        # Screen capture telemetry & anti-cheat engine
│   │   ├── TaskDataTable.jsx         # Interactive Excel task grid
│   │   └── UserModal.jsx             # Admin user registration dialog
│   ├── context/
│   │   ├── AuthContext.jsx           # Global user state
│   │   └── ThemeContext.jsx          # Dark / Light theme provider
│   └── lib/
│       ├── auth.js                   # JWT sign/verify
│       ├── db.js                     # SQLite schema & self-healing migrations
│       ├── excel.js                  # SheetJS parser
│       └── storage.js                # Supabase S3 client & SigV4 presigned URL resolver
├── scripts/
│   ├── seed.js                       # Idempotent database seeder
│   ├── test-s3.mjs                   # S3 connection test
│   └── test-presigned.mjs            # Presigned URL verification script
├── render.yaml                       # Production Render blueprint configuration
└── package.json
```

---

## 🚀 Quick Start

### 1. Installation

```bash
git clone <repo-url>
cd Three-Eyed-Raven
npm install
```

### 2. Environment Configuration (`.env.local`)

Create `.env.local` in the root directory:

```env
PORT=3000
JWT_SECRET=three-eyed-raven-super-secret-key-2026-secure

# Supabase S3 Storage Credentials
STORAGE_DRIVER=s3
S3_ENDPOINT=https://xmoijbwuizxsgrpnidgg.storage.supabase.co/storage/v1/s3
S3_ACCESS_KEY_ID=0168e890d6b143fe6deb64109ebbfce2
S3_SECRET_ACCESS_KEY=ecbf20cc0659c5e171bc48cbe0ac3cebdfc809dca621dd0a9816ca414053ef52
S3_BUCKET=3-Eyed-Raven
S3_REGION=us-east-1
```

### 3. Seed Database & Run Development Server

```bash
npm run db:seed
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🔑 Default Credentials

| Role | Employee ID / Email | Password | Access Level |
|---|---|---|---|
| **Admin** | `ADMIN01` / `admin@raven.local` | `admin123` | Control Center, Live Workforce Cards, Settings, On-Demand Snapshots |
| **Employee** | `EMP001` (**Akshat**) | `emp123` | Shift Clock-in, Task Management, Screen Time Stats |
| **Employee** | `EMP002` (**Aryan**) | `emp123` | Shift Clock-in, Task Management |
| **Employee** | `EMP003` (**Ayush**) | `emp123` | Shift Clock-in, Task Management |
| **Employee** | `EMP004` (**Harshit**) | `emp123` | Shift Clock-in, Task Management |
| **Employee** | `EMP005` (**Kunal**) | `emp123` | Shift Clock-in, Task Management |
| **Employee** | `EMP006` (**Lakshya**) | `emp123` | Shift Clock-in, Task Management |

---

## 🔐 Key Security & Anti-Cheating Architecture

1. **Entire-Screen Policy (`displaySurface === 'monitor'`)**:
   - `SessionTracker.jsx` evaluates `videoTrack.getSettings().displaySurface`.
   - Clock-in is rejected if an employee attempts to share an individual window or single browser tab.
2. **Auto-Pause on Stream Interruption**:
   - Hooked `videoTrack.onended` auto-pauses the shift timer if screen sharing is stopped via browser controls.
3. **Heartbeat Rate-Limiting & Stale Session Auto-Cleaner**:
   - `POST /api/session/heartbeat` enforces a minimum 10s gap between ticks to prevent script inflation.
   - Sessions missing heartbeats for > 5 minutes are marked `COMPLETED` on session start.
4. **On-Demand Admin Snapshot Signals**:
   - Admins can click **"Capture"** on active employee cards in the Admin Live Workforce section.
   - The signal queues in `pending_screenshot_requests` and triggers an immediate frame capture on the employee's next heartbeat tick.
5. **Private S3 Storage with AWS SigV4 Presigned URLs**:
   - Screenshots stored securely in private Supabase S3 bucket `3-Eyed-Raven`.
   - `resolveScreenshotUrl` dynamically generates 1-hour presigned GET URLs for browser rendering.

---

## 👤 Author & Maintainer

- **Developer**: Kunal ([shreekunal](https://github.com/shreekunal))
- **Project Repository**: [shreekunal/3-Eyed-Raven](https://github.com/shreekunal/3-Eyed-Raven)

---

## 📄 License

Built for workspace productivity, screen audit compliance, and task management.
