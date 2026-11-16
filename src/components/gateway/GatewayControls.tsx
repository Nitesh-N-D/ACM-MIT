"use client";

import { useEffect, useId } from "react";
import { Button } from "@/components/ui/Button";
import { TIER_LABEL, type QualityPref } from "@/lib/gateway/quality";
import { ACTIVATION_STEPS } from "@/lib/gateway/steps";
import { gateway, useGateway } from "@/lib/gateway/store";

const QUALITY_OPTIONS: QualityPref[] = ["auto", "high", "balanced", "low"];

/**
 * Overlay controls for the hero: Skip + progress while the intro plays;
 * Replay / motion / quality once the gateway has settled.
 */
export function GatewayControls() {
  const phase = useGateway((s) => s.phase);
  const mode = useGateway((s) => s.mode);
  const step = useGateway((s) => s.step);
  const ready = useGateway((s) => s.ready);
  const motion = useGateway((s) => s.motion);
  const quality = useGateway((s) => s.quality);
  const detected = useGateway((s) => s.detected);
  const qualityId = useId();

  const playing = phase === "intro" && mode === "3d";

  // Escape skips the intro.
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") gateway.skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  if (phase === "boot") return null;

  if (playing) {
    const total = ACTIVATION_STEPS.length;
    const label = ready ? ACTIVATION_STEPS[step] : "Establishing link";
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-6 sm:px-8 sm:pb-10">
        <p className="sr-only" role="status">
          NEXUS activation sequence playing. Press Skip intro or Escape to
          continue.
        </p>
        <div className="mx-auto flex max-w-5xl items-end justify-between gap-6">
          <div aria-hidden="true" className="min-w-0 flex-1">
            <p className="font-mono text-[0.65rem] tracking-[0.3em] text-cyan uppercase">
              {String(Math.min(step + 1, total)).padStart(2, "0")} / {total}
            </p>
            <p className="mt-2 truncate font-display text-sm tracking-[0.18em] text-ice uppercase sm:text-base">
              {label}
            </p>
            <div className="mt-3 h-px w-full max-w-sm bg-line">
              <div
                className="h-px bg-cyan shadow-[0_0_12px_rgb(63_228_255/0.8)] transition-[width] duration-700 ease-(--ease-nexus)"
                style={{ width: `${((step + 1) / total) * 100}%` }}
              />
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="pointer-events-auto shrink-0"
            onClick={() => gateway.skip()}
          >
            Skip intro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-20 flex items-center justify-end gap-1 border border-line bg-void/75 px-2 py-1 backdrop-blur-sm sm:top-auto sm:right-6 sm:bottom-6">
      <p className="sr-only" role="status">
        {phase === "complete" ? "Welcome to NEXUS." : ""}
      </p>
      {mode === "3d" && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => gateway.replay()}
        >
          Replay intro
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        aria-pressed={motion === "reduced"}
        onClick={() =>
          gateway.setMotion(motion === "reduced" ? "full" : "reduced")
        }
      >
        {motion === "reduced" ? "Enable motion" : "Reduce motion"}
      </Button>
      {motion !== "reduced" && (
        <label
          htmlFor={qualityId}
          className="hidden items-center gap-2 sm:flex font-mono text-[0.68rem] tracking-[0.18em] text-silver uppercase"
        >
          <span>Quality</span>
          <select
            id={qualityId}
            value={quality}
            onChange={(e) => gateway.setQuality(e.target.value as QualityPref)}
            className="h-8 border border-line-strong bg-deep/80 px-2 font-mono text-[0.68rem] tracking-[0.12em] text-ice uppercase focus-visible:border-cyan"
          >
            {QUALITY_OPTIONS.map((q) => (
              <option key={q} value={q}>
                {q === "auto"
                  ? `Auto (${TIER_LABEL[detected]})`
                  : TIER_LABEL[q]}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
