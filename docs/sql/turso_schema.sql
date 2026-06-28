-- Hosted Turso/libSQL schema for registrations and coupons.
-- Safe to run repeatedly except ALTER TABLE statements, which are only needed
-- for older deployments and should be skipped when a column already exists.

create table if not exists registrations (
  id integer primary key autoincrement,
  event_id text,
  event_title text not null,
  event_type text default 'event',
  event_date text,
  name text not null,
  email text not null,
  phone text,
  city text,
  registered_at text not null,
  email_sent integer default 0,
  payment_required integer default 0,
  amount integer default 0,
  razorpay_order_id text,
  razorpay_payment_id text,
  payment_status text default 'free',
  webinar_certificate_id text,
  coupon_code text,
  discount_amount integer default 0,
  final_amount integer default 0,
  coupon_redeemed integer default 0
);

create index if not exists idx_registrations_event
  on registrations(event_type, event_id);

create index if not exists idx_registrations_registered_at
  on registrations(registered_at desc);

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

create table if not exists certificate_records (
  id text primary key,
  certificate_id text not null unique,
  source_type text not null,
  source_ref text not null,
  person_name text not null,
  person_email text not null default '',
  subject_title text not null,
  template_id text not null,
  template_name text not null,
  data_json text not null default '{}',
  email_status text not null default 'not_sent',
  created_at text not null,
  updated_at text not null,
  unique(source_type, source_ref, template_id)
);

create index if not exists idx_certificate_records_created
  on certificate_records(created_at desc);

create index if not exists idx_certificate_records_template
  on certificate_records(template_id, source_type);

-- Upgrade statements for an older registrations table:
-- alter table registrations add column event_date text;
-- alter table registrations add column webinar_certificate_id text;
-- alter table registrations add column coupon_code text;
-- alter table registrations add column discount_amount integer default 0;
-- alter table registrations add column final_amount integer default 0;
-- alter table registrations add column coupon_redeemed integer default 0;
