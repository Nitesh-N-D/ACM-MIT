export const ROLES = ["super_admin", "admin", "event_manager", "content_editor", "member"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  event_manager: "Event Manager",
  content_editor: "Content Editor",
  member: "Member",
};

export const ROLE_SUMMARY: Record<Role, string> = {
  super_admin: "Full system control, including roles.",
  admin: "Website operations and content management.",
  event_manager: "Events and registrations.",
  content_editor: "Public content and media.",
  member: "Authorised member functionality.",
};

export const STAFF: Role[] = ["super_admin", "admin", "event_manager", "content_editor"];
export const ADMINS: Role[] = ["super_admin", "admin"];
export const CONTENT: Role[] = ["super_admin", "admin", "content_editor"];
export const EVENTS: Role[] = ["super_admin", "admin", "event_manager"];
export const SUPER: Role[] = ["super_admin"];

export const hasAny = (mine: readonly Role[], allowed: readonly Role[]) => mine.some((r) => allowed.includes(r));
