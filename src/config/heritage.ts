/**
 * ACM Heritage Archive: the three galleries and the reference milestones.
 *
 * Every entry here was checked against the source it cites (researched
 * 2026-11-17). The same rows are seeded into `heritage_entries` by
 * supabase/migrations/0002_heritage.sql, where administrators edit them;
 * when no backend is connected the site shows these. Nothing about the
 * ACM MIT Student Chapter is seeded: its gallery is filled by the chapter
 * through the admin centre, and is empty until then.
 */

export type HeritageGallery = "global" | "india" | "chapter";

export type HeritageEntry = {
  id: string;
  gallery: HeritageGallery;
  /** Year used for ordering and the timeline; null for "today" entries. */
  year: number | null;
  /** How the date is shown, e.g. "15 September 1947". */
  date_label: string;
  title: string;
  summary: string;
  body: string;
  /** Where the facts come from. Required for every entry. */
  source_url: string;
  source_label: string;
  /** Approved photograph in the media bucket (consent and rights confirmed). */
  image_path: string | null;
  image_alt: string;
  /** A publication, video or page to explore further. */
  link_url: string | null;
  link_label: string;
  sort_order: number;
};

export const HERITAGE_GALLERIES: { id: HeritageGallery; code: string; name: string; short: string; accent: string; intro: string }[] = [
  {
    id: "global",
    code: "H1",
    name: "ACM Global History",
    short: "ACM Global",
    accent: "#3fe4ff",
    intro: "From a meeting at Columbia University in 1947 to the world's largest educational and scientific computing society.",
  },
  {
    id: "india",
    code: "H2",
    name: "ACM India History",
    short: "ACM India",
    accent: "#ffb547",
    intro: "ACM's council for India, launched in Bangalore in 2010, and the community of chapters, awards and events that grew from it.",
  },
  {
    id: "chapter",
    code: "H3",
    name: "ACM MIT Student Chapter History",
    short: "ACM MIT",
    accent: "#a78bff",
    intro: "The story of the ACM MIT Campus Student Chapter at Madras Institute of Technology, recorded by the chapter itself.",
  },
];

export function heritageGallery(id: HeritageGallery) {
  return HERITAGE_GALLERIES.find((g) => g.id === id)!;
}

const ACM_HISTORY = "https://www.acm.org/about-acm/acm-history";

const e = (row: Omit<HeritageEntry, "image_path" | "image_alt" | "link_url" | "link_label" | "body"> & Partial<HeritageEntry>): HeritageEntry => ({
  image_path: null,
  image_alt: "",
  link_url: null,
  link_label: "",
  body: "",
  ...row,
});

/** Verified reference milestones (ACM global and ACM India only). */
export const HERITAGE_REFERENCE: HeritageEntry[] = [
  e({
    id: "acm-1947-founding",
    gallery: "global",
    year: 1947,
    date_label: "15 September 1947",
    title: "Founded at Columbia University",
    summary: "ACM is founded as the Eastern Association for Computing Machinery at a meeting at Columbia University in New York.",
    body: "The meeting was organised by Edmund C. Berkeley. John Curtiss, director of the National Applied Mathematics Laboratories, was elected the first president, and Berkeley became the first secretary. The notice for the meeting set out its aim: to advance the science, development, construction and application of the new machinery for computing, reasoning and other handling of information.",
    source_url: ACM_HISTORY,
    source_label: "ACM — ACM History",
    sort_order: 10,
  }),
  e({
    id: "acm-1947-first-meeting",
    gallery: "global",
    year: 1947,
    date_label: "11–12 December 1947",
    title: "The first national meeting",
    summary: "The association holds its first official national meeting at the Ballistic Research Laboratories in Aberdeen, Maryland.",
    source_url: ACM_HISTORY,
    source_label: "ACM — ACM History",
    sort_order: 20,
  }),
  e({
    id: "acm-1948-name",
    gallery: "global",
    year: 1948,
    date_label: "January 1948",
    title: "“Eastern” is dropped from the name",
    summary: "With members across a wide geography, the society becomes the Association for Computing Machinery.",
    source_url: ACM_HISTORY,
    source_label: "ACM — ACM History",
    sort_order: 30,
  }),
  e({
    id: "acm-1954-jacm",
    gallery: "global",
    year: 1954,
    date_label: "January 1954",
    title: "Journal of the ACM, Volume 1",
    summary: "The first issue of the Journal of the ACM is published, including J. W. Backus on the IBM 701 Speedcoding System.",
    source_url: "https://dl.acm.org/toc/jacm/1954/1/1",
    source_label: "ACM Digital Library — JACM Vol. 1, No. 1",
    link_url: "https://dl.acm.org/toc/jacm/1954/1/1",
    link_label: "Read the first issue",
    sort_order: 40,
  }),
  e({
    id: "acm-1958-cacm",
    gallery: "global",
    year: 1958,
    date_label: "1958",
    title: "Communications of the ACM",
    summary: "Communications of the ACM begins publication, with Alan J. Perlis as its first editor (1958–62).",
    source_url: "https://www.britannica.com/biography/Alan-Jay-Perlis",
    source_label: "Britannica — Alan Jay Perlis",
    link_url: "https://cacm.acm.org/",
    link_label: "Communications of the ACM today",
    sort_order: 50,
  }),
  e({
    id: "acm-1966-turing",
    gallery: "global",
    year: 1966,
    date_label: "1966",
    title: "The first A. M. Turing Award",
    summary: "Alan J. Perlis receives the first ACM A. M. Turing Award, for his influence in advanced programming techniques and compiler construction.",
    body: "The award is widely regarded as the highest honour in computer science.",
    source_url: "https://www.britannica.com/biography/Alan-Jay-Perlis",
    source_label: "Britannica — Alan Jay Perlis",
    link_url: "https://amturing.acm.org/",
    link_label: "A. M. Turing Award laureates",
    sort_order: 60,
  }),
  e({
    id: "acm-1997-dl",
    gallery: "global",
    year: 1997,
    date_label: "1997",
    title: "The ACM Digital Library goes live",
    summary: "ACM launches its Digital Library, putting the full text of its journals, magazines and proceedings online.",
    source_url: "https://dl.acm.org/doi/10.1145/256175.256179",
    source_label: "ACM — “The ACM digital library goes live”",
    link_url: "https://dl.acm.org/",
    link_label: "ACM Digital Library",
    sort_order: 70,
  }),
  e({
    id: "acm-sigs",
    gallery: "global",
    year: null,
    date_label: "Today",
    title: "Special Interest Groups and conferences",
    summary: "ACM's Special Interest Groups sponsor more than 170 conferences, workshops and symposia worldwide, including SIGGRAPH, CHI, KDD and SIGCOMM.",
    source_url: "https://www.acm.org/membership/acm-at-a-glance",
    source_label: "ACM — ACM at a Glance",
    link_url: "https://www.acm.org/special-interest-groups",
    link_label: "ACM Special Interest Groups",
    sort_order: 80,
  }),
  e({
    id: "acm-2026-open-access",
    gallery: "global",
    year: 2026,
    date_label: "1 January 2026",
    title: "Fully open access",
    summary: "ACM completes its transition to open access: all ACM publications are open access, and the archive is free to read in the Basic ACM Digital Library.",
    source_url: "https://www.acm.org/publications/openaccess",
    source_label: "ACM — Open Access Publication & ACM",
    link_url: "https://www.acm.org/publications/openaccess",
    link_label: "About ACM Open",
    sort_order: 90,
  }),

  e({
    id: "india-2010-council",
    gallery: "india",
    year: 2010,
    date_label: "20 January 2010",
    title: "ACM India Council is launched",
    summary: "In Bangalore, ACM announces the ACM India Council, expanding its worldwide presence.",
    body: "The council brought together 18 computer scientists from Indian academia and industry. Dr. Anand Deshpande, founder of Persistent Systems, served as co-chair.",
    source_url: "https://www.acm.org/binaries/content/assets/press-releases/2010/january/india-council-1.pdf",
    source_label: "ACM press release, January 2010",
    sort_order: 10,
  }),
  e({
    id: "india-2010-symposium",
    gallery: "india",
    year: 2010,
    date_label: "21 January 2010",
    title: "The launch symposium",
    summary: "A one-day technical symposium in Bangalore introduces the council, with talks by ACM Turing Award laureates and research leaders from India, Europe and the US.",
    source_url: "https://www.acm.org/binaries/content/assets/press-releases/2010/january/india-council-1.pdf",
    source_label: "ACM press release, January 2010",
    sort_order: 20,
  }),
  e({
    id: "india-2011-dda",
    gallery: "india",
    year: 2011,
    date_label: "2011",
    title: "Doctoral Dissertation Award",
    summary: "The ACM India Doctoral Dissertation Award is introduced to honour the best doctoral dissertations in computer science and engineering from Indian institutions.",
    source_url: "https://india.acm.org/awards",
    source_label: "ACM India — Awards",
    link_url: "https://india.acm.org/awards",
    link_label: "ACM India awards",
    sort_order: 30,
  }),
  e({
    id: "india-2020-ecr",
    gallery: "india",
    year: 2020,
    date_label: "2020",
    title: "Early Career Researcher Award",
    summary: "ACM India begins recognising researchers early in their careers who have made significant contributions to computing while working mainly in India.",
    source_url: "https://www.acm.org/binaries/content/assets/about/annual-reports/india_council-fy21.pdf",
    source_label: "ACM India Council annual report, FY21",
    link_url: "https://india.acm.org/awards",
    link_label: "ACM India awards",
    sort_order: 40,
  }),
  e({
    id: "india-fy24-chapters",
    gallery: "india",
    year: 2024,
    date_label: "FY2024",
    title: "A national network of chapters",
    summary: "ACM India reports 29 active professional chapters and 274 active student chapters, including 43 ACM India-W student chapters.",
    source_url: "https://www.acm.org/binaries/content/assets/about/annual-reports/fy24_acm_india_council.pdf",
    source_label: "ACM India Council annual report, FY24",
    sort_order: 50,
  }),
  e({
    id: "india-annual-event",
    gallery: "india",
    year: 2026,
    date_label: "14 February 2026",
    title: "The ACM India Annual Event",
    summary: "ACM India's flagship gathering, where its awards are presented, is held at IIT Hyderabad alongside the ARCS research symposium and the ACM India-W Summit.",
    source_url: "https://www.acm.org/articles/acm-india-bulletins/2026/annual-event-2026",
    source_label: "ACM India Bulletin — Annual Event 2026",
    link_url: "https://india.acm.org/",
    link_label: "ACM India",
    sort_order: 60,
  }),
];
