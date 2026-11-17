import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { EVENT_CATEGORY, registrationState } from "@/components/content/Cards";
import { RegisterPanel, type MyRegistration } from "@/components/content/RegisterPanel";
import { SourceNotice } from "@/components/district/District";
import { PageHeader } from "@/components/sections/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/States";
import { getTerritory } from "@/config/territories";
import { getViewer } from "@/lib/auth/session";
import { getEvent, listMedia, registrationCount } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { mediaUrl } from "@/lib/supabase/env";
import { formatDate } from "@/lib/validate";

type Props = { params: Promise<{ slug: string }> };

const accent = getTerritory("colosseum").accent;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { event } = await getEvent(slug);
  if (!event) return { title: "Event not found", robots: { index: false } };
  return pageMetadata({ title: event.title, description: event.summary || `${EVENT_CATEGORY[event.category] ?? "Event"} by ACM MIT.`, path: `/events/${event.slug}` });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const { source, event } = await getEvent(slug);
  if (!event) notFound();

  const [session, count, media] = await Promise.all([getViewer(), source === "live" ? registrationCount(event.id) : Promise.resolve(null), listMedia()]);
  let mine: MyRegistration = null;
  if (session) {
    const { data } = await session.db.from("event_registrations").select("status").eq("event_id", event.id).eq("user_id", session.viewer.id).maybeSingle();
    mine = (data?.status as MyRegistration) ?? null;
  }

  const state = registrationState(event);
  const banner = mediaUrl(event.banner_path);
  const poster = mediaUrl(event.poster_path);
  const photos = media.items.filter((m) => m.event_id === event.id).slice(0, 12);
  const seatsLeft = event.capacity && count !== null ? Math.max(0, event.capacity - count) : null;

  const details = [
    { k: "Starts", v: formatDate(event.starts_at, true) },
    ...(event.ends_at ? [{ k: "Ends", v: formatDate(event.ends_at, true) }] : []),
    { k: "Venue", v: event.venue || "To be announced" },
    ...(event.registration_deadline ? [{ k: "Register by", v: formatDate(event.registration_deadline, true) }] : []),
    ...(event.capacity ? [{ k: "Capacity", v: `${event.capacity} places${seatsLeft !== null ? ` · ${seatsLeft} left` : ""}` }] : []),
  ];

  return (
    <>
      <PageHeader
        eyebrow={`T04 · ${EVENT_CATEGORY[event.category] ?? "Event"}`}
        title={event.title}
        accent={accent}
        description={event.summary}
        breadcrumbs={[{ label: "NEXUS", href: "/" }, { label: "Events", href: "/events" }, { label: event.title }]}
      >
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge tone={state.tone}>{state.label}</Badge>
          {event.featured && <Badge tone="cyan">Featured</Badge>}
        </div>
      </PageHeader>

      <Container className="py-12 sm:py-16">
        <SourceNotice source={source} what="events" />
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="min-w-0">
            {banner && <Image src={banner} alt="" width={1200} height={520} unoptimized priority className="mb-8 aspect-[16/7] w-full border border-line object-cover" />}
            <h2 className="sr-only">About this event</h2>
            {event.description ? (
              <div className="max-w-3xl space-y-4 text-lg leading-relaxed whitespace-pre-line text-silver">{event.description}</div>
            ) : (
              <p className="text-muted">Full details will be published by the organisers.</p>
            )}

            {photos.length > 0 && (
              <section aria-labelledby="event-photos" className="mt-14">
                <h2 id="event-photos" className="font-display text-xl text-ice">
                  From the event
                </h2>
                <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photos.map((m) => {
                    const src = mediaUrl(m.storage_path);
                    return (
                      src && (
                        <li key={m.id}>
                          <figure>
                            <Image
                              src={src}
                              alt={m.alt || m.caption}
                              width={480}
                              height={360}
                              unoptimized
                              className="aspect-[4/3] w-full border border-line object-cover"
                            />
                            {m.caption && <figcaption className="mt-1.5 text-xs text-muted">{m.caption}</figcaption>}
                          </figure>
                        </li>
                      )
                    );
                  })}
                </ul>
                <Button href="/gallery" variant="ghost" size="sm" className="mt-4">
                  Open the gallery →
                </Button>
              </section>
            )}
          </div>

          <aside aria-label="Event details and registration" className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="nexus-frame p-6">
              <dl className="space-y-4">
                {details.map((d) => (
                  <div key={d.k}>
                    <dt className="font-mono text-[0.62rem] tracking-[0.2em] text-dim uppercase">{d.k}</dt>
                    <dd className="mt-1 text-silver">{d.v}</dd>
                  </div>
                ))}
              </dl>

              <div id="register" className="mt-6 scroll-mt-28 border-t border-line pt-6">
                <h2 className="font-mono text-[0.68rem] tracking-[0.2em] uppercase" style={{ color: accent }}>
                  Registration
                </h2>
                <div className="mt-3">
                  {source !== "live" ? (
                    <p className="text-sm text-muted">Registration opens here once the chapter publishes this event.</p>
                  ) : state.open || mine === "registered" || mine === "waitlisted" ? (
                    session ? (
                      <RegisterPanel eventId={event.id} slug={event.slug} mine={mine} />
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-silver">Sign in with your ACM MIT account to register.</p>
                        <Button href={`/sign-in?next=${encodeURIComponent(`/events/${event.slug}#register`)}`} size="sm">
                          Sign in to register
                        </Button>
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-muted">
                      {state.label === "Concluded"
                        ? "This event has concluded."
                        : state.label === "Registration closed"
                          ? "Registration is closed."
                          : "Registration has not opened yet."}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {poster && <Image src={poster} alt={`Poster for ${event.title}`} width={600} height={800} unoptimized className="h-auto w-full border border-line" />}
            {mine === "waitlisted" && (
              <Notice tone="warning" title="Waitlisted">
                You will be moved up automatically if a place opens.
              </Notice>
            )}
            <Button href="/explore?to=colosseum:in" variant="ghost" size="sm" className="world-hide">
              See the Colosseum in 3D →
            </Button>
          </aside>
        </div>
      </Container>
    </>
  );
}
