"use client";

import { cn } from "@/lib/cn";
import { setViewMode, useViewMode } from "@/lib/view-mode";

/**
 * The global 2D / 3D switch. 3D is the default for everyone; 2D shows the
 * whole website as plain pages. The choice is remembered on this device.
 */
export function ViewSwitch({ className, wide = false }: { className?: string; wide?: boolean }) {
  const mode = useViewMode();
  const next = mode === "3d" ? "2d" : "3d";
  return (
    <div role="group" aria-label="How NEXUS is shown" className={cn("flex items-center border border-line", className)}>
      {(["3d", "2d"] as const).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          title={m === "3d" ? "Show NEXUS as a 3D world" : "Show NEXUS as a plain 2D website"}
          onClick={() => mode !== m && setViewMode(m)}
          className={cn(
            "font-mono text-[0.62rem] tracking-[0.16em] uppercase transition-colors",
            wide ? "flex-1 px-4 py-3" : "px-2 py-1.5",
            mode === m ? "bg-cyan/15 text-cyan" : "text-silver hover:text-ice",
          )}
        >
          {m === "3d" ? "3D" : "2D"}
          {wide && <span className="normal-case tracking-normal"> {m === "3d" ? "world" : "website"}</span>}
        </button>
      ))}
      <span className="sr-only" aria-live="polite">
        {`Now showing the ${mode === "3d" ? "3D world" : "2D website"}. Switch to ${next.toUpperCase()} with the other button.`}
      </span>
    </div>
  );
}
