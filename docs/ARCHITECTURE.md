# Architecture

## Routing: 3D first, 2D always available

- **Gateway** (`/`): the cinematic intro. The Sentinel drives the sword key into the lock and lightning strikes. It is shown once per visitor and can be skipped. Components live in `src/components/gateway/`.
- **The world** (`/explore`): the 3D city (`src/components/world/`, `src/components/explore/`). District pages open over the city as panels, using Next.js parallel and intercepting routes (`src/app/(site)/explore/(world)/@panel/(..)…`).
- **The 2D site** (`src/app/(site)/…`): every page exists as a plain page with the same content.
- **`src/proxy.ts`** (the Next.js middleware):
  - When someone opens a world page directly (a typed URL, a bookmark or a shared link), it sends them into the world, where the page opens over its district.
  - The `nexus-view=2d` cookie (set by the header's 3D/2D switch) or `?view=2d` turns this off.
  - Crawlers and link previews always get the plain page.
  - It also refreshes the Supabase session cookie. It is **not** the authorisation layer.

## Data

- **Public reads** are in `src/lib/data/public.ts`. They request only published rows, and RLS enforces the same rule in the database.
- Each list comes back as `{ source, items }`, where `source` is one of:
  - `live`: read from the database.
  - `offline`: no database is configured, and the list is empty.
  - `error`: the database could not be reached.

  Pages show "Not connected yet" or "Temporarily unavailable" notices from this value (`SourceNotice` in `src/components/district/District.tsx`). No sample or invented data exists anywhere.
- **Heritage** falls back to the verified reference milestones in `src/config/heritage.ts`.
- **Writes** are server actions in `src/app/actions/`. Each one validates its input on the server (`src/lib/validate.ts`: lengths, e-mail format, required fields, a honeypot and a minimum fill time), checks the visitor's role, and relies on RLS as a second line of defence.
- **Schema**: `supabase/migrations/`. Audit triggers write command-centre changes to `admin_activity_logs`.

## Authentication and roles

- **Members** sign in with an e-mail link (`/sign-in` → `/auth/callback`).
- **The chapter account** signs in with a password at `/admin/sign-in`.
- `getViewer()` (`src/lib/auth/session.ts`) verifies the user with the auth server on every request and reads their roles from `user_roles`.
- A verified e-mail on the allowlist (`ADMIN_EMAILS`, defaulting to `src/config/admin.ts`) is granted Super Admin by the server using the service-role key. Nothing a visitor submits can affect this.
- `requireAdmin()` guards every `/admin` page and action. It checks the allowlist is configured, the visitor is signed in, the e-mail is verified, the visitor has a staff role, and MFA when `ADMIN_REQUIRE_MFA=true`.

## The 3D world

- **Quality tiers** (`src/lib/gateway/quality.ts`):
  - `high`, `balanced` and `low` set pixel ratio, antialiasing, particle and pedestrian counts, city detail, environment reflections and the frame-rate cap.
  - Phones and low-memory devices start on `low`. Visitors can override the tier.
  - The admin centre can set a maximum.
- **Sentinel**: the chapter's rigged knight model (`public/models/sentinel.glb`) on every tier.
  - Code poses it every frame: two-bone IK keeps the hands on the sword, the head follows and nods, and glowing visor eyes blink.
  - A procedural figure stands in while the model loads, if it fails to load, and when data saver is on.
- **Performance**: rendering stops when the canvas is off screen or the tab is hidden. Ambient frame rates are capped on the low tier, and `PerformanceMonitor` lowers the pixel ratio under load.
- **WebGL failures**: no WebGL, a crash in the scene or a lost GPU context all switch to the 2D map (`/explore/map`) with a notice. The rest of the site keeps working.
- **Sound** is synthesised with Web Audio (`src/lib/audio/engine.ts`). Browsers allow audio only after a gesture, so it starts on the visitor's first click or key press, unless they have muted it with the header toggle. The choice is remembered.

## Error handling

| Layer | Behaviour |
| --- | --- |
| `src/app/global-error.tsx` | Last resort if the root layout fails |
| `src/app/(site)/error.tsx` | Public pages: a message, a reference code and **Try again** |
| `src/app/admin/error.tsx`, `src/app/admin/(console)/error.tsx` | The command centre. The console version keeps the sidebar. |
| `src/app/not-found.tsx` | Unknown addresses and records ("Signal lost", noindex) |
| Data layer | Database failures become `error` states, never crashes. Detail pages raise an error so the visitor can retry. |
| Forms | Field-level messages, values kept after an error, a clear message when the database is offline |

Raw error details are never shown to visitors. They go to the server log and browser console with a reference code.

## Security

- **Response headers** (`next.config.ts`):
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - a restrictive `Permissions-Policy`
- **Secrets**: the service-role key is used only in server modules (`server-only`).
- **Admin**: pages are dynamic and set `noindex`.
- **Uploads**: checked for type and size on the server and in the storage bucket.
