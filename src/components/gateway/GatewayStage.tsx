"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, type ReactNode } from "react";
import { GatewayArt } from "@/components/brand/GatewayArt";
import { gateway, useGateway } from "@/lib/gateway/store";

const READY_TIMEOUT_MS = 8000;

function failAndRenderNothing() {
  gateway.fail();
  return { default: () => null };
}

// Client-only, code-split: three.js never ships in the server bundle and
// never blocks first paint.
const GatewayCanvas = dynamic(() => import("./GatewayCanvas").catch(failAndRenderNothing), {
  ssr: false,
  loading: () => null,
});

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") console.warn("[gateway] 3D scene failed, using static art.", error);
    gateway.fail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Hero visual: the static GatewayArt is always rendered first (SSR, instant,
 * and the permanent fallback); the WebGL gateway fades in above it.
 */
export function GatewayStage() {
  const mode = useGateway((s) => s.mode);
  const tier = useGateway((s) => s.tier);
  const ready = useGateway((s) => s.ready);

  useEffect(() => {
    gateway.boot();
  }, []);

  // A canvas that never draws (driver stall, blocked context) falls back.
  useEffect(() => {
    if (mode !== "3d" || ready) return;
    const id = window.setTimeout(() => {
      if (!gateway.get().ready) gateway.fail();
    }, READY_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [mode, ready, tier]);

  const show3d = mode === "3d" && tier !== "fallback";

  return (
    <div className="absolute inset-0" data-gateway-stage={show3d ? (ready ? "3d" : "loading") : "static"}>
      <div
        data-gateway-static
        className="absolute inset-0 transition-opacity duration-700 lg:left-[28%]"
        style={{ opacity: show3d && ready ? 0 : 1 }}
      >
        <GatewayArt className="size-full" />
      </div>
      {show3d && (
        <div className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: ready ? 1 : 0 }}>
          <CanvasBoundary key={tier}>
            <GatewayCanvas key={tier} tier={tier} onFail={gateway.fail} />
          </CanvasBoundary>
        </div>
      )}
    </div>
  );
}
