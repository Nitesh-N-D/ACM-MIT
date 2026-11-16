import type { TerritoryId } from "@/config/territories";

type Props = { id: TerritoryId; className?: string };

/**
 * Minimal line-art sigil for each territory. Uses `currentColor`, so set
 * the colour from the parent (usually the territory accent).
 */
export function TerritoryGlyph({ id, className }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {glyphs[id]}
    </svg>
  );
}

const glyphs: Record<TerritoryId, React.ReactNode> = {
  // Central tower: stacked diamond spire with energy core.
  core: (
    <>
      <path d="M24 3 31 16 24 45 17 16Z" />
      <path d="M17 16h14M19.5 26h9" />
      <circle cx="24" cy="16" r="2.2" fill="currentColor" stroke="none" />
    </>
  ),
  // Neural lattice.
  intelligence: (
    <>
      <circle cx="10" cy="14" r="2.5" />
      <circle cx="10" cy="34" r="2.5" />
      <circle cx="24" cy="9" r="2.5" />
      <circle cx="24" cy="24" r="3.2" fill="currentColor" stroke="none" />
      <circle cx="24" cy="39" r="2.5" />
      <circle cx="38" cy="18" r="2.5" />
      <circle cx="38" cy="30" r="2.5" />
      <path d="m12.3 15.2 9.5 7.3M12.3 32.8l9.5-7.3M24 11.5V21M24 27v9.5M26.6 22.6l9.2-3.6M26.6 25.4l9.2 3.6M12 13l10-3" />
    </>
  ),
  // Circuit grid / city blocks.
  frontier: (
    <>
      <rect x="6" y="6" width="14" height="14" />
      <rect x="28" y="6" width="14" height="22" />
      <rect x="6" y="28" width="14" height="14" />
      <rect x="28" y="34" width="14" height="8" />
      <path d="M20 13h8M13 20v8M20 35h8" />
      <circle cx="35" cy="17" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  // Arena: concentric elliptical tiers.
  colosseum: (
    <>
      <ellipse cx="24" cy="26" rx="20" ry="10" />
      <ellipse cx="24" cy="26" rx="13" ry="6" />
      <ellipse cx="24" cy="26" rx="5" ry="2.2" fill="currentColor" stroke="none" />
      <path d="M4 26v6c0 5.5 9 10 20 10s20-4.5 20-10v-6M24 4v12" />
    </>
  ),
  // Vault: nested hexagons around a sealed core.
  vault: (
    <>
      <path d="M24 3 42 13.5v21L24 45 6 34.5v-21Z" />
      <path d="M24 13 33 18.5v11L24 35l-9-5.5v-11Z" />
      <path d="M24 3v10M42 13.5l-9 5M6 13.5l9 5M24 45V35" />
      <circle cx="24" cy="24" r="2.4" fill="currentColor" stroke="none" />
    </>
  ),
  // Constellation.
  sanctuary: (
    <>
      <path d="M7 34 15 20l11 6 8-16 7 22-14 8Z" strokeDasharray="0" />
      <circle cx="7" cy="34" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="20" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="26" cy="26" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="34" cy="10" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="41" cy="32" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="27" cy="40" r="1.8" fill="currentColor" stroke="none" />
    </>
  ),
};
