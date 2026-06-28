-- Cloudflare D1/libSQL schema for the hosted career system.
-- Safe to run repeatedly.

create table if not exists candidates (
  id integer primary key autoincrement,
  timestamp text not null,
  department text not null default '',
  roles text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  phone text not null default '',
  city text not null default '',
  linkedin text not null default '',
  portfolio text not null default '',
  why_join text not null default '',
  answers text not null default '',
  resume_name text not null default '',
  resume_key text not null default '',
  resume_content_type text not null default '',
  resume_data text not null default '',
  interview_status text not null default 'Pending Setup',
  interviewer text not null default '',
  rating integer not null default 0,
  final_decision text not null default 'Under Review',
  request_id text not null unique,
  created_at text not null,
  updated_at text not null,
  offer_certificate_id text
);

create index if not exists idx_candidates_request_id on candidates(request_id);
create index if not exists idx_candidates_email on candidates(email);
create index if not exists idx_candidates_department_created
  on candidates(department, created_at desc);

create table if not exists form_gates (
  key text primary key,
  is_open integer not null default 1,
  updated_at text not null
);

create table if not exists admin_sessions (
  token text primary key,
  expires_at text not null,
  created_at text not null
);

create index if not exists idx_admin_sessions_expires_at
  on admin_sessions(expires_at);

-- Upgrade statement for older candidate databases:
-- alter table candidates add column offer_certificate_id text;

