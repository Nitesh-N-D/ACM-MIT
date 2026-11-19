# Setup

How to run NEXUS locally and connect it to Supabase. The site works without a database (all lists are empty), so the Supabase steps can be done later.

## 1. Install

```bash
npm install
cp .env.example .env.local
```

Never commit `.env.local`. It is ignored by git.

## 2. Environment variables

| Variable | Where it is used | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server | The public anon key. Safe in the browser, because Row Level Security protects the data. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Used only to make the first Super Admin and to look up accounts when managing roles. Never prefix it with `NEXT_PUBLIC_`. |
| `ADMIN_EMAILS` | Server only | Comma-separated addresses that are made Super Admin when they sign in with a verified e-mail. Empty means the chapter account, `acmmitstudentchapter@gmail.com` (`src/config/admin.ts`). |
| `ADMIN_REQUIRE_MFA` | Server only | `true` requires an authenticator-app code for `/admin`. |
| `NEXT_PUBLIC_SITE_URL` | Links and metadata | The canonical origin, e.g. `https://nexus.example.org`, with no trailing slash. |

## 3. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the migrations **in order**. Use the Supabase CLI (`supabase db push`), or paste each file into Dashboard → SQL Editor and run it:

   | File | Adds |
   | --- | --- |
   | `supabase/migrations/0001_nexus.sql` | Roles, profiles, events and registrations, projects and submissions, announcements, learning, achievements, team members, gallery, forms, settings, the activity log, RLS policies and the public `media` storage bucket (images up to 5 MB) |
   | `supabase/migrations/0002_heritage.sql` | The ACM Heritage Archive table |
   | `supabase/migrations/0003_teams.sql` | Working teams (Event Management, Marketing…), plus the `team_id` on people |

   The migrations create tables. They never drop or empty existing data.
3. Go to Authentication → URL Configuration:
   - Set **Site URL** to your `NEXT_PUBLIC_SITE_URL`.
   - Add `<site>/auth/callback` to the **Redirect URLs** (and `http://localhost:3000/auth/callback` for development).
4. Go to Authentication → Providers → Email and leave e-mail sign-in on. Members sign in with a one-time link. Only the command centre uses passwords.

## 4. The administrator account

The command centre is opened by the chapter account **acmmitstudentchapter@gmail.com**. Its password lives only in Supabase Auth. Never put it in this repository, in `.env` files, in commits or in tests.

1. Apply `0003_teams.sql` if you have not already (step 3).
2. Go to Supabase Dashboard → Authentication → Users → **Add user** → **Create new user**:
   - E-mail: `acmmitstudentchapter@gmail.com`
   - Password: choose a **strong, unique password** (at least 12 characters; 16 or more is better), kept in a password manager.
   - Tick **Auto Confirm User**.
3. Make sure `SUPABASE_SERVICE_ROLE_KEY` is set on the server. The first sign-in uses it to grant the Super Admin role.
4. Open **`/admin/sign-in`** and sign in with that e-mail and password. You arrive at `/admin`.

### Changing the password

Once signed in, an administrator can change their own password under **Command centre → Website & experience → Your password**. Enter the current password, then the new one twice (12 to 72 characters). The current password is checked first, and the session stays signed in.

If the password is forgotten, reset it in Supabase Dashboard → Authentication → Users → the account → **Send password recovery**, or set a new one there directly.

Further staff members do not need passwords. They sign in as members at `/sign-in`, and a Super Admin gives them a role under Command centre → Roles (see [ADMIN.md](ADMIN.md)).

To require a second factor:
1. Sign in.
2. Add an authenticator app at `/dashboard/security`.
3. Set `ADMIN_REQUIRE_MFA=true`.

## 5. Run

```bash
npm run dev       # development, http://localhost:3000
npm run build && npm start   # production
```

If the database cannot be reached, list pages show "Temporarily unavailable" and detail pages show an error page with **Try again**. Nothing crashes.
