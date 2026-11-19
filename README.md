# ACM MIT — NEXUS

**The Digital Civilization.** The website of the ACM MIT Campus Student Chapter (Madras Institute of Technology), built as an explorable 3D city with a complete, fast 2D site alongside it.

Visitors arrive at the **Gateway**, where the Sentinel, a knight, drives a sword key into the lock and opens the city. From there they can walk the **NEXUS** city in 3D, or switch to the plain 2D site at any time. Both show the same content. Behind it sits a **command centre** where the chapter publishes events, projects, people, photographs and more.

## Highlights

- **Two ways in, one set of content.** Every page works in 3D (over its district in the city) and in 2D (a normal page that is fast and accessible). The 3D/2D switch sits in the header. Crawlers always get the plain pages.
- **Six districts and a heritage archive.**

  | District | Page |
  | --- | --- |
  | Central Core | `/about` |
  | Intelligence Realm | `/realms/intelligence` |
  | Technology Frontier | `/realms/technology` |
  | Event Colosseum | `/events` |
  | Innovation Vault | `/vault` |
  | Legacy Sanctuary | `/team` |
  | ACM Heritage Archive | `/heritage` |

  Every district has a reception hall and topic rooms, and each of these can also be entered in 3D.
- **Adaptive 3D.** Quality tiers (high, balanced, low) are picked from the device and can be overridden. The site falls back to a 2D map when WebGL is missing or the GPU loses its context. Rendering pauses while the scene is off screen.
- **Members.** Members sign in by e-mail link, register for events, submit projects for approval, apply for membership and can turn on an authenticator app.
- **Command centre** (`/admin`).
  - Covers events and registrations, announcements, projects, learning, achievements, the heritage archive, people and teams, the media library and albums, members, applications, messages, settings, roles, the activity log and CSV exports.
  - Access depends on role: Super Admin, Admin, Event Manager or Content Editor.
- **Honest data.** Nothing is invented. Without a database, lists are empty and say so. Photographs of people appear only with recorded consent. Heritage entries must cite a source.
- **Secure by default.** Row Level Security covers every table, and roles are checked on the server for every admin page and action. Admin pages are never indexed, security headers are set, and secrets never reach the browser.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| 3D | three.js 0.187, @react-three/fiber 9, drei, GSAP |
| Styling | Tailwind CSS 4 |
| Backend | Supabase (Postgres with RLS, Auth, Storage) |
| Tests | Playwright (desktop and mobile projects) |

## Quick start

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local    # then fill it in; see docs/SETUP.md
npm run dev                   # http://localhost:3000
```

The site runs without a database. Every page renders, lists are empty with a "Not connected yet" notice, and forms say they cannot be sent. Connect Supabase to publish content (see [docs/SETUP.md](docs/SETUP.md)).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run check` | Typecheck and lint |
| `npm run test:e2e` | Playwright end-to-end tests (builds must exist; see [docs/TESTING.md](docs/TESTING.md)) |

## Documentation

| Document | Contents |
| --- | --- |
| [docs/SETUP.md](docs/SETUP.md) | Environment variables, Supabase project, migrations, the administrator account |
| [docs/ADMIN.md](docs/ADMIN.md) | Using the command centre: roles, publishing, people and consent, exports |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the code is organised: routing, data, auth, the 3D world, error handling |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production build, hosting settings and the pre-launch checklist |
| [docs/TESTING.md](docs/TESTING.md) | Checks and end-to-end tests |
| [docs/ASSETS.md](docs/ASSETS.md) | 3D assets, the Sentinel model and licences |

## Project layout

```text
src/
  app/           routes: (site) public pages, explore/ the 3D world, admin/ command centre, auth/, actions/ (server actions)
  components/    gateway/ (intro scene), world/ + explore/ (3D city), district/, admin/, forms/, layout/, ui/
  config/        site facts, districts, topics, heritage reference, admin allowlist default
  lib/           data/ (public reads), auth/, supabase/, admin/, gateway/ (quality tiers), audio/, three/
  proxy.ts       3D-first routing and session refresh (Next.js middleware)
supabase/migrations/   database schema, RLS policies and storage (apply in order)
public/models/         sentinel.glb (the only bundled 3D asset)
scripts/               build-sentinel.mjs (dev-only model pipeline)
tests/e2e/             Playwright tests
```

## Before public launch

See the checklist in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). In particular, the origin and licence of the Sentinel model must be confirmed (see [docs/ASSETS.md](docs/ASSETS.md)), and the administrator account needs a strong password. Administrators can change it at any time under Command centre → Website & experience → Your password.
