import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { AchievementRow, AnnouncementRow, EventRow, LearningRow, ProjectRow, TeamRow } from "@/lib/data/types";
import { mediaUrl } from "@/lib/supabase/env";
import { formatDate } from "@/lib/validate";

export const EVENT_CATEGORY: Record<string, string> = {
  hackathon: "Hackathon",
  workshop: "Workshop",
  competition: "Competition",
  seminar: "Seminar",
  "guest-lecture": "Guest lecture",
  bootcamp: "Bootcamp",
  conference: "Conference",
  other: "Event",
};

/** Registration state derived only from what the event record says. */
export function registrationState(e: EventRow, now = Date.now()): { label: string; tone: BadgeTone; open: boolean } {
  const ended = e.ends_at ? new Date(e.ends_at).getTime() < now : e.starts_at ? new Date(e.starts_at).getTime() < now : false;
  if (ended) return { label: "Concluded", tone: "neutral", open: false };
  const deadlinePassed = e.registration_deadline ? new Date(e.registration_deadline).getTime() < now : false;
  if (e.registration_open && !deadlinePassed) return { label: "Registration open", tone: "success", open: true };
  if (e.registration_open && deadlinePassed) return { label: "Registration closed", tone: "warning", open: false };
  return { label: "Upcoming", tone: "cyan", open: false };
}

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export function EventCard({ event, accent = "#ff9d6b" }: { event: EventRow; accent?: string }) {
  const img = mediaUrl(event.banner_path ?? event.poster_path);
  const state = registrationState(event);
  return (
    <Card accent={accent} interactive className="h-full">
      <Link href={`/events/${event.slug}`} className="flex h-full flex-col focus-visible:outline-offset-[-4px]">
        {img && <Image src={img} alt="" width={640} height={300} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="aspect-[16/7] w-full border-b border-line object-cover" />}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="gold">{EVENT_CATEGORY[event.category] ?? "Event"}</Badge>
            <Badge tone={state.tone}>{state.label}</Badge>
          </div>
          <h3 className="mt-4 font-display text-lg text-ice">{event.title}</h3>
          <p className="mt-1 font-mono text-[0.68rem] tracking-[0.14em] uppercase" style={{ color: accent }}>
            {formatDate(event.starts_at, true)}
            {event.venue && ` · ${event.venue}`}
          </p>
          {event.summary && <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{event.summary}</p>}
          <span className="mt-5 font-mono text-[0.66rem] tracking-[0.2em] text-silver uppercase group-hover/card:text-ice">Event details →</span>
        </div>
      </Link>
    </Card>
  );
}

export function ProjectCard({ project, accent = "#3ee6c2" }: { project: ProjectRow; accent?: string }) {
  const img = mediaUrl(project.image_path);
  return (
    <Card accent={accent} interactive className="h-full">
      <Link href={`/vault/${project.slug}`} className="flex h-full flex-col focus-visible:outline-offset-[-4px]">
        {img && <Image src={img} alt="" width={640} height={360} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="aspect-video w-full border-b border-line object-cover" />}
        <div className="flex flex-1 flex-col p-6">
          {project.featured && (
            <Badge tone="cyan" className="self-start">
              Featured
            </Badge>
          )}
          <h3 className="mt-3 font-display text-lg text-ice first:mt-0">{project.title}</h3>
          {project.team && <p className="mt-1 text-xs text-dim">{project.team}</p>}
          {project.summary && <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{project.summary}</p>}
          {project.tags.length > 0 && (
            <ul aria-label="Tags" className="mt-4 flex flex-wrap gap-1.5">
              {project.tags.slice(0, 5).map((tag) => (
                <li key={tag} className="border border-line px-2 py-0.5 font-mono text-[0.6rem] tracking-[0.1em] text-mist uppercase">
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Link>
    </Card>
  );
}

const KIND: Record<LearningRow["kind"], string> = { workshop: "Workshop", path: "Learning path", resource: "Resource" };

export function LearningCard({ item, accent = "#3fe4ff" }: { item: LearningRow; accent?: string }) {
  const body = (
    <div className="flex h-full flex-col p-6">
      <div className="flex flex-wrap gap-2">
        <Badge tone="violet">{KIND[item.kind]}</Badge>
        {item.level && <Badge>{item.level}</Badge>}
      </div>
      <h3 className="mt-4 font-display text-lg text-ice">{item.title}</h3>
      {item.summary && <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{item.summary}</p>}
      {item.url && (
        <span className="mt-5 font-mono text-[0.66rem] tracking-[0.2em] uppercase" style={{ color: accent }}>
          Open resource ↗<span className="sr-only"> (opens in a new tab)</span>
        </span>
      )}
    </div>
  );
  return (
    <Card accent={accent} interactive={Boolean(item.url)} className="h-full">
      {item.url ? (
        <a href={item.url} {...ext} className="block h-full focus-visible:outline-offset-[-4px]">
          {body}
        </a>
      ) : (
        body
      )}
    </Card>
  );
}

export function AnnouncementItem({ item, headingLevel = "h3" }: { item: AnnouncementRow; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  return (
    <article id={item.slug} className="nexus-frame scroll-mt-28 p-6">
      <div className="flex flex-wrap items-center gap-3">
        {item.pinned && <Badge tone="cyan">Pinned</Badge>}
        <time dateTime={item.published_at ?? item.created_at} className="font-mono text-[0.68rem] tracking-[0.16em] text-dim uppercase">
          {formatDate(item.published_at ?? item.created_at)}
        </time>
      </div>
      <H className="mt-3 font-display text-lg text-ice">{item.title}</H>
      <div className="mt-3 space-y-3 leading-relaxed whitespace-pre-line text-silver">{item.body}</div>
    </article>
  );
}

export function AchievementItem({ item }: { item: AchievementRow }) {
  const img = mediaUrl(item.image_path);
  return (
    <article className="nexus-frame flex h-full flex-col p-6">
      {img && <Image src={img} alt="" width={640} height={360} sizes="(min-width: 1024px) 66vw, 100vw" className="mb-4 aspect-video w-full border border-line object-cover" />}
      <div className="flex flex-wrap items-center gap-2">
        {item.category && <Badge tone="gold">{item.category}</Badge>}
        {item.achieved_on && <span className="font-mono text-[0.68rem] tracking-[0.16em] text-dim uppercase">{formatDate(item.achieved_on)}</span>}
      </div>
      <h3 className="mt-3 font-display text-lg text-ice">{item.title}</h3>
      {item.description && <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted">{item.description}</p>}
    </article>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** A person, shown only with recorded consent (enforced by the query and RLS). */
export function PersonCard({ person, accent = "#d8b25e" }: { person: TeamRow; accent?: string }) {
  const img = mediaUrl(person.image_path);
  const links = [
    { href: person.linkedin_url, label: "LinkedIn" },
    { href: person.github_url, label: "GitHub" },
    { href: person.website_url, label: "Website" },
  ].filter((l): l is { href: string; label: string } => Boolean(l.href));
  return (
    <article className="nexus-frame flex h-full flex-col p-5">
      <div className="flex items-center gap-4">
        {img ? (
          <Image src={img} alt={`Portrait of ${person.name}`} width={96} height={96} sizes="64px" className="size-16 shrink-0 border border-line object-cover" />
        ) : (
          <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center border font-display text-lg" style={{ borderColor: `${accent}66`, color: accent }}>
            {initials(person.name)}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-display text-base text-ice">{person.name}</h3>
          {person.position && <p className="mt-0.5 text-sm text-silver">{person.position}</p>}
          {person.tenure && <p className="mt-0.5 font-mono text-[0.62rem] tracking-[0.14em] text-dim uppercase">{person.tenure}</p>}
        </div>
      </div>
      {person.bio && <p className="mt-4 text-sm leading-relaxed text-muted">{person.bio}</p>}
      {links.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.href} {...ext} className="font-mono text-[0.64rem] tracking-[0.16em] uppercase hover:text-ice" style={{ color: accent }}>
                {l.label} ↗<span className="sr-only"> — {person.name} (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** Responsive card grid used by every list page. */
export function CardGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const c = { 2: "md:grid-cols-2", 3: "md:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" }[cols];
  return <ul className={`grid gap-4 ${c} [&>li]:min-w-0`}>{children}</ul>;
}
