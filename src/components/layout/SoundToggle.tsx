"use client";

import { useEffect, useSyncExternalStore } from "react";
import { sound } from "@/lib/audio/engine";
import { cn } from "@/lib/cn";

const SERVER = { pref: "on", running: false } as const;

/** Header button: turns the NEXUS soundscape on / off (remembered per visitor). */
export function SoundToggle({ className }: { className?: string }) {
  const s = useSyncExternalStore(sound.subscribe, sound.get, () => SERVER);

  useEffect(() => sound.install(), []);

  const on = s.running;
  return (
    <button
      type="button"
      data-sound-toggle
      aria-pressed={on}
      aria-label={on ? "Mute background sound" : "Play background sound"}
      title={on ? "Sound on — click to mute" : "Sound off — click to play"}
      onClick={() => sound.toggle()}
      className={cn(
        "grid size-10 place-items-center transition-colors hover:text-cyan",
        on ? "text-cyan" : "text-silver",
        className,
      )}
    >
      <SpeakerIcon on={on} />
    </button>
  );
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" strokeLinejoin="round" />
      {on ? (
        <g strokeLinecap="round" className="motion-safe:animate-pulse">
          <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
          <path d="M18 6.8a7.4 7.4 0 0 1 0 10.4" />
        </g>
      ) : (
        <path d="m16 9.5 5 5m0-5-5 5" strokeLinecap="round" />
      )}
    </svg>
  );
}
