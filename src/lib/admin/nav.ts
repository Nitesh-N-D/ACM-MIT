import {
  ADMINS,
  CONTENT,
  EVENTS,
  STAFF,
  SUPER,
  hasAny,
  type Role,
} from "@/lib/auth/roles";

/** The command centre's modules, grouped as they appear in the sidebar. */
export type NavItem = { href: string; label: string; roles: readonly Role[] };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", roles: STAFF }],
  },
  {
    label: "Events",
    items: [
      { href: "/admin/events", label: "Events", roles: EVENTS },
      { href: "/admin/registrations", label: "Registrations", roles: EVENTS },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/announcements", label: "Announcements", roles: CONTENT },
      { href: "/admin/projects", label: "Projects", roles: CONTENT },
      { href: "/admin/submissions", label: "Project approval", roles: CONTENT },
      {
        href: "/admin/learning",
        label: "Learning & workshops",
        roles: CONTENT,
      },
      { href: "/admin/achievements", label: "Achievements", roles: CONTENT },
      { href: "/admin/heritage", label: "Heritage archive", roles: CONTENT },
      { href: "/admin/content", label: "Homepage & districts", roles: CONTENT },
    ],
  },
  {
    label: "People & media",
    items: [
      { href: "/admin/team", label: "Team & alumni", roles: CONTENT },
      { href: "/admin/media", label: "Media library", roles: STAFF },
      { href: "/admin/albums", label: "Gallery albums", roles: STAFF },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/admin/members", label: "Members", roles: ADMINS },
      {
        href: "/admin/applications",
        label: "Membership applications",
        roles: ADMINS,
      },
      { href: "/admin/messages", label: "Contact messages", roles: ADMINS },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Website & experience", roles: ADMINS },
      { href: "/admin/roles", label: "Roles", roles: SUPER },
      { href: "/admin/activity", label: "Activity log", roles: ADMINS },
      { href: "/admin/exports", label: "Export centre", roles: STAFF },
    ],
  },
];

export function navFor(roles: readonly Role[]): NavGroup[] {
  return NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => hasAny(roles, i.roles)),
  })).filter((g) => g.items.length > 0);
}
