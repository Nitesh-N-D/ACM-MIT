-- NEXUS · ACM MIT — initial schema, row level security and storage.
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
-- Nothing here grants anyone administrator access: roles are only ever written
-- by a Super Admin (RLS) or by the server using the service-role key.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- roles ----
create type public.app_role as enum ('super_admin', 'admin', 'event_manager', 'content_editor', 'member');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '' check (char_length(full_name) <= 120),
  department text not null default '' check (char_length(department) <= 120),
  year_of_study text not null default '' check (char_length(year_of_study) <= 40),
  bio text not null default '' check (char_length(bio) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- SECURITY DEFINER so policies can consult user_roles without recursing into
-- its own RLS. search_path is pinned.
create or replace function public.has_role(roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = any (roles));
$$;

create or replace function public.is_admin() returns boolean language sql stable set search_path = public as $$
  select public.has_role(array['super_admin', 'admin']::public.app_role[]);
$$;
create or replace function public.can_content() returns boolean language sql stable set search_path = public as $$
  select public.has_role(array['super_admin', 'admin', 'content_editor']::public.app_role[]);
$$;
create or replace function public.can_events() returns boolean language sql stable set search_path = public as $$
  select public.has_role(array['super_admin', 'admin', 'event_manager']::public.app_role[]);
$$;
create or replace function public.is_staff() returns boolean language sql stable set search_path = public as $$
  select public.has_role(array['super_admin', 'admin', 'event_manager', 'content_editor']::public.app_role[]);
$$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- A profile row for every new account. Never assigns a staff role.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'member') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- The e-mail column mirrors auth.users and cannot be edited by the member.
create or replace function public.protect_profile() returns trigger language plpgsql as $$
begin
  new.id = old.id;
  new.email = old.email;
  new.created_at = old.created_at;
  new.updated_at = now();
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

-- -------------------------------------------------------------- content ----
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title text not null check (char_length(title) between 1 and 160),
  summary text not null default '' check (char_length(summary) <= 400),
  description text not null default '' check (char_length(description) <= 12000),
  category text not null default 'workshop' check (category in ('hackathon', 'workshop', 'competition', 'seminar', 'guest-lecture', 'bootcamp', 'conference', 'other')),
  venue text not null default '' check (char_length(venue) <= 200),
  starts_at timestamptz,
  ends_at timestamptz,
  registration_deadline timestamptz,
  registration_open boolean not null default false,
  capacity integer check (capacity is null or capacity between 1 and 100000),
  banner_path text,
  poster_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'waitlisted', 'cancelled')),
  attended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index event_registrations_user on public.event_registrations (user_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title text not null check (char_length(title) between 1 and 160),
  summary text not null default '' check (char_length(summary) <= 400),
  description text not null default '' check (char_length(description) <= 12000),
  team text not null default '' check (char_length(team) <= 400),
  tags text[] not null default '{}',
  repo_url text check (repo_url is null or repo_url ~ '^https?://'),
  demo_url text check (demo_url is null or demo_url ~ '^https?://'),
  image_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 160),
  summary text not null default '' check (char_length(summary) <= 400),
  description text not null default '' check (char_length(description) <= 12000),
  team text not null default '' check (char_length(team) <= 400),
  repo_url text check (repo_url is null or repo_url ~ '^https?://'),
  demo_url text check (demo_url is null or demo_url ~ '^https?://'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text not null default '' check (char_length(review_note) <= 1000),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  project_id uuid references public.projects (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 12000),
  pinned boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  event_id uuid references public.events (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every uploaded image is a gallery_items row: this table is the media library.
create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references public.gallery_albums (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  storage_path text not null unique,
  kind text not null default 'photo' check (kind in ('photo', 'banner', 'poster', 'highlight', 'recap', 'group', 'portrait', 'project', 'other')),
  caption text not null default '' check (char_length(caption) <= 300),
  description text not null default '' check (char_length(description) <= 2000),
  alt text not null default '' check (char_length(alt) <= 300),
  width integer,
  height integer,
  featured boolean not null default false,
  -- People appear in most event photographs: nothing is shown publicly until
  -- an editor confirms permission to publish.
  consent_confirmed boolean not null default false,
  sort_order integer not null default 0,
  uploaded_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gallery_items_album on public.gallery_items (album_id);
create index gallery_items_event on public.gallery_items (event_id);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  position text not null default '' check (char_length(position) <= 160),
  group_kind text not null default 'committee' check (group_kind in ('committee', 'core', 'volunteer', 'alumni', 'faculty', 'member')),
  tenure text not null default '' check (char_length(tenure) <= 60),
  bio text not null default '' check (char_length(bio) <= 2000),
  image_path text,
  linkedin_url text check (linkedin_url is null or linkedin_url ~ '^https://'),
  github_url text check (github_url is null or github_url ~ '^https://'),
  website_url text check (website_url is null or website_url ~ '^https://'),
  sort_order integer not null default 0,
  active boolean not null default true,
  visible boolean not null default false,
  consent_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A person cannot be published, and a photograph cannot be attached,
  -- without recorded consent.
  constraint team_consent_before_publishing check (consent_confirmed or (not visible and image_path is null))
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 4000),
  category text not null default '' check (char_length(category) <= 80),
  achieved_on date,
  image_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  summary text not null default '' check (char_length(summary) <= 2000),
  kind text not null default 'resource' check (kind in ('workshop', 'path', 'resource')),
  realm text not null default 'general' check (realm in ('general', 'intelligence', 'technology')),
  level text not null default '' check (char_length(level) <= 40),
  url text check (url is null or url ~ '^https?://'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  department text not null default '' check (char_length(department) <= 120),
  year_of_study text not null default '' check (char_length(year_of_study) <= 40),
  motivation text not null default '' check (char_length(motivation) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text not null default '' check (char_length(review_note) <= 1000),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  subject text not null default '' check (char_length(subject) <= 200),
  message text not null check (char_length(message) between 1 and 4000),
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now()
);

create table public.website_settings (
  key text primary key check (key in ('home', 'districts', 'site', 'experience')),
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.admin_activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id text,
  summary text not null default '',
  created_at timestamptz not null default now()
);
create index admin_activity_logs_created on public.admin_activity_logs (created_at desc);

-- updated_at
do $$
declare t text;
begin
  foreach t in array array['events', 'event_registrations', 'projects', 'announcements', 'gallery_albums', 'gallery_items', 'team_members', 'achievements', 'learning_resources']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t || '_touch', t);
  end loop;
end $$;

-- ------------------------------------------------------------ audit log ----
-- Written by triggers, so an entry cannot be skipped or forged by the client.
-- Only names/titles are recorded: never passwords, tokens or message bodies.
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  label text := coalesce(rec ->> 'title', rec ->> 'name', rec ->> 'full_name', rec ->> 'key', rec ->> 'role', rec ->> 'storage_path', '');
begin
  if tg_op = 'UPDATE' and rec ? 'status' and (to_jsonb(old) ->> 'status') is distinct from (rec ->> 'status') then
    label := label || ' (status: ' || (to_jsonb(old) ->> 'status') || ' -> ' || (rec ->> 'status') || ')';
  end if;
  insert into public.admin_activity_logs (actor_id, actor_email, action, entity, entity_id, summary)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', case when auth.uid() is null then 'system' end),
    lower(tg_op), tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'key', rec ->> 'user_id'),
    left(label, 300)
  );
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['events', 'projects', 'announcements', 'gallery_albums', 'gallery_items', 'team_members', 'achievements', 'learning_resources', 'website_settings', 'user_roles']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row()', t || '_audit', t);
  end loop;
end $$;

-- Reviews and attendance are staff updates on rows created by the public.
create trigger event_registrations_audit after update or delete on public.event_registrations
  for each row execute function public.audit_row();
create trigger project_submissions_audit after update or delete on public.project_submissions
  for each row execute function public.audit_row();
create trigger membership_applications_audit after update or delete on public.membership_applications
  for each row execute function public.audit_row();
create trigger contact_submissions_audit after update or delete on public.contact_submissions
  for each row execute function public.audit_row();

-- For staff actions that are not row changes (exports).
create or replace function public.log_admin_action(p_action text, p_entity text, p_summary text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'not authorised';
  end if;
  insert into public.admin_activity_logs (actor_id, actor_email, action, entity, summary)
  values (auth.uid(), auth.jwt() ->> 'email', left(p_action, 40), left(p_entity, 60), left(p_summary, 300));
end $$;

-- -------------------------------------------------------- registrations ----
-- Registration goes through this function so capacity and deadlines are
-- checked atomically; members cannot insert rows directly.
create or replace function public.register_for_event(p_event uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  ev public.events;
  taken integer;
  next_status text;
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  select * into ev from public.events where id = p_event for update;
  if not found or ev.status <> 'published' then
    raise exception 'event not found';
  end if;
  if not ev.registration_open then
    raise exception 'registration is closed';
  end if;
  if ev.registration_deadline is not null and now() > ev.registration_deadline then
    raise exception 'registration deadline has passed';
  end if;
  select count(*) into taken from public.event_registrations
    where event_id = p_event and status = 'registered' and user_id <> auth.uid();
  next_status := case when ev.capacity is not null and taken >= ev.capacity then 'waitlisted' else 'registered' end;
  insert into public.event_registrations (event_id, user_id, status)
  values (p_event, auth.uid(), next_status)
  on conflict (event_id, user_id) do update set status = excluded.status
    where public.event_registrations.status = 'cancelled';
  return (select status from public.event_registrations where event_id = p_event and user_id = auth.uid());
end $$;

create or replace function public.cancel_registration(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.event_registrations set status = 'cancelled'
  where event_id = p_event and user_id = auth.uid();
end $$;

-- Public head-count without exposing who registered.
create or replace function public.event_registration_count(p_event uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.event_registrations r
  join public.events e on e.id = r.event_id
  where r.event_id = p_event and r.status = 'registered' and e.status = 'published';
$$;

revoke all on function public.register_for_event(uuid), public.cancel_registration(uuid), public.log_admin_action(text, text, text) from public, anon;
grant execute on function public.register_for_event(uuid), public.cancel_registration(uuid), public.log_admin_action(text, text, text) to authenticated;

-- ------------------------------------------------------------------ RLS ----
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.projects enable row level security;
alter table public.project_submissions enable row level security;
alter table public.announcements enable row level security;
alter table public.gallery_albums enable row level security;
alter table public.gallery_items enable row level security;
alter table public.team_members enable row level security;
alter table public.achievements enable row level security;
alter table public.learning_resources enable row level security;
alter table public.membership_applications enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.website_settings enable row level security;
alter table public.admin_activity_logs enable row level security;

-- profiles
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin() or public.can_events());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- user_roles: only a Super Admin changes roles; nobody can change their own.
create policy roles_read on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy roles_grant on public.user_roles for insert to authenticated
  with check (public.has_role(array['super_admin']::public.app_role[]) and user_id <> auth.uid());
create policy roles_revoke on public.user_roles for delete to authenticated
  using (public.has_role(array['super_admin']::public.app_role[]) and user_id <> auth.uid());

-- events
create policy events_read on public.events for select using (status = 'published' or public.can_events() or public.can_content());
create policy events_write on public.events for all to authenticated using (public.can_events()) with check (public.can_events());

-- registrations: read your own; staff read and manage; inserts via RPC only.
create policy registrations_read on public.event_registrations for select to authenticated using (user_id = auth.uid() or public.can_events());
create policy registrations_manage on public.event_registrations for update to authenticated using (public.can_events()) with check (public.can_events());
create policy registrations_delete on public.event_registrations for delete to authenticated using (public.is_admin());

-- published content is public; editors manage it
create policy projects_read on public.projects for select using (status = 'published' or public.can_content());
create policy projects_write on public.projects for all to authenticated using (public.can_content()) with check (public.can_content());
create policy announcements_read on public.announcements for select using (status = 'published' or public.can_content());
create policy announcements_write on public.announcements for all to authenticated using (public.can_content()) with check (public.can_content());
create policy albums_read on public.gallery_albums for select using (status = 'published' or public.is_staff());
create policy albums_write on public.gallery_albums for all to authenticated using (public.can_content() or public.can_events()) with check (public.can_content() or public.can_events());
create policy items_read on public.gallery_items for select using (consent_confirmed or public.is_staff());
create policy items_write on public.gallery_items for all to authenticated using (public.can_content() or public.can_events()) with check (public.can_content() or public.can_events());
create policy team_read on public.team_members for select using ((visible and consent_confirmed) or public.can_content());
create policy team_write on public.team_members for all to authenticated using (public.can_content()) with check (public.can_content());
create policy achievements_read on public.achievements for select using (status = 'published' or public.can_content());
create policy achievements_write on public.achievements for all to authenticated using (public.can_content()) with check (public.can_content());
create policy learning_read on public.learning_resources for select using (status = 'published' or public.can_content());
create policy learning_write on public.learning_resources for all to authenticated using (public.can_content()) with check (public.can_content());

-- project submissions: members submit their own; editors review
create policy submissions_insert on public.project_submissions for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and reviewed_by is null and project_id is null);
create policy submissions_read on public.project_submissions for select to authenticated using (user_id = auth.uid() or public.can_content());
create policy submissions_review on public.project_submissions for update to authenticated using (public.can_content()) with check (public.can_content());
create policy submissions_delete on public.project_submissions for delete to authenticated using (public.is_admin());

-- membership applications and contact messages: anyone may send one, only admins read them
create policy applications_insert on public.membership_applications for insert to anon, authenticated
  with check (status = 'pending' and reviewed_by is null and reviewed_at is null and review_note = '' and (user_id is null or user_id = auth.uid()));
create policy applications_read on public.membership_applications for select to authenticated using (public.is_admin() or user_id = auth.uid());
create policy applications_review on public.membership_applications for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy applications_delete on public.membership_applications for delete to authenticated using (public.is_admin());
create policy contact_insert on public.contact_submissions for insert to anon, authenticated with check (status = 'new');
create policy contact_read on public.contact_submissions for select to authenticated using (public.is_admin());
create policy contact_update on public.contact_submissions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy contact_delete on public.contact_submissions for delete to authenticated using (public.is_admin());

-- settings are public to read (they drive public pages); admins and editors write
create policy settings_read on public.website_settings for select using (true);
create policy settings_write on public.website_settings for all to authenticated
  using (public.is_admin() or (public.can_content() and key in ('home', 'districts')))
  with check (public.is_admin() or (public.can_content() and key in ('home', 'districts')));

-- activity log: read-only for admins; rows come from triggers only
create policy logs_read on public.admin_activity_logs for select to authenticated using (public.is_admin());

-- -------------------------------------------------------------- storage ----
-- One public-read bucket for approved imagery. 5 MB per file, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy media_staff_insert on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_staff());
create policy media_staff_update on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_staff()) with check (bucket_id = 'media' and public.is_staff());
create policy media_staff_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_staff());
create policy media_staff_list on storage.objects for select to authenticated using (bucket_id = 'media' and public.is_staff());
