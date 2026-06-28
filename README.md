# Central Admin Control Center — Tiesverse

**🚨 CRITICAL SETUP UPDATES (Read before running locally) 🚨**
1. **Multi-Database Routing:** The project implements decoupled database routing (`config/routers.py`). Core authentication & RBAC (`default`) map to Supabase PostgreSQL (simulated via `supabase_db.sqlite3` locally), while portal content (`turso_db`) maps to Turso SQLite (`turso_db.sqlite3`).
2. **Cloudflare ATS & Resume Storage:** The Career portal connects to serverless edge databases (Cloudflare D1) for candidate applications and Cloudflare R2 object storage for resume PDFs. Ensure your `.env` contains valid Cloudflare API tokens.
3. **Frontend Dependencies:** The React SPA requires packages for PDF report generation (`jspdf`, `jspdf-autotable`), modal systems, and Lucide icons. Run `npm install` inside `frontend/` before starting the server.

---

## Documentation & Engineering Reports

For detailed High-Level Design (HLD), Low-Level Design (LLD), and complete implementation breakdowns, please refer to the documents in our `docs/` directory:
- 📖 **[Satyam's End Report](file:///d:/Admin-panel-ties/docs/SATYAMS_END_REPORT.md)**: Comprehensive architectural review covering multi-database routing, custom JWT claims, RBAC matrix grids, Cloudflare ATS integration, and portal deep-dives.
- 📐 **[Architecture Overview](file:///d:/Admin-panel-ties/docs/ARCHITECTURE.md)**: HLD & LLD diagramming of the authentication and authorization workflows.
- 🎨 **[UI Guidelines](file:///d:/Admin-panel-ties/docs/ui-guidelines.md)**: CSS variable design system, `color-mix()` rules, and dark-mode tokens.

---

## Overview & Managed Portals

This repository houses the centralized Admin Control Center for Tiesverse, bypassing default Django Admin to deliver a sleek, unified SPA dashboard managing four distinct portals:
1. **Tiesverse Portal**: Public content lifecycle management (Events, Keynote Speakers, Registrations, Articles, YouTube Videos, Workshops, Team Members, and Guests).
2. **Career Portal**: Internal position tracking, student enrollments, offer letter generation, Cloudflare ATS candidate roster management, PDF export engine, and application Form Gate locking.
3. **Webinar Portal**: Upcoming livestream management, registration form tracking, and calendar synchronization.
4. **Accounts Portal**: Authentication flows, Superuser staff account creation, granular Role-Based Access Control (RBAC) permission grid assignment, and self-service theme customization.

---

## Architecture & Tech Stack

- **Backend:** Django 6.0 REST Framework (DRF) serving stateless JSON APIs via 4 domain apps (`accounts_app`, `tiesverse_app`, `career_app`, `webinar_app`).
- **Frontend:** React + Vite SPA featuring responsive CSS grid layouts, glassmorphism modals, and Lucide React icons.
- **Database Routing:** Automatic segregation of RBAC/accounts data (`default`) from portal content streams (`turso_db`).
- **Edge Serverless:** Cloudflare D1 (SQL) and Cloudflare R2 (Object Storage) integration (`career_app/providers.py`).
- **Authentication:** Custom JWT tokens (`djangorestframework-simplejwt`) embedded with user roles and explicit permission codename claims (`permissions[]`).

---

## Standalone Career Site

In addition to the central dashboard, this repository includes the standalone public-facing Career Web Application located in `temp_main_site_of_carrer/tiesverse-career1/`. It features dedicated portals (`tech-portal.html`, `content-portal.html`, `hr-portal.html`, `youtube-portal.html`) integrated directly with backend Form Gate locking guards.

---

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+

### First-time Setup
```bash
# Create the Python virtual environment
python -m venv venv

# Install backend, frontend, and root launcher dependencies
.\venv\Scripts\python.exe -m pip install -r requirements.txt
npm install
npm --prefix frontend install

# Apply database migrations across routed databases
python manage.py migrate
python manage.py migrate --database=turso_db

# Optional: populate Departments, Team, Events, and Speakers
python seed_data.py

# Create the administrator account
python manage.py createsuperuser
```

### Run Everything

From the repository root, start the Django backend and React frontend together:

```bash
npm run dev
```

The backend REST API normally runs at `http://127.0.0.1:8000/` and the SPA
dashboard runs at `http://localhost:5173/`. If port 8000 is already occupied,
the launcher automatically selects the next free port and configures the
frontend to use it. Press `Ctrl+C` once to stop both services.

For isolated debugging, use `npm run dev:backend` or
`npm run dev:frontend` from the repository root.

---

## Logging In & Administration

Open `http://localhost:5173/` in your browser. Log in using your `createsuperuser` credentials. 
- **Superusers**: Have full access to the **Users & Permissions** portal to create staff credentials and toggle granular view/add/change/delete model permissions via the interactive matrix grid.
- **Staff Members**: Will only see navigation items and action buttons corresponding to their explicitly assigned permissions.
