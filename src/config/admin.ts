/**
 * The chapter's command-centre account. Only allowlisted addresses are made
 * Super Admin on sign-in; set ADMIN_EMAILS on the server (comma-separated) to
 * replace this default. The account itself, and its password, live only in
 * Supabase Auth (Dashboard → Authentication → Users), never in this code.
 */
export const DEFAULT_ADMIN_EMAILS = ["acmmitstudentchapter@gmail.com"];
