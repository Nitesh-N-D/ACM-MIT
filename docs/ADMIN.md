# Command centre guide

The command centre at `/admin` is a plain, fast 2D interface. Search engines never index it. Sign in at `/admin/sign-in` (see [SETUP.md](SETUP.md#4-the-administrator-account)).

## Roles

| Role | Can do |
| --- | --- |
| Super Admin | Everything, including granting and revoking roles |
| Admin | Website operations: members, applications, messages, settings, the activity log, and all content |
| Event Manager | Events and their registrations |
| Content Editor | Announcements, projects and submissions, learning, achievements, the heritage archive, homepage and district copy, people and teams |
| Member | Members' area only (`/dashboard`), with no command-centre access |

The sidebar shows only the sections your role allows, and the server checks the role again on every page and action. To give someone a role:

1. They sign in once at `/sign-in` with their e-mail.
2. A Super Admin opens **Roles** and grants the role to that address.

## Sections

| Group | Section | Notes |
| --- | --- | --- |
| Overview | Dashboard | What needs attention: upcoming events, active registrations, projects awaiting approval, applications, new messages, photos awaiting consent, and member counts |
| Events | Events, Registrations | Events appear in the Event Colosseum once **published**. A registration can be set to registered, wait-listed or cancelled, and attendance can be recorded. |
| Content | Announcements, Projects, Project approval, Learning & workshops, Achievements, Heritage archive, Homepage & districts | Each item has a status: *draft*, *published* or *archived*. Only published items are public. |
| People & media | People & alumni, Teams, Media library, Gallery albums | See **People and consent** below |
| Community | Members, Membership applications, Contact messages | Applications are approved or rejected. Messages are marked read or archived, or deleted. |
| System | Website & experience, Roles, Activity log, Export centre | Settings control contact details, whether membership is open, and 3D defaults (intro on or off, auto-rotate, maximum quality) |

## Publishing

- Pages update as soon as you save. Nothing has to be rebuilt.
- With no published items, a list says so honestly. The site never fills gaps with invented content.
- **Homepage & districts** edits each district's description, an optional notice banner, and intro text. These appear in both 2D and 3D.

## People and consent

- A person (committee, core team, volunteer, alumni, faculty) appears publicly only when **visible** is on *and* **consent confirmed** is ticked. The database enforces this as well.
- Add a LinkedIn, GitHub or website link only if the person agrees.
- Teams: create a team under **Teams**, then choose it on each person's record. A visible team appears in the Legacy Sanctuary, in 2D and in its own 3D room.
- Gallery photographs are published only with consent recorded. Upload JPEG, PNG, WebP or AVIF images up to 5 MB, and write a meaningful alt text.

## Heritage archive

Every entry must cite a source (`https://` link). A photograph is shown only after its rights or the consent of the people in it have been confirmed. When the database is not connected or cannot be reached, the site shows verified reference milestones for ACM and ACM India that are bundled with the code (`src/config/heritage.ts`).

## Exports and the activity log

- **Export centre** downloads CSV files of members, registrations (all, or for one event), applications, messages, submissions, events and the activity log. Exports contain personal data, so store and share them carefully.
- **Activity log** records every change made in the command centre: who made it, what changed and when.
