"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { TIERS, type Tier } from "@/lib/gateway/quality";
import { FINAL, SceneCtx } from "@/components/gateway/scene/state";
import { ExploreScene, type Activity } from "./scene/ExploreScene";

/** Drives the "demand" frameloop at a fixed rate on the low tier. */
function FrameCap({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = window.setInterval(() => invalidate(), 1000 / fps);
    return () => window.clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

type Props = {
  tier: Exclude<Tier, "fallback">;
  activity: Activity;
  reducedMotion: boolean;
  onReady: () => void;
  onFail: () => void;
};

export default function ExploreCanvas({ tier, activity, reducedMotion, onReady, onFail }: Props) {
  const settings = TIERS[tier];
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [dpr, setDpr] = useState(settings.dpr[1]);
  // The world is shown fully activated: every gateway channel at its end state.
  const ctx = useMemo(() => ({ ch: { ...FINAL }, tier: settings }), [settings]);
  const alive = useRef(true);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      document.body.style.cursor = "";
    };
  }, []);

  // Stop rendering while the stage is off-screen or the tab is hidden.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let onScreen = true;
    const sync = () => setVisible(onScreen && !document.hidden);
    const io = new IntersectionObserver(([e]) => {
      onScreen = !!e?.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const capped = settings.ambientFps > 0;

  return (
    <div ref={wrap} className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing" data-explore-canvas>
      <Canvas
        dpr={dpr}
        frameloop={!visible ? "never" : capped ? "demand" : "always"}
        camera={{ fov: 42, near: 0.3, far: 1400, position: [120, 240, 200] }}
        gl={{ antialias: settings.antialias, powerPreference: "high-performance", alpha: false, stencil: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            if (alive.current) onFail();
          });
          onReady();
        }}
        aria-hidden="true"
        tabIndex={-1}
      >
        <SceneCtx.Provider value={ctx}>
          <PerformanceMonitor
            onDecline={() => setDpr((d) => Math.max(1, d - 0.25))}
            onIncline={() => setDpr((d) => Math.min(settings.dpr[1], d + 0.25))}
            flipflops={3}
            onFallback={() => setDpr(1)}
          />
          {capped && visible && <FrameCap fps={settings.ambientFps} />}
          <ExploreScene activity={activity} reducedMotion={reducedMotion} />
        </SceneCtx.Provider>
      </Canvas>
    </div>
  );
}
