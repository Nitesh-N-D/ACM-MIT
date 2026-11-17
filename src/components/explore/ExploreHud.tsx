"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { HeritageEntry } from "@/config/heritage";
import { getTerritory, territories } from "@/config/territories";
import { DESTINATIONS, PLACE_IDS, destination, districtOf, interiorOf, isHeritage, isInterior, isTerritory, type FocusId } from "./destinations";
import { HeritagePanel } from "./HeritagePanel";
import { cameraInput, explore, useExplore, type ExploreMode } from "./store";

const MODES: { id: ExploreMode; label: string; hint: string }[] = [
  { id: "cinematic", label: "Cinematic", hint: "The camera tours NEXUS by itself" },
  { id: "free", label: "Free", hint: "You steer the camera" },
  { id: "district", label: "District", hint: "Focus on one district and its content" },
];

const chip =
  "h-8 shrink-0 border px-2.5 font-mono text-[0.62rem] tracking-[0.16em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan";
const chipOff = "border-line bg-void/75 text-silver hover:border-line-strong hover:text-ice";
const chipOn = "border-cyan bg-deep text-ice";
const iconBtn =
  "grid size-9 place-items-center border border-line bg-void/75 text-silver transition-colors hover:border-line-strong hover:text-ice focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan";

type View = "3d" | "loading" | "map";

/** On the 2D map only the districts and the Archive (its content works without 3D). */
const MAP_PLACES = DESTINATIONS.filter((d) => d.id === "heritage" || !PLACE_IDS.includes(d.id as never));

/** Everything the visitor can do in the world is also a real button here. */
export function ExploreHud({ view, canUse3d, heritage }: { view: View; canUse3d: boolean; heritage: HeritageEntry[] }) {
  const mode = useExplore((s) => s.mode);
  const focus = useExplore((s) => s.focus);
  const autoRotate = useExplore((s) => s.autoRotate);
  const reducedMotion = useExplore((s) => s.reducedMotion);
  const [help, setHelp] = useState(true);

  const is3d = view === "3d";
  const district = districtOf(focus);
  const territory = district ? getTerritory(district) : null;
  const indoors = is3d && isInterior(focus);
  const place = destination(focus);

  // Stepping through a door is a camera cut; a short fade from black covers it.
  const [veil, setVeil] = useState({ indoors, n: 0 });
  if (veil.indoors !== indoors) setVeil({ indoors, n: veil.n + 1 });

  return (
    <>
      <p className="sr-only" role="status">
        {view === "loading" ? "Loading the 3D world. The 2D map is available now." : `Viewing ${place.label}.`}
      </p>

      {/* Modes */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 sm:top-4 sm:left-4">
        {is3d && (
          <div role="group" aria-label="Camera mode" className="flex gap-1">
            {MODES.map((m) => (
              <button key={m.id} type="button" title={m.hint} aria-pressed={mode === m.id} onClick={() => explore.setMode(m.id)} className={`${chip} ${mode === m.id ? chipOn : chipOff}`}>
                {m.label}
              </button>
            ))}
          </div>
        )}
        {canUse3d && (
          <button type="button" onClick={() => explore.setFlat(view !== "map")} className={`${chip} ${chipOff}`}>
            {view === "map" ? "3D world" : "2D map"}
          </button>
        )}
        {view === "loading" && <span className="font-mono text-[0.62rem] tracking-[0.18em] text-cyan uppercase">Loading 3D world…</span>}
        {!canUse3d && view === "map" && (
          <span className="font-mono text-[0.62rem] tracking-[0.16em] text-mist uppercase">2D map · 3D is unavailable on this device</span>
        )}
      </div>

      {/* Camera controls */}
      {is3d && (
        <div role="group" aria-label="Camera controls" className="absolute top-14 right-3 z-20 flex flex-col gap-1 sm:top-4 sm:right-4">
          <button type="button" aria-label="Zoom in" className={iconBtn} onClick={() => ((cameraInput.zoom -= 0.35), explore.steer())}>
            +
          </button>
          <button type="button" aria-label="Zoom out" className={iconBtn} onClick={() => ((cameraInput.zoom += 0.35), explore.steer())}>
            −
          </button>
          <button type="button" aria-label="Rotate left" className={iconBtn} onClick={() => ((cameraInput.rotate -= 0.6), explore.steer())}>
            ⟲
          </button>
          <button type="button" aria-label="Rotate right" className={iconBtn} onClick={() => ((cameraInput.rotate += 0.6), explore.steer())}>
            ⟳
          </button>
          {!reducedMotion && (
            <button type="button" aria-label="Auto-rotate" aria-pressed={autoRotate} title="Auto-rotate" className={`${iconBtn} ${autoRotate ? "border-cyan text-cyan" : ""}`} onClick={() => explore.toggleAutoRotate()}>
              ∞
            </button>
          )}
          <button type="button" aria-label="Reset view" title="Reset view" className={iconBtn} onClick={() => explore.reset()}>
            ⌂
          </button>
          <button type="button" aria-label="How to navigate" aria-expanded={help} className={iconBtn} onClick={() => setHelp((h) => !h)}>
            ?
          </button>
        </div>
      )}

      {/* Instructions */}
      {is3d && help && !territory && !isHeritage(focus) && (
        <div className="absolute top-14 left-3 z-20 max-w-[17rem] border border-line bg-void/85 p-3 backdrop-blur-sm sm:top-16 sm:left-4">
          <p className="font-mono text-[0.62rem] tracking-[0.2em] text-cyan uppercase">Navigating NEXUS</p>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-silver">
            <li>Drag to look around — a full 360°.</li>
            <li>Scroll or pinch to zoom.</li>
            <li>Select a landmark, or a destination below, to travel.</li>
            <li>Every control is also a button, and the 2D map is always available.</li>
          </ul>
          <button type="button" onClick={() => setHelp(false)} className="mt-2 font-mono text-[0.62rem] tracking-[0.16em] text-ice uppercase underline underline-offset-4 hover:text-cyan">
            Got it
          </button>
        </div>
      )}

      {/* District panel */}
      {territory && (
        <aside
          aria-label={territory.name}
          className="absolute inset-x-3 bottom-16 z-20 max-h-[45%] overflow-y-auto border border-line bg-void/90 p-4 backdrop-blur-sm sm:bottom-20 lg:inset-x-auto lg:top-20 lg:right-16 lg:bottom-auto lg:max-h-[70%] lg:w-80"
          style={{ borderTopColor: territory.accent }}
        >
          <p className="font-mono text-[0.62rem] tracking-[0.2em] uppercase" style={{ color: territory.accent }}>
            {territory.code} · {indoors ? "Inside · Reception" : territory.purpose}
          </p>
          <h2 className="mt-2 font-display text-lg tracking-[0.08em] text-ice uppercase">{territory.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-silver">{territory.description}</p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {territory.topics.map((topic) => (
              <li key={topic} className="border border-line px-2 py-0.5 font-mono text-[0.6rem] tracking-[0.12em] text-mist uppercase">
                {topic}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {is3d && !indoors && (
              <Button size="sm" onClick={() => explore.go(interiorOf(territory.id))}>
                Step inside
              </Button>
            )}
            {indoors && (
              <Button size="sm" onClick={() => explore.go(territory.id)}>
                Step outside
              </Button>
            )}
            <Button href={territory.href} variant={is3d ? "ghost" : "primary"} size="sm">
              {indoors ? "Open district page" : "Enter district"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => explore.reset()}>
              Back to overview
            </Button>
          </div>
        </aside>
      )}

      {veil.n > 0 && !reducedMotion && <div key={veil.n} aria-hidden="true" className="nexus-veil pointer-events-none absolute inset-0 z-10 bg-black" />}

      {isHeritage(focus) && <HeritagePanel entries={heritage} inside={is3d && focus === "archive"} can3d={is3d} />}

      {/* Destinations */}
      <nav aria-label="World destinations" className="absolute inset-x-0 bottom-0 z-20 border-t border-line bg-void/85 backdrop-blur-sm">
        <ul className="flex gap-1.5 overflow-x-auto px-3 py-2.5 sm:px-4">
          {(is3d ? DESTINATIONS : MAP_PLACES).map((d) => {
            const on = focus === d.id || district === d.id;
            const accent = isTerritory(d.id) ? territories.find((t) => t.id === d.id)?.accent : d.id === "heritage" ? "#e8c46a" : undefined;
            return (
              <li key={d.id} className="shrink-0">
                <button type="button" title={d.hint} aria-pressed={on} data-destination={d.id} onClick={() => explore.go(d.id as FocusId)} className={`${chip} ${on ? chipOn : chipOff}`}>
                  {accent && <span aria-hidden="true" className="mr-1.5 inline-block size-1.5 rotate-45" style={{ background: accent }} />}
                  {d.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
