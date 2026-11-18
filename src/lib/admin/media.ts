import type { Option } from "./entities";

/** What a media-library image is for; matches the gallery_items.kind check. */
export const MEDIA_KINDS = [
  "photo",
  "banner",
  "poster",
  "highlight",
  "recap",
  "group",
  "portrait",
  "project",
  "other",
] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

const LABEL: Record<MediaKind, string> = {
  photo: "Photograph",
  banner: "Event banner",
  poster: "Event poster",
  highlight: "Highlight",
  recap: "Event recap",
  group: "Group photograph",
  portrait: "Portrait",
  project: "Project image",
  other: "Other",
};

export const MEDIA_KIND_OPTIONS: Option[] = MEDIA_KINDS.map((k) => ({
  value: k,
  label: LABEL[k],
}));
export const mediaKindLabel = (k: string) => LABEL[k as MediaKind] ?? k;
