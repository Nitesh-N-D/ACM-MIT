import Link from "next/link";
import { territories, type TerritoryId } from "@/config/territories";
import { DISTRICT_POS, HERITAGE } from "@/components/world/layout";

/**
 * 2D plan of the NEXUS city, drawn from the same layout as the 3D world.
 * Without `onSelect` every district is a link to its page (works with no
 * JavaScript and no WebGL); with `onSelect` districts act as toggle buttons.
 */

const VIEW = { x: -80, y: -146, w: 160, h: 130 };
const MONO = "var(--font-mono), monospace";

type Props = {
  selected?: TerritoryId | null;
  onSelect?: (id: TerritoryId) => void;
  /** The Heritage Archive is selected (explore stage). */
  heritageOn?: boolean;
  /** Select the Archive; without it the marker links to /heritage. */
  onHeritage?: () => void;
  className?: string;
  title?: string;
};

const GOLD = "#e8c46a";

function HeritageMark({ on, onSelect }: { on: boolean; onSelect?: () => void }) {
  const { x, z } = HERITAGE;
  const body = (
    <>
      <circle cx={x} cy={z} r={7.5} fill={GOLD} fillOpacity={on ? 0.16 : 0.05} />
      <rect x={x - 3.6} y={z - 2.6} width={7.2} height={5.2} fill="#060b1d" stroke={GOLD} strokeWidth={on ? 1 : 0.6} />
      <path d={`M${x - 4.2} ${z - 2.6}L${x} ${z - 5}L${x + 4.2} ${z - 2.6}`} fill="none" stroke={GOLD} strokeWidth={on ? 1 : 0.6} />
      <path d={`M${x - 2} ${z + 2.2}V${z - 1.4}M${x} ${z + 2.2}V${z - 1.4}M${x + 2} ${z + 2.2}V${z - 1.4}`} stroke={GOLD} strokeWidth="0.5" strokeOpacity={on ? 1 : 0.7} />
      <text x={x} y={z + 8.4} textAnchor="middle" fill={on ? "#eef4ff" : "#c3cce4"} fontSize="3" fontFamily={MONO} letterSpacing="0.25">
        HERITAGE
      </text>
    </>
  );
  const label = "ACM Heritage Archive: the history of ACM, ACM India and the chapter";
  const ring = "outline-none [&:focus-visible>rect]:stroke-[1.8]";
  if (onSelect)
    return (
      <g
        role="button"
        tabIndex={0}
        aria-pressed={on}
        aria-label={label}
        className={`cursor-pointer ${ring}`}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        {body}
      </g>
    );
  return (
    <Link href="/heritage" aria-label={label} className={ring}>
      {body}
    </Link>
  );
}

export function CityMap({ selected = null, onSelect, heritageOn = false, onHeritage, className, title = "Map of the six NEXUS territories and the Heritage Archive" }: Props) {
  const core = DISTRICT_POS.core;
  return (
    <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} role="group" aria-label={title} className={className}>
      <defs>
        <pattern id="nexus-map-grid" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M8 0H0V8" fill="none" stroke="rgb(63 228 255 / 0.08)" strokeWidth="0.25" />
        </pattern>
      </defs>
      <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill="url(#nexus-map-grid)" />

      {/* Chasm, bridge and gateway at the southern edge */}
      <rect x={VIEW.x} y={-38} width={VIEW.w} height={24} fill="rgb(1 3 10 / 0.7)" />
      <path d="M0 -20V-58" stroke="rgb(63 228 255 / 0.6)" strokeWidth="1.4" />
      <path d="M-6.2 -19.5H6.2" stroke="rgb(63 228 255 / 0.8)" strokeWidth="1" />
      <text x="9" y="-18.6" fill="#8391b3" fontSize="2.6" fontFamily={MONO} letterSpacing="0.3">
        GATEWAY
      </text>
      <text x="3" y="-27" fill="#8391b3" fontSize="2.3" fontFamily={MONO} letterSpacing="0.3">
        NEXUS BRIDGE
      </text>

      {/* Avenues from the Core to every district */}
      {territories
        .filter((t) => t.id !== "core")
        .map((t) => {
          const [x, z] = DISTRICT_POS[t.id];
          const on = selected === t.id;
          return <line key={t.id} x1={core[0]} y1={core[1]} x2={x} y2={z} stroke={t.accent} strokeOpacity={on ? 0.9 : 0.3} strokeWidth={on ? 0.8 : 0.4} />;
        })}

      {territories.map((t) => {
        const [x, z] = DISTRICT_POS[t.id];
        const on = selected === t.id;
        const r = t.id === "core" ? 6.5 : 5;
        const k = r * 0.55;
        const body = (
          <>
            <circle cx={x} cy={z} r={r + 4} fill={t.accent} fillOpacity={on ? 0.16 : 0.05} />
            <circle cx={x} cy={z} r={r} fill="#060b1d" stroke={t.accent} strokeWidth={on ? 1 : 0.6} />
            <path d={`M${x} ${z - k}L${x + k} ${z}L${x} ${z + k}L${x - k} ${z}Z`} fill={t.accent} fillOpacity={on ? 1 : 0.7} />
            <text x={x} y={z + r + 5.2} textAnchor="middle" fill={on ? "#eef4ff" : "#c3cce4"} fontSize="3" fontFamily={MONO} letterSpacing="0.25">
              {t.short.toUpperCase()}
            </text>
            <text x={x} y={z - r - 2.4} textAnchor="middle" fill={t.accent} fontSize="2.3" fontFamily={MONO} letterSpacing="0.3">
              {t.code}
            </text>
          </>
        );
        const focusRing = "outline-none [&:focus-visible>circle:nth-child(2)]:stroke-[1.8]";
        if (onSelect) {
          return (
            <g
              key={t.id}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={`${t.name}: ${t.purpose}`}
              className={`cursor-pointer ${focusRing}`}
              onClick={() => onSelect(t.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(t.id);
                }
              }}
            >
              {body}
            </g>
          );
        }
        return (
          <Link key={t.id} href={t.href} aria-label={`${t.name}: ${t.purpose}`} className={focusRing}>
            {body}
          </Link>
        );
      })}
      <HeritageMark on={heritageOn} onSelect={onHeritage} />
    </svg>
  );
}
