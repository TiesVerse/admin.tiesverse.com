# Tiesverse Platform — Developer Reference

Living document. Updated as development progresses.
Last updated: 2026-06-25

---

## Table of Contents
1. [Platform Overview](#1-platform-overview)
2. [Repos & Deployment](#2-repos--deployment)
3. [Database Architecture](#3-database-architecture)
4. [Admin Panel (this repo)](#4-admin-panel-this-repo)
5. [Landing Site (tiesversewebsitev0.2)](#5-landing-site-tiesversewebsitev02)
6. [Career Page (tiesverse-career-page)](#6-career-page-tiesverse-career-page)
7. [Data Flow: Admin → Public Sites](#7-data-flow-admin--public-sites)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Supabase Tables](#9-supabase-tables)
10. [Local Development Quickstart](#10-local-development-quickstart)
11. [Progress Log](#11-progress-log)

---

## 1. Platform Overview

Tiesverse is a youth-led research, media and tech organisation. The platform consists of:

| Property | URL | Purpose |
|---|---|---|
| Landing site | tiesverse.com | Main public face — events, articles, guests, webinars |
| Career page | careers.tiesverse.com | Open positions, applications |
| Webinar platform | webinar.tiesverse.com | Live/recorded webinar listings |
| Admin panel | admin.tiesverse.com | Privileged write access to all three properties |

The admin panel is the **single write surface**. Public sites are **read-only** against their respective databases.

---

## 2. Repos & Deployment

| Repo | Stack | Hosted on |
|---|---|---|
| `Admin-panel-ties` | Django 4 + React/Vite frontend | AWS EC2 |
| `tiesversewebsitev0.2` | React 18 + Vite 8 | Hostinger |
| `tiesverse-career-page` | Node.js + Google Apps Script | Hostinger (backend on AWS EC2) |

All three are separate GitHub repos under the TiesVerse org.

---

## 3. Database Architecture

Each property has its own database. Admin writes to all three; public sites read only their own.

| Property | Database | Provider | Notes |
|---|---|---|---|
| Landing site | PostgreSQL | Supabase | Project: `ppvoqabsdundeyseqrxd` |
| Career page | D1 (SQLite) + R2 + KV | Cloudflare | Workers bindings |
| Webinar platform | libSQL | Turso | Separate DB per env |

### Access pattern

```
Admin panel (Django)
  ├─ Supabase service_role key  →  read/write landing tables (bypasses RLS)
  ├─ Cloudflare API token       →  read/write D1 (career) via REST API
  └─ Turso credentials          →  read/write webinar DB via libSQL protocol

Landing site (React)
  └─ Supabase anon key          →  read-only (RLS: SELECT USING true for most tables)

Career page (Node)
  └─ Cloudflare Workers bindings →  read/write D1 (its own worker, not admin)
```

### Security rules
- `SUPABASE_SERVICE_KEY` lives **only** in the admin backend `.env`. Never in any frontend.
- Supabase anon key is safe to ship in the landing site `.env` (read-only by RLS).
- `backend/env` in the career repo contains real Cloudflare tokens — it is **gitignored** and must never be committed.

---

## 4. Admin Panel (this repo)

### Structure

```
Admin-panel-ties/
├── config/              Django project settings & URLs
├── tiesverse_app/       Landing site CRUD (Events, Articles, YouTube, Workshops, TeamMembers, Guests, Webinars)
├── career_app/          Career CRUD (Positions, Enrollments, Offer Letters)
├── webinar_app/         Webinar CRUD
├── accounts_app/        Auth, JWT, user management, RBAC
├── frontend/            React + Vite admin dashboard
├── docs/                Architecture, routing, UI guidelines, this file
└── requirements.txt
```

### Django apps

| App | Models | Supabase sync? |
|---|---|---|
| `tiesverse_app` | Event, Article, YouTubeVideo, Workshop, TeamMember, Guest, WebinarListing | Yes — via `SupabaseSyncMixin` |
| `career_app` | Position, Enrollment, OfferLetter | No (Cloudflare D1 — not yet wired) |
| `webinar_app` | WebinarEvent, RegistrationForm, CalendarEvent | No (Turso — not yet wired) |
| `accounts_app` | (Django User) | No |

### Supabase sync

Every write through `tiesverse_app` ViewSets mirrors to Supabase automatically:

```python
# tiesverse_app/supabase_sync.py
upsert(instance)   # called on perform_create / perform_update
delete(instance)   # called on perform_destroy
```

- Uses `django_id` (the Django PK cast to integer) as the upsert conflict key on the Supabase side.
- Each model implements `to_supabase_dict()` mapping Django fields → Supabase column names.
- Silently no-ops if `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` are not set (safe for local dev without credentials).

### Authentication

JWT-based. Login at `POST /api/token/`. Access token embeds `permissions[]` array, decoded by the React frontend to gate UI elements. See `docs/ARCHITECTURE.md` for the full auth flow.

---

## 5. Landing Site (tiesversewebsitev0.2)

### Stack
React 18 + Vite 8 + `@supabase/supabase-js ^2.108.2`

### Data model — static vs dynamic

| Category | Data | Source |
|---|---|---|
| **Static** (never changes) | Nav items, footer links, brand copy, team member photos | Bundled in `src/site.js` or `src/assets/` |
| **Dynamic** (admin-managed) | Webinars, Events, Articles, YouTube videos, Workshops, Team members, Guests | Supabase via anon key |

### Live fetch pattern

All dynamic pages use `useLiveData(apiFn, staticFallback)`:

```js
// src/hooks/useLiveData.js
const data = useLiveData(fetchArticles, STATIC_ARTICLES)
// → shows static data immediately, replaces with Supabase data when it arrives
```

If Supabase returns empty / null, the static fallback stays visible.

### Supabase client

```
src/supabaseClient.js   →   createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
src/apiClient.js        →   all fetch functions (fetchEvents, fetchArticles, …)
```

### Pages wired to live data

| Page | Collection | Fallback |
|---|---|---|
| Home | webinars, events, guests | site.js |
| Newsroom | articles | site.js `WORK` array |
| Research | articles (kind = Report/Brief/Analysis) | site.js `REPORTS` array |
| Events | events | site.js `EVENTS` array |
| Webinars | webinars | site.js `WEBINARS` array |
| Guests | guests | site.js `GUESTS` array |
| Careers | open positions (via Node proxy → Cloudflare D1) | empty |

### Team member photos
Kept static in `src/assets/team/` as `.webp` files. Not stored in Supabase or Cloudinary. Revisit if team grows frequently.

---

## 6. Career Page (tiesverse-career-page)

### Stack
Node.js backend + Google Apps Script (TIESVERSE_Master_Backend_v2.gs)

### Databases
- **Cloudflare D1** — open positions, application records
- **Cloudflare R2** — file uploads (CVs, etc.)
- **Cloudflare KV** — session/cache

### Important
- `backend/env` contains real Cloudflare API tokens. **Gitignored. Never commit.**
- The Apps Script file had a syntax error (`{html` stray text in `issueAdminSession_`) — fixed in last session.

---

## 7. Data Flow: Admin → Public Sites

```
Admin staff creates/edits an Event in Django admin dashboard
        │
        ▼
Django ViewSet (EventViewSet)
  └─ SupabaseSyncMixin.perform_create()
        │
        ├─ Saves to SQLite (local Django DB — source of truth for admin)
        │
        └─ supabase_sync.upsert(instance)
              │
              └─ Supabase REST API (service_role key, bypasses RLS)
                    │
                    └─ events table updated with django_id conflict key
                              │
                              ▼
                    tiesverse.com landing site
                    (React fetches via anon key on next page load)
```

The Django SQLite DB is the admin's source of truth. Supabase is the read replica for the public site.

---

## 8. Environment Variables Reference

### Admin panel (`Admin-panel-ties/.env`) — gitignored

```env
# Cloudinary (media storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Django
SECRET_KEY=
DEBUG=True
FRONTEND_URL=
JWT_SECRET=

# Supabase — service key ONLY (never expose to frontend)
SUPABASE_URL=https://ppvoqabsdundeyseqrxd.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_...

# Turso (webinar DB)
TURSO_USER=
TURSO_DB_PASSWORD=

# Cloudflare (career DB)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_D1_DATABASE_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=career-tiesverse
```

### Landing site (`tiesversewebsitev0.2/.env`) — gitignored

```env
VITE_SUPABASE_URL=https://ppvoqabsdundeyseqrxd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...          # read-only, safe to expose
VITE_API_URL=http://localhost:5000           # Node proxy for career positions
```

### Career page (`tiesverse-career-page/backend/env`) — gitignored, never commit

```env
# Cloudflare D1 / R2 / KV credentials — get from team lead
```

---

## 9. Supabase Tables

Project URL: `https://ppvoqabsdundeyseqrxd.supabase.co`

All tables have RLS enabled. Public SELECT is open via `FOR SELECT USING (true)`.
Admin writes via service_role key (bypasses RLS). `django_id` is the upsert conflict key.

| Table | Key columns | Notes |
|---|---|---|
| `webinars` | title, speaker, date, status, cover_url, registration_link | status: `upcoming` \| `past` |
| `events` | title, date, city, cover_url, register_url, past, flagship | `past=true` for past events |
| `articles` | slug (unique), title, dek, cat, topic, kind, cover_url, published, featured | RLS: `published = true` only |
| `youtube_videos` | title, video_id, thumbnail_url | 4 placeholder rows with `REPLACE_WITH_REAL_ID` |
| `workshops` | title, description, date, register_url, status | |
| `team_members` | name, role, photo_url, bio, is_founder, display_order | |
| `guests` | name, role, org, photo_url, featured | |

Seed SQL: `tiesversewebsitev0.2/supabase/migrations/002_seed_initial_data.sql`
`django_id` column: `tiesversewebsitev0.2/supabase/migrations/003_add_django_id.sql`

---

## 10. Local Development Quickstart

### Admin panel

```bash
cd Admin-panel-ties
source venv/bin/activate
pip install -r requirements.txt       # if fresh
python manage.py migrate
python manage.py runserver            # API on :8000

# In another terminal:
cd frontend && npm install && npm run dev   # dashboard on :5173
```

### Landing site

```bash
cd tiesversewebsitev0.2
npm install
npm run dev      # :5173
# Needs .env with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

### Career page

```bash
cd tiesverse-career-page
npm install
# Needs backend/env with Cloudflare credentials
node backend/server.js   # proxy on :5000
```

---

## 11. Progress Log

### 2026-06-25

**Landing site (tiesversewebsitev0.2)**
- Connected to new Supabase project (`ppvoqabsdundeyseqrxd`)
- Created 7 Supabase tables: webinars, events, articles, youtube_videos, workshops, team_members, guests
- Seeded all tables from `site.js` static data
- Added `django_id` column (unique int) to 6 tables for admin upsert deduplication
- Wired all dynamic pages to live Supabase fetch with static fallback: Home, Newsroom, Research, Events, Webinars, Guests
- All 6 pages verified working (Playwright): all Supabase calls return 200, no JS errors
- YouTube video IDs: 4 placeholder rows — to be updated from admin page
- Team member photos: kept static in `src/assets/team/` (not in Supabase)

**Admin panel (Admin-panel-ties)**
- Added `to_supabase_dict()` to all 7 tiesverse_app models mapping Django fields → Supabase columns
- Fixed `supabase_sync.py` TABLE_MAP to include `WebinarListing → webinars`
- Wired `WebinarListingViewSet` to `SupabaseSyncMixin`
- Fixed views.py: removed `.filter(published=True)` on Article (field doesn't exist yet), `.order_by('display_order')` on TeamMember (field doesn't exist yet)
- Updated `.env`: replaced old Supabase project (`aayulkhwmmingelsdbgw`) with new one (`ppvoqabsdundeyseqrxd`)
- Django system check: 0 issues

**Career page (tiesverse-career-page)**
- Fixed Apps Script syntax error in `issueAdminSession_`
- Added `backend/env` to `.gitignore` (Cloudflare tokens — do not commit)

**Pending**
- [ ] Run Supabase migration SQL in dashboard (tables created manually — confirm seed SQL was run)
- [ ] Update 4 YouTube placeholder `video_id` values from admin page
- [ ] Fill guest/team `photo_url` fields from admin page
- [ ] Admin panel frontend: review and wire up React dashboard pages (TiesverseDashboard, EventsManagement, etc.)
- [ ] Career page: review and continue development
- [ ] Webinar app: wire admin to Turso DB
- [ ] Career app: wire admin to Cloudflare D1
