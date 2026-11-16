import type { AnnouncementRow, EventRow, LearningRow, ProjectRow } from "./types";

/**
 * Demonstration content, shown only while no backend is connected, and always
 * under a "Sample data" banner. None of it describes a real ACM MIT event,
 * project, person or statistic. No sample people or photographs exist.
 */

const base = { description: "This is placeholder text so the layout can be reviewed. Real content is added from the Admin Command Center once the backend is connected.", status: "published" as const };

export const sampleEvents: EventRow[] = [
  { ...base, id: "sample-event-1", slug: "sample-workshop", title: "Sample event: workshop", summary: "A sample entry showing how a workshop appears.", category: "workshop", venue: "Venue to be announced", starts_at: null, ends_at: null, registration_deadline: null, registration_open: false, capacity: null, banner_path: null, poster_path: null, featured: true },
  { ...base, id: "sample-event-2", slug: "sample-hackathon", title: "Sample event: hackathon", summary: "A sample entry showing how a hackathon appears.", category: "hackathon", venue: "Venue to be announced", starts_at: null, ends_at: null, registration_deadline: null, registration_open: false, capacity: null, banner_path: null, poster_path: null, featured: false },
];

export const sampleProjects: ProjectRow[] = [
  { ...base, id: "sample-project-1", slug: "sample-project", title: "Sample project", summary: "A sample entry showing how a student project appears.", team: "", tags: ["sample"], repo_url: null, demo_url: null, image_path: null, featured: true },
];

export const sampleAnnouncements: AnnouncementRow[] = [
  { id: "sample-announcement-1", slug: "sample-announcement", title: "Sample announcement", body: "Announcements published from the Admin Command Center appear here.", pinned: false, status: "published", published_at: null, created_at: "2026-01-01T00:00:00Z" },
];

export const sampleLearning: LearningRow[] = [
  { id: "sample-learning-1", title: "Sample learning resource", summary: "Workshops, learning paths and resources added by the chapter appear here.", kind: "resource", realm: "general", level: "", url: null, status: "published" },
];
