# Hosted database updates

This document is the complete database rollout checklist for the Webinar Portal
split introduced on 2026-06-28.

The admin now treats these as two different resources:

- **Webinars & Workshops**: public content listings stored locally by Django and
  mirrored to the hosted Supabase `workshops` table.
- **Registrations**: attendee submissions read from the hosted Turso
  `registrations` table.

Host images are uploaded to Cloudinary. Databases store only the resulting
`https://...` URL; no image binary is stored in Supabase, Turso, or SQLite.

## Live connection audit — 2026-06-28

| Data source | Connection | Live schema | Result |
| --- | --- | --- | --- |
| Supabase | Connected | `articles`, `events`, `guests`, `team_members`, `youtube_videos`, and `webinars` match | Ready |
| Supabase `workshops` | Connected | Missing `kind`, `host_image_url`, and `price` | Run the SQL in section 1 |
| Turso | Connected | `registrations`, `coupons`, and `certificate_records`, including certificate/coupon indexes | Ready |
| Cloudflare D1 | Connected | `candidates`, `form_gates`, and `admin_sessions` match | Ready |
| Django accounts/settings | Local SQLite | `supabase_db.sqlite3` | Not hosted |
| Django content/career ORM | Local SQLite | `turso_db.sqlite3` | Not hosted |
| Certificate record metadata | Hosted Turso | `certificate_records` stores IDs, source references, recipient details, and generation field JSON | Ready |

Live row counts during the audit:

- Supabase: 12 articles, 7 events, 12 guests, 3 workshops, 5 team
  members, 4 YouTube videos, and 11 webinar listings.
- Turso: 4 registrations and 0 coupon definitions.
- Cloudflare D1: 45 candidates and 17 form-gate records.

Complete recovery/bootstrap SQL files:

- [Supabase schema](sql/supabase_schema.sql)
- [Turso schema](sql/turso_schema.sql)
- [Cloudflare D1 schema](sql/cloudflare_d1_schema.sql)

## 1. Supabase: `public.workshops`

Run this once in the Supabase SQL editor before creating or editing a listing
from the deployed admin:

```sql
alter table public.workshops
  add column if not exists kind text default 'workshop',
  add column if not exists host_image_url text,
  add column if not exists price integer default 0;

update public.workshops
set kind = 'workshop'
where kind is null or btrim(kind) = '';

alter table public.workshops
  alter column kind set default 'workshop';

drop index if exists public.workshops_django_id_unique;
create unique index workshops_django_id_unique
  on public.workshops (django_id);
```

Optional validation constraint, after checking that existing values are clean:

```sql
alter table public.workshops
  drop constraint if exists workshops_kind_check;

alter table public.workshops
  add constraint workshops_kind_check
  check (kind in ('webinar', 'workshop'));
```

Required hosted columns after the update:

| Column | Type | Purpose |
| --- | --- | --- |
| `django_id` | integer/bigint | Stable sync key used by admin upserts |
| `kind` | text | `webinar` or `workshop` |
| `title` | text | Listing title |
| `description` | text | Listing description |
| `date` | text | Display date |
| `time_tz` | text | Display time and timezone |
| `host` | text | Host name |
| `host_image_url` | text | Cloudinary URL for host photo |
| `price` | integer | Price in INR; `0` means free |
| `cover_url` | text | Cloudinary URL for cover image |
| `register_url` | text | Public registration link |
| `status` | text | `upcoming` or `past` |

Verification:

```sql
select django_id, kind, title, host, host_image_url, status
from public.workshops
order by django_id desc nulls last
limit 20;
```

No new Supabase table is needed. The existing `workshops` table remains the
public-content source to avoid breaking the landing site.

## 2. Turso: `registrations`

The backend runs `setup_tables()` before registration reads and writes. That
method creates missing columns and indexes automatically. Existing hosted
databases need one new column:

```sql
alter table registrations add column event_date text;
```

SQLite/Turso does not consistently support `ADD COLUMN IF NOT EXISTS`. If the
column already exists, skip the statement. The backend safely catches that
duplicate-column condition.

The backend also creates these indexes:

```sql
create index if not exists idx_registrations_event
  on registrations(event_type, event_id);

create index if not exists idx_registrations_registered_at
  on registrations(registered_at desc);
```

Complete hosted registration schema expected by the current backend:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | integer primary key | Registration ID |
| `event_id` | text | Public webinar/event identifier |
| `event_title` | text | Display title |
| `event_type` | text | `webinar` or `event` |
| `event_date` | text | Date supplied by the public registration flow |
| `name` | text | Attendee name |
| `email` | text | Attendee email |
| `phone` | text | Attendee phone |
| `city` | text | Attendee city |
| `registered_at` | text | Submission timestamp |
| `email_sent` | integer | Confirmation-email flag |
| `payment_required` | integer | Paid-registration flag |
| `amount` | integer | Amount in paise |
| `razorpay_order_id` | text | Razorpay order |
| `razorpay_payment_id` | text | Razorpay payment |
| `payment_status` | text | `free`, `pending`, `paid`, or `failed` |
| `coupon_code` | text | Applied coupon code |
| `discount_amount` | integer | Discount in paise |
| `final_amount` | integer | Payable amount in paise |
| `coupon_redeemed` | integer | Coupon slot reservation/redemption flag |
| `webinar_certificate_id` | text | Generated certificate ID, when present |

The certificate workflow may add `webinar_certificate_id` automatically, but it
is part of the complete hosted schema and should be retained.

The backend automatically adds the coupon columns. Equivalent manual SQL:

```sql
alter table registrations add column coupon_code text;
alter table registrations add column discount_amount integer default 0;
alter table registrations add column final_amount integer default 0;
alter table registrations add column coupon_redeemed integer default 0;
```

Skip statements for columns that already exist.

Verification:

```sql
pragma table_info(registrations);

select id, event_title, event_type, event_date, name, email,
       payment_status, registered_at
from registrations
order by registered_at desc
limit 20;
```

## 3. Turso: `coupons`

Coupon definitions live in hosted Turso so payment validation and registration
limits use the same data source:

```sql
create table if not exists coupons (
  id integer primary key autoincrement,
  code text not null unique collate nocase,
  event_id text not null,
  event_title text not null,
  event_type text not null,
  discount_type text not null default 'percent',
  discount_value real not null,
  starts_at text,
  expires_at text,
  max_redemptions integer,
  redeemed_count integer not null default 0,
  active integer not null default 1,
  created_at text not null,
  updated_at text not null
);

create index if not exists idx_coupons_target
  on coupons(event_type, event_id, active);
```

- `starts_at` and `expires_at` are optional UTC ISO-8601 timestamps.
- `max_redemptions=NULL` means unlimited.
- `active=0` pauses the coupon immediately.
- A paid order reserves one use; a `payment.failed` webhook releases it.
- A 100% discount completes registration without opening Razorpay.

## 4. Django content mirror

The Django `EventRegistration` model (database table
`event_registrations`) now has:

- `kind`, defaulting to `workshop`
- `host_image_url`, optional
- `price`, defaulting to `0`

Apply the current `tiesverse_app` migrations to its database:

```powershell
venv\Scripts\python.exe manage.py migrate tiesverse_app --database=turso_db
```

Despite the connection alias, `turso_db` is currently the Django SQLite content
mirror configured in `config/settings.py`; it is not the hosted Turso HTTP
database.

If the deployed backend uses a persistent replacement for that alias, run the
same Django migration against that deployment database before releasing the
frontend.

## 5. Coupon checkout API contract

Validate a code:

```http
POST /api/webinar/validate-coupon/

{
  "code": "EARLY10",
  "event_id": "geopolitics-live-the-delhi-salon",
  "event_title": "Geopolitics Live: The Delhi Salon",
  "event_type": "event",
  "amount": 499
}
```

Validation returns `discount_amount`, `final_amount`, and `remaining_uses`.
Then pass `coupon_code` with the same event data to
`POST /api/webinar/create-order/`.

The backend resolves the authoritative price from the matching Supabase
`events` or `workshops` record. The browser-supplied `amount` is never trusted
for payment calculation.

Partial discounts return a Razorpay order for the discounted total. A 100%
discount returns:

```json
{
  "status": "registered",
  "free": true,
  "coupon_code": "FULLACCESS",
  "final_amount": "0.00"
}
```

The public site must treat this as completed registration and skip Razorpay.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET/POST | `/api/webinar/coupons/` | List or create coupons |
| PATCH/DELETE | `/api/webinar/coupons/{id}/` | Edit, pause/resume, or delete |
| POST | `/api/webinar/validate-coupon/` | Public target/time/limit validation |

## 6. Cloudinary

No database migration is required. The deployed backend needs working
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET` environment variables. The admin stores the returned
secure URL in `host_image_url`.

## 7. Release order

1. Apply the Supabase `workshops` changes, including `price`.
2. Deploy the backend and run the Django migration.
3. Start the backend once to run the idempotent Turso coupon schema setup.
4. Deploy the frontend.
5. Give a webinar/workshop a non-zero price and create a coupon for it.
6. Submit one webinar and one event registration and verify both appear under
   **Webinar Portal → Registrations**.

## 8. Route and data map

| Admin route | Data source | Purpose |
| --- | --- | --- |
| `/webinar/webinars-workshops` | Django + Supabase `workshops` mirror | Public listing management |
| `/webinar/registrations` | Hosted Turso `registrations` | Attendee registration records |
| `/webinar/coupons` | Hosted Turso `coupons` | Event-specific coupon management |
| `/webinar/event_registrations` | Django + Supabase `workshops` mirror | Legacy alias for Webinars & Workshops |

## 9. Local SQLite persistence gap

The following records are not currently stored in any hosted database:

- Django users, groups, permissions, sessions, and user profiles
- Site settings
- Position tracker records
- Django ORM offer-letter records
- Django `WebinarEvent` and `CalendarEvent` records
- The local content mirror used before Supabase synchronization

The remaining records are split between `supabase_db.sqlite3` and
`turso_db.sqlite3`. This is safe
for local development, but a deployment without a persistent disk can lose
them on restart/redeploy.

Do not create these tables manually in Supabase and assume Django will use
them. Moving them requires:

1. A hosted PostgreSQL connection string/database password.
2. Updating `DATABASES` and simplifying/removing `config.routers.AppRouter`.
3. Installing the PostgreSQL Django driver.
4. Running Django migrations against the hosted database:

```powershell
venv\Scripts\python.exe manage.py migrate
```

Django migrations should create the auth, permissions, session, profile,
settings, certificate, position, offer-letter, and calendar tables. Handwritten
SQL for Django-managed tables would drift from migration state and is not
recommended.
