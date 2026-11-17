import { cn } from "@/lib/cn";

/**
 * Static NEXUS Gateway illustration (pure SVG, server-rendered).
 *
 * Roles:
 *  - Phase 2 hero visual.
 *  - Permanent fallback for the 3D Gateway (no WebGL, reduced motion,
 *    low-power mode) — so it must stand on its own.
 *
 * Composition: sealed monumental gate → the Sentinel, both hands on the
 * pommel of the Sword Key → the blade planted point-down in the lock at the
 * centre of the Resonance Platform. Only the hilt glow, visor and gate seam
 * move, via CSS (disabled under prefers-reduced-motion).
 */

// Deterministic star field (same on server and client — no hydration drift).
function stars(count: number, seed: number) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  return Array.from({ length: count }, () => ({
    x: Math.round(rnd() * 1600),
    y: Math.round(rnd() * 560),
    r: rnd() < 0.08 ? 1.6 : rnd() * 0.9 + 0.3,
    o: Math.round((rnd() * 0.6 + 0.2) * 100) / 100,
  }));
}
const STARS = stars(140, 7);

export function GatewayArt({ className, glow = true }: { className?: string; glow?: boolean }) {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMax slice"
      className={cn("nexus-gateway-art", className)}
      role="img"
      aria-label="The NEXUS Gateway: an armoured Sentinel resting both hands on a glowing sword planted in the lock of the platform, before a sealed monumental gate."
    >
      <defs>
        <radialGradient id="ga-sky" cx="50%" cy="38%" r="70%">
          <stop offset="0" stopColor="#0f1d4a" />
          <stop offset="0.55" stopColor="#060b1c" />
          <stop offset="1" stopColor="#03050d" />
        </radialGradient>
        <radialGradient id="ga-core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#3fe4ff" stopOpacity="0.55" />
          <stop offset="0.4" stopColor="#2f6bff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#2f6bff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ga-blade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3fe4ff" />
          <stop offset="0.5" stopColor="#e9fbff" />
          <stop offset="1" stopColor="#2f9fd0" />
        </linearGradient>
        <linearGradient id="ga-seam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3fe4ff" stopOpacity="0" />
          <stop offset="0.35" stopColor="#3fe4ff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#3fe4ff" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="ga-stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14214a" />
          <stop offset="1" stopColor="#070c1e" />
        </linearGradient>
        <linearGradient id="ga-armor" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0a1230" />
          <stop offset="0.5" stopColor="#1a2858" />
          <stop offset="1" stopColor="#0a1230" />
        </linearGradient>
        <linearGradient id="ga-floor-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#03050d" stopOpacity="0" />
          <stop offset="1" stopColor="#03050d" />
        </linearGradient>
      </defs>

      {/* Sky + stars */}
      <rect width="1600" height="900" fill="url(#ga-sky)" />
      <g fill="#dbe8ff">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
        ))}
      </g>

      {/* Distant city silhouettes beyond the gate */}
      <g fill="#0b1533" opacity="0.9">
        <path d="M0 640V560h40v-40h30v60h50v-90h24v90h40v-30h60v70h40v-120h20v120h70v-60h40v100H0Z" />
        <path d="M1600 640V550h-36v-70h-28v90h-54v-60h-30v60h-44v-120h-22v120h-60v-40h-50v100h-44v-60h-40v100h408Z" />
      </g>

      {/* Monumental gate */}
      <g>
        <path d="M520 900V360L800 110l280 250v540h-110V400L800 245 630 400v500Z" fill="url(#ga-stone)" stroke="#2a3a70" strokeWidth="2" />
        {/* Gate carvings */}
        <path d="M560 880V380L800 165l240 215v500" fill="none" stroke="#3fe4ff" strokeOpacity="0.22" strokeWidth="1.5" />
        <path d="M800 140v40M700 230l20 18M900 230l-20 18" stroke="#3fe4ff" strokeOpacity="0.5" strokeWidth="2" />
        {/* Sealed doors */}
        <path d="M630 900V400L800 245l170 155v500Z" fill="#050916" />
        <path d="M800 252V900" stroke="url(#ga-seam)" strokeWidth="3" className={glow ? "ga-seam" : undefined} />
      </g>

      {/* Ambient glow behind the hilt */}
      <circle cx="800" cy="470" r="330" fill="url(#ga-core-glow)" />

      {/* The Nexus Sentinel — original angular guardian silhouette */}
      <g>
        {/* Cape / back plates */}
        <path d="M640 330 600 860h400l-40-530-160-40Z" fill="#060b1b" />
        {/* Torso */}
        <path d="M690 320 800 300l110 20 22 120-30 180 18 240H680l18-240-30-180Z" fill="url(#ga-armor)" stroke="#6c7fb3" strokeOpacity="0.5" strokeWidth="1.5" />
        {/* Shoulders */}
        <path d="M690 320 610 345l-18 70 70 10 30-60Z" fill="#111c44" stroke="#8a9ccc" strokeOpacity="0.6" strokeWidth="1.5" />
        <path d="M910 320 990 345l18 70-70 10-30-60Z" fill="#111c44" stroke="#8a9ccc" strokeOpacity="0.6" strokeWidth="1.5" />
        {/* Arms: elbows out, forearms down to the grip */}
        <path d="M600 415 628 528 784 470l6 30-150 58-55-128Z" fill="#0d1638" stroke="#6c7fb3" strokeOpacity="0.4" />
        <path d="M1000 415 972 528 816 470l-6 30 150 58 55-128Z" fill="#0d1638" stroke="#6c7fb3" strokeOpacity="0.4" />
        {/* Helmet */}
        <path d="M800 190 842 214l10 64-52 30-52-30 10-64Z" fill="#111c44" stroke="#b9c4dc" strokeOpacity="0.7" strokeWidth="1.5" />
        <path d="M800 160v34" stroke="#b9c4dc" strokeOpacity="0.6" strokeWidth="2" />
        {/* Visor */}
        <path d="M768 246h64" stroke="#3fe4ff" strokeWidth="3.5" strokeLinecap="round" className={glow ? "ga-visor" : undefined} />
        {/* Armor channels */}
        <path d="M800 312v96M740 360l30 50M860 360l-30 50M720 640h160M800 640v220" stroke="#3fe4ff" strokeOpacity="0.45" strokeWidth="1.5" fill="none" />
      </g>

      {/* The Sword Key, planted point-down in the lock */}
      <g>
        <circle cx="800" cy="478" r="70" fill="url(#ga-core-glow)" className={glow ? "ga-pulse" : undefined} />
        {/* Blade */}
        <path d="M788 520h24l-4 290-8 32-8-32Z" fill="url(#ga-blade)" />
        <path d="M800 524v310" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.2" />
        {/* Crossguard */}
        <path d="M736 506h128l8 10-8 6H736l-8-6Z" fill="#1a2858" stroke="#b9c4dc" strokeOpacity="0.8" strokeWidth="1.5" />
        <circle cx="800" cy="514" r="5" fill="#3fe4ff" />
        {/* Grip and pommel */}
        <path d="M792 444h16v62h-16Z" fill="#0a1230" stroke="#6c7fb3" strokeOpacity="0.6" />
        <path d="M800 422 812 436 800 450 788 436Z" fill="#c9f6ff" stroke="#3fe4ff" strokeWidth="1.5" />
        {/* Gauntlets, stacked on the grip */}
        <rect x="776" y="452" width="48" height="24" rx="8" fill="#111c44" stroke="#8a9ccc" strokeOpacity="0.7" strokeWidth="1.5" />
        <rect x="776" y="478" width="48" height="24" rx="8" fill="#111c44" stroke="#8a9ccc" strokeOpacity="0.7" strokeWidth="1.5" />
        {/* Rings of light around the blade, low over the lock */}
        <ellipse cx="800" cy="760" rx="46" ry="9" fill="none" stroke="#8a6bff" strokeWidth="2" strokeOpacity="0.85" />
        <ellipse cx="800" cy="806" rx="64" ry="12" fill="none" stroke="#e9fbff" strokeWidth="2" strokeOpacity="0.7" />
        <ellipse cx="800" cy="842" rx="34" ry="7" fill="#3fe4ff" fillOpacity="0.5" />
      </g>

      {/* Resonance platform */}
      <g transform="translate(800 840)" fill="none">
        <ellipse rx="620" ry="92" fill="#070c1f" stroke="#2a3a70" strokeWidth="2" />
        <ellipse rx="470" ry="68" stroke="#3fe4ff" strokeOpacity="0.35" strokeWidth="1.5" />
        <ellipse rx="320" ry="46" stroke="#3fe4ff" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="18 10" />
        <ellipse rx="170" ry="24" stroke="#3fe4ff" strokeOpacity="0.85" strokeWidth="2" />
        <path d="M-620 0h1240" stroke="#3fe4ff" strokeOpacity="0.1" />
      </g>

      {/* Fade into the page */}
      <rect y="640" width="1600" height="260" fill="url(#ga-floor-fade)" />
    </svg>
  );
}
