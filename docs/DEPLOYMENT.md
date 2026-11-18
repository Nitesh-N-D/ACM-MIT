# Deployment

NEXUS is a standard Next.js application. It runs on any host that supports Next.js 16 on Node.js 20.9 or newer, for example Vercel or a Node server running `npm run build && npm start`.

## Settings on the host

Set the environment variables from [SETUP.md](SETUP.md#2-environment-variables) in the host's dashboard, not in a committed file. `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS` and `ADMIN_REQUIRE_MFA` must stay server-only.

In Supabase → Authentication → URL Configuration:
- Set the **Site URL** to the production origin.
- Add `https://<production origin>/auth/callback` to the redirect URLs.

## Pre-launch checklist

- [ ] Migrations `0001`–`0003` applied to the production database.
- [ ] Administrator account created, with a **strong, unique password** stored in a password manager (see [SETUP.md](SETUP.md#4-the-administrator-account)).
- [ ] Optional: authenticator app added at `/dashboard/security` and `ADMIN_REQUIRE_MFA=true`.
- [ ] `NEXT_PUBLIC_SITE_URL` set to the production origin, so sitemap, canonical links and e-mail links are correct.
- [ ] **Sentinel model:** origin and licence confirmed by the project owner, or the model replaced (see [ASSETS.md](ASSETS.md)).
- [ ] Contact details and membership status set in Command centre → Website & experience.
- [ ] Real content published: events, the team (with consent), projects and learning.
- [ ] `npm run check` and `npm run test:e2e` pass against the production build.

## After deploying

- `/robots.txt` and `/sitemap.xml` are generated automatically. The sitemap lists only published database records.
- The 3D model is cached for an hour and then revalidated. Every other static asset is fingerprinted and cached long-term.
