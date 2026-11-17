-- ============================================================================
-- NEXUS — ACM Heritage Archive
--
-- One table holds every exhibit of the three galleries (ACM global, ACM India,
-- ACM MIT Student Chapter). Each entry must cite where its facts come from,
-- and a photograph can only be attached once its rights or the consent of the
-- people shown have been confirmed. Content editors manage the archive; the
-- public sees published entries only. Changes are written to the admin
-- activity log by the existing audit trigger.
-- ============================================================================

create table public.heritage_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  gallery text not null check (gallery in ('global', 'india', 'chapter')),
  year integer check (year between 1900 and 2200),
  date_label text not null default '' check (char_length(date_label) <= 60),
  title text not null check (char_length(title) between 1 and 200),
  summary text not null check (char_length(summary) between 1 and 600),
  body text not null default '' check (char_length(body) <= 6000),
  -- Verified information only: every exhibit names its source.
  source_url text not null check (source_url ~ '^https://'),
  source_label text not null default '' check (char_length(source_label) <= 200),
  image_path text,
  image_alt text not null default '' check (char_length(image_alt) <= 300),
  image_rights_confirmed boolean not null default false,
  link_url text check (link_url is null or link_url ~ '^https://'),
  link_label text not null default '' check (char_length(link_label) <= 120),
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A photograph is published only with confirmed rights / consent and alt text.
  constraint heritage_image_approved check (image_path is null or (image_rights_confirmed and char_length(image_alt) > 0))
);
create index heritage_entries_gallery on public.heritage_entries (gallery, year, sort_order);

create trigger heritage_entries_touch before update on public.heritage_entries
  for each row execute function public.touch_updated_at();
create trigger heritage_entries_audit after insert or update or delete on public.heritage_entries
  for each row execute function public.audit_row();

alter table public.heritage_entries enable row level security;
create policy heritage_read on public.heritage_entries for select using (status = 'published' or public.can_content());
create policy heritage_write on public.heritage_entries for all to authenticated using (public.can_content()) with check (public.can_content());

-- Reference milestones, verified against the cited sources on 2026-11-17
-- (mirrors src/config/heritage.ts). The chapter gallery is not seeded.
insert into public.heritage_entries (slug, gallery, year, date_label, title, summary, body, source_url, source_label, link_url, link_label, sort_order, status) values
  ('acm-1947-founding', 'global', 1947, '15 September 1947', 'Founded at Columbia University', 'ACM is founded as the Eastern Association for Computing Machinery at a meeting at Columbia University in New York.', 'The meeting was organised by Edmund C. Berkeley. John Curtiss, director of the National Applied Mathematics Laboratories, was elected the first president, and Berkeley became the first secretary. The notice for the meeting set out its aim: to advance the science, development, construction and application of the new machinery for computing, reasoning and other handling of information.', 'https://www.acm.org/about-acm/acm-history', 'ACM — ACM History', null, '', 10, 'published'),
  ('acm-1947-first-meeting', 'global', 1947, '11–12 December 1947', 'The first national meeting', 'The association holds its first official national meeting at the Ballistic Research Laboratories in Aberdeen, Maryland.', '', 'https://www.acm.org/about-acm/acm-history', 'ACM — ACM History', null, '', 20, 'published'),
  ('acm-1948-name', 'global', 1948, 'January 1948', '“Eastern” is dropped from the name', 'With members across a wide geography, the society becomes the Association for Computing Machinery.', '', 'https://www.acm.org/about-acm/acm-history', 'ACM — ACM History', null, '', 30, 'published'),
  ('acm-1954-jacm', 'global', 1954, 'January 1954', 'Journal of the ACM, Volume 1', 'The first issue of the Journal of the ACM is published, including J. W. Backus on the IBM 701 Speedcoding System.', '', 'https://dl.acm.org/toc/jacm/1954/1/1', 'ACM Digital Library — JACM Vol. 1, No. 1', 'https://dl.acm.org/toc/jacm/1954/1/1', 'Read the first issue', 40, 'published'),
  ('acm-1958-cacm', 'global', 1958, '1958', 'Communications of the ACM', 'Communications of the ACM begins publication, with Alan J. Perlis as its first editor (1958–62).', '', 'https://www.britannica.com/biography/Alan-Jay-Perlis', 'Britannica — Alan Jay Perlis', 'https://cacm.acm.org/', 'Communications of the ACM today', 50, 'published'),
  ('acm-1966-turing', 'global', 1966, '1966', 'The first A. M. Turing Award', 'Alan J. Perlis receives the first ACM A. M. Turing Award, for his influence in advanced programming techniques and compiler construction.', 'The award is widely regarded as the highest honour in computer science.', 'https://www.britannica.com/biography/Alan-Jay-Perlis', 'Britannica — Alan Jay Perlis', 'https://amturing.acm.org/', 'A. M. Turing Award laureates', 60, 'published'),
  ('acm-1997-dl', 'global', 1997, '1997', 'The ACM Digital Library goes live', 'ACM launches its Digital Library, putting the full text of its journals, magazines and proceedings online.', '', 'https://dl.acm.org/doi/10.1145/256175.256179', 'ACM — “The ACM digital library goes live”', 'https://dl.acm.org/', 'ACM Digital Library', 70, 'published'),
  ('acm-sigs', 'global', null, 'Today', 'Special Interest Groups and conferences', 'ACM''s Special Interest Groups sponsor more than 170 conferences, workshops and symposia worldwide, including SIGGRAPH, CHI, KDD and SIGCOMM.', '', 'https://www.acm.org/membership/acm-at-a-glance', 'ACM — ACM at a Glance', 'https://www.acm.org/special-interest-groups', 'ACM Special Interest Groups', 80, 'published'),
  ('acm-2026-open-access', 'global', 2026, '1 January 2026', 'Fully open access', 'ACM completes its transition to open access: all ACM publications are open access, and the archive is free to read in the Basic ACM Digital Library.', '', 'https://www.acm.org/publications/openaccess', 'ACM — Open Access Publication & ACM', 'https://www.acm.org/publications/openaccess', 'About ACM Open', 90, 'published'),
  ('india-2010-council', 'india', 2010, '20 January 2010', 'ACM India Council is launched', 'In Bangalore, ACM announces the ACM India Council, expanding its worldwide presence.', 'The council brought together 18 computer scientists from Indian academia and industry. Dr. Anand Deshpande, founder of Persistent Systems, served as co-chair.', 'https://www.acm.org/binaries/content/assets/press-releases/2010/january/india-council-1.pdf', 'ACM press release, January 2010', null, '', 10, 'published'),
  ('india-2010-symposium', 'india', 2010, '21 January 2010', 'The launch symposium', 'A one-day technical symposium in Bangalore introduces the council, with talks by ACM Turing Award laureates and research leaders from India, Europe and the US.', '', 'https://www.acm.org/binaries/content/assets/press-releases/2010/january/india-council-1.pdf', 'ACM press release, January 2010', null, '', 20, 'published'),
  ('india-2011-dda', 'india', 2011, '2011', 'Doctoral Dissertation Award', 'The ACM India Doctoral Dissertation Award is introduced to honour the best doctoral dissertations in computer science and engineering from Indian institutions.', '', 'https://india.acm.org/awards', 'ACM India — Awards', 'https://india.acm.org/awards', 'ACM India awards', 30, 'published'),
  ('india-2020-ecr', 'india', 2020, '2020', 'Early Career Researcher Award', 'ACM India begins recognising researchers early in their careers who have made significant contributions to computing while working mainly in India.', '', 'https://www.acm.org/binaries/content/assets/about/annual-reports/india_council-fy21.pdf', 'ACM India Council annual report, FY21', 'https://india.acm.org/awards', 'ACM India awards', 40, 'published'),
  ('india-fy24-chapters', 'india', 2024, 'FY2024', 'A national network of chapters', 'ACM India reports 29 active professional chapters and 274 active student chapters, including 43 ACM India-W student chapters.', '', 'https://www.acm.org/binaries/content/assets/about/annual-reports/fy24_acm_india_council.pdf', 'ACM India Council annual report, FY24', null, '', 50, 'published'),
  ('india-annual-event', 'india', 2026, '14 February 2026', 'The ACM India Annual Event', 'ACM India''s flagship gathering, where its awards are presented, is held at IIT Hyderabad alongside the ARCS research symposium and the ACM India-W Summit.', '', 'https://www.acm.org/articles/acm-india-bulletins/2026/annual-event-2026', 'ACM India Bulletin — Annual Event 2026', 'https://india.acm.org/', 'ACM India', 60, 'published')
on conflict (slug) do nothing;
