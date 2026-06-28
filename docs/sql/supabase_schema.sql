-- Supabase PostgreSQL schema for Tiesverse public content.
-- Safe to run repeatedly in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  django_id bigint,
  slug text not null unique,
  title text not null,
  dek text not null default '',
  cat text not null default '',
  topic text not null default '',
  kind text not null default 'Article',
  date text not null default '',
  read_time text not null default '',
  cover_url text not null default '',
  featured boolean not null default false,
  published boolean not null default true
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  django_id bigint,
  title text not null,
  category text not null default '',
  city text not null default '',
  venue text not null default '',
  date text not null default '',
  time text not null default '',
  host text not null default '',
  price integer not null default 0,
  orig_price integer,
  capacity integer,
  attended text not null default '',
  note text not null default '',
  flagship boolean not null default false,
  past boolean not null default false,
  cover_url text not null default '',
  register_url text not null default ''
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  django_id bigint,
  name text not null,
  role text not null,
  org text not null default '',
  photo_url text not null default '',
  quote text not null default '',
  featured boolean not null default false
);

create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  django_id bigint,
  kind text not null default 'workshop',
  title text not null,
  description text not null default '',
  date text not null default '',
  time_tz text not null default '',
  host text not null default '',
  host_image_url text not null default '',
  price integer not null default 0,
  cover_url text not null default '',
  register_url text not null default '',
  status text not null default 'upcoming'
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  django_id bigint,
  name text not null,
  role text not null,
  bio text not null default '',
  photo_url text not null default '',
  department text not null default '',
  is_founder boolean not null default false,
  display_order integer not null default 0
);

create table if not exists public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  django_id bigint,
  title text not null,
  video_id text not null,
  thumbnail_url text not null default '',
  published_at text not null default '',
  category text not null default ''
);

create table if not exists public.webinars (
  id uuid primary key default gen_random_uuid(),
  django_id bigint,
  title text not null,
  speaker text not null default '',
  org text not null default '',
  date text not null default '',
  time_tz text not null default '',
  cover_url text not null default '',
  registration_link text not null default '',
  status text not null default 'upcoming',
  kind text not null default 'webinar'
);

-- Required upgrade for the currently deployed workshops table.
alter table public.workshops
  add column if not exists kind text not null default 'workshop',
  add column if not exists host_image_url text not null default '',
  add column if not exists price integer not null default 0;

update public.workshops
set kind = 'workshop'
where kind is null or btrim(kind) = '';

-- Django SupabaseSyncMixin uses ON CONFLICT (django_id).
-- PostgreSQL unique indexes already allow multiple NULL values.
create unique index if not exists articles_django_id_unique on public.articles (django_id);
create unique index if not exists events_django_id_unique on public.events (django_id);
create unique index if not exists guests_django_id_unique on public.guests (django_id);
drop index if exists public.workshops_django_id_unique;
create unique index workshops_django_id_unique on public.workshops (django_id);
create unique index if not exists team_members_django_id_unique on public.team_members (django_id);
create unique index if not exists youtube_videos_django_id_unique on public.youtube_videos (django_id);
create unique index if not exists webinars_django_id_unique on public.webinars (django_id);
