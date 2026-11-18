-- ============================================================================
-- NEXUS — Teams
--
-- The chapter's working teams (Event Management, Marketing, Design…), created
-- by the command centre. A person on the team list can belong to one team;
-- leaving it empty keeps them only in their group (committee, core team…).
-- A team is shown in the Legacy Sanctuary, in 2D and in its 3D room, once it
-- is marked visible; its members appear only with their recorded consent
-- (enforced by team_members' own policy and constraint).
-- ============================================================================

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  description text not null default '' check (char_length(description) <= 1000),
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index teams_order on public.teams (sort_order, name);

-- Deleting a team keeps its people: they simply no longer belong to a team.
alter table public.team_members add column team_id uuid references public.teams (id) on delete set null;
create index team_members_team on public.team_members (team_id);

create trigger teams_touch before update on public.teams
  for each row execute function public.touch_updated_at();
create trigger teams_audit after insert or update or delete on public.teams
  for each row execute function public.audit_row();

alter table public.teams enable row level security;
create policy teams_read on public.teams for select using (visible or public.can_content());
create policy teams_write on public.teams for all to authenticated using (public.can_content()) with check (public.can_content());
