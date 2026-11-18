"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import "@/lib/three/console";
import { TIERS, type Tier } from "@/lib/gateway/quality";
import { GatewayScene } from "./scene/Scene";
import { SceneCtx, START, type Channels } from "./scene/state";

/** Drives "demand" frameloop at a fixed rate (low tier ambient cap). */
function FrameCap({ fps, active }: { fps: number; active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => invalidate(), 1000 / fps);
    return () => window.clearInterval(id);
  }, [fps, active, invalidate]);
  return null;
}

export default function GatewayCanvas({ tier, onFail }: { tier: Exclude<Tier, "fallback">; onFail: () => void }) {
  const settings = TIERS[tier];
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [dpr, setDpr] = useState(settings.dpr[1]);
  // One channel object per canvas mount; mutated by GSAP, read in useFrame.
  const ch = useMemo<Channels>(() => ({ ...START }), []);
  const ctx = useMemo(() => ({ ch, tier: settings }), [ch, settings]);
  // R3F force-loses the context when the canvas unmounts (motion/quality
  // toggles); only a loss while still mounted is a real GPU failure.
  const alive = useRef(true);
  useLayoutEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Stop rendering entirely while the hero is scrolled out of view.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const capped = settings.ambientFps > 0;
  const frameloop = !visible ? "never" : capped ? "demand" : "always";

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        dpr={dpr}
        frameloop={frameloop}
        camera={{ fov: 42, near: 0.1, far: 900, position: [0, 34, 96] }}
        gl={{ antialias: settings.antialias, powerPreference: "high-performance", alpha: false, stencil: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          const canvas = gl.domElement;
          canvas.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            if (alive.current) onFail();
          });
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
          {capped && <FrameCap fps={settings.ambientFps} active={visible} />}
          <GatewayScene />
        </SceneCtx.Provider>
      </Canvas>
    </div>
  );
}
