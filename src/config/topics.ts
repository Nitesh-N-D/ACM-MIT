import { getTerritory, type TerritoryId } from "./territories";

/**
 * Where each reception topic leads. Every topic shown in a district's
 * reception (2D and in the 3D exhibition hall) opens a page: either an
 * existing page of the district, or the topic's own hall listing the
 * chapter's published content on it.
 *
 * Blurbs describe the field or format in general terms; they make no claim
 * about what the chapter has done.
 */

export type TopicHall = {
  /** URL segment of the topic hall. */
  slug: string;
  name: string;
  blurb: string;
  /** Lower-case words matched against titles, summaries and project tags. */
  match: string[];
  /** Event category shown in this hall (Event Colosseum). */
  category?: string;
};

export type Topic = { name: string; href: string; hall?: TopicHall };

const hall = (slug: string, name: string, blurb: string, match: string[], category?: string): TopicHall => ({ slug, name, blurb, match, category });

/** Topic halls with their own page, per district. */
export const HALLS = {
  core: [
    hall(
      "highlights",
      "Highlights",
      "The work the chapter chose to put in the spotlight: featured events, featured projects and recent recognitions, gathered in one hall.",
      [],
    ),
  ],
  intelligence: [
    hall(
      "machine-learning",
      "Machine Learning",
      "Systems that learn patterns from data instead of following hand-written rules — from regression and decision trees to the models behind modern AI.",
      ["machine learning", "ml", "scikit", "regression", "classification"],
    ),
    hall("deep-learning", "Deep Learning", "Neural networks with many layers: how they are built, trained and tuned, and the frameworks used to do it.", [
      "deep learning",
      "neural",
      "pytorch",
      "tensorflow",
      "cnn",
      "transformer",
    ]),
    hall(
      "generative-ai",
      "Generative AI",
      "Models that create text, images, audio and code — large language models, diffusion models, prompting and building applications on top of them.",
      ["generative", "genai", "llm", "gpt", "diffusion", "prompt", "rag"],
    ),
    hall("nlp", "NLP", "Natural language processing: teaching computers to read, understand and produce human language.", [
      "nlp",
      "natural language",
      "language model",
      "text",
      "speech",
    ]),
    hall("computer-vision", "Computer Vision", "Machines that see: image classification, detection, segmentation and the cameras and models that make them work.", [
      "computer vision",
      "vision",
      "image",
      "opencv",
      "detection",
      "yolo",
    ]),
    hall("data-science", "Data Science", "Turning raw data into insight — collection, cleaning, analysis, visualisation and the statistics underneath.", [
      "data science",
      "data",
      "analytics",
      "pandas",
      "visualisation",
      "visualization",
      "statistics",
    ]),
  ],
  frontier: [
    hall(
      "software-engineering",
      "Software Engineering",
      "Designing, building, testing and maintaining software that lasts: architecture, version control, code review and good practice.",
      ["software", "engineering", "git", "testing", "dsa", "algorithms", "system design"],
    ),
    hall("web", "Web", "Building for the browser — HTML, CSS, JavaScript, frameworks, APIs and everything from front end to back end.", [
      "web",
      "react",
      "next",
      "javascript",
      "typescript",
      "frontend",
      "backend",
      "html",
      "css",
    ]),
    hall("cloud", "Cloud", "Running software on shared infrastructure: cloud platforms, containers, deployment and DevOps.", [
      "cloud",
      "aws",
      "azure",
      "gcp",
      "docker",
      "kubernetes",
      "devops",
      "serverless",
    ]),
    hall("cybersecurity", "Cybersecurity", "Protecting systems, networks and data — secure coding, cryptography, ethical hacking and capture-the-flag challenges.", [
      "security",
      "cyber",
      "ctf",
      "cryptography",
      "hacking",
    ]),
    hall("networking", "Networking", "How machines talk to each other: protocols, the internet's architecture and the infrastructure that carries it.", [
      "network",
      "tcp",
      "protocol",
      "internet",
    ]),
    hall("blockchain", "Blockchain", "Distributed ledgers, smart contracts and the decentralised applications built on them.", [
      "blockchain",
      "web3",
      "ethereum",
      "smart contract",
      "crypto",
    ]),
    hall("iot", "IoT", "The Internet of Things: sensors, microcontrollers and embedded devices connected to the network.", [
      "iot",
      "arduino",
      "raspberry",
      "embedded",
      "sensor",
      "hardware",
    ]),
    hall("open-source", "Open Source", "Software built in the open — how to read, use and contribute to open-source projects.", [
      "open source",
      "open-source",
      "oss",
      "github",
      "contribution",
    ]),
  ],
  colosseum: [
    hall("hackathons", "Hackathons", "Build sprints where teams turn an idea into a working prototype in a day or two, then present it.", ["hackathon"], "hackathon"),
    hall("workshops", "Workshops", "Hands-on sessions: bring a laptop and leave having built or learnt something concrete.", ["workshop"], "workshop"),
    hall(
      "competitions",
      "Competitions",
      "Coding contests, quizzes and challenges where skill is measured against the clock and each other.",
      ["competition"],
      "competition",
    ),
    hall("seminars", "Seminars", "Talks and discussions on a focused topic, for listening, asking and learning.", ["seminar"], "seminar"),
    hall(
      "guest-lectures",
      "Guest Lectures",
      "Sessions led by speakers from industry and academia, sharing their work and experience.",
      ["guest lecture"],
      "guest-lecture",
    ),
    hall("bootcamps", "Bootcamps", "Multi-session programmes that take a topic from the basics to building with it.", ["bootcamp"], "bootcamp"),
  ],
  vault: [
    hall("research", "Research", "Investigations, papers and experiments that ask a question and follow the evidence.", ["research", "paper", "study", "experiment"]),
    hall("prototypes", "Prototypes", "Early working versions — hardware and software built to test whether an idea holds up.", ["prototype", "hardware", "mvp", "demo"]),
    hall("open-source", "Open Source", "Projects whose code is public for anyone to read, use and improve.", ["open source", "open-source", "oss"]),
    hall("challenges", "Challenges", "Work built for hackathons, contests and problem statements.", ["challenge", "hackathon", "competition", "contest"]),
  ],
  sanctuary: [],
} satisfies Record<TerritoryId, TopicHall[]>;

/** Base path of each district's topic halls. */
export const HALL_BASE: Partial<Record<TerritoryId, string>> = {
  core: "/about",
  intelligence: "/realms/intelligence",
  frontier: "/realms/technology",
  colosseum: "/events/topics",
  vault: "/vault/topics",
};

/** Topics that lead to an existing page instead of a hall. */
const PAGES: Partial<Record<TerritoryId, Record<string, string>>> = {
  core: { Mission: "/about#mission", Vision: "/about#vision", Announcements: "/announcements" },
  vault: { Projects: "/vault#all" },
  sanctuary: {
    Committee: "/team#team-committee",
    "Core Team": "/team#team-core",
    Alumni: "/alumni",
    Achievements: "/achievements",
    Milestones: "/heritage#chapter",
  },
};

/** The reception topics of a district, in display order, each with where it leads. */
export function topicsOf(id: TerritoryId): Topic[] {
  const t = getTerritory(id);
  const halls: TopicHall[] = HALLS[id];
  return t.topics.map((name) => {
    const page = PAGES[id]?.[name];
    if (page) return { name, href: page };
    const h = halls.find((x) => x.name === name);
    return h ? { name, href: hallHref(id, h.slug), hall: h } : { name, href: t.href };
  });
}

/** The page of a topic hall. */
export function hallHref(id: TerritoryId, slug: string) {
  return `${HALL_BASE[id]}/${slug}`;
}

/** Every topic hall of a district. */
export function hallsOf(id: TerritoryId): TopicHall[] {
  return HALLS[id];
}

export function getHall(id: TerritoryId, slug: string): TopicHall | null {
  return (HALLS[id] as TopicHall[]).find((h) => h.slug === slug) ?? null;
}
