"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import * as THREE from "three";

const world = new THREE.Vector3();
const eye = new THREE.Vector3();

/**
 * A DOM label pinned to a point in the 3D world, centred on it, kept below
 * the HUD (z-index 0..5, nearer labels on top) and hidden when the point is
 * behind the camera.
 *
 * Replaces drei's <Html>, which unmounts its React root synchronously while
 * the canvas is being torn down ("Attempted to synchronously unmount a root
 * while React was already rendering"). Here the root is unmounted after the
 * current commit has finished, so the race cannot happen.
 */
export function OverlayLabel({ position, children }: { position: [number, number, number]; children: ReactNode }) {
  const anchor = useRef<THREE.Group>(null);
  const holder = useRef<{ el: HTMLDivElement; root: Root } | null>(null);
  const gl = useThree((s) => s.gl);

  useLayoutEffect(() => {
    const parent = gl.domElement.parentNode as HTMLElement | null;
    if (!parent) return;
    // A fresh element per mount: a container must never get a second root
    // while the previous one is still waiting to unmount.
    const el = document.createElement("div");
    el.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;will-change:transform;display:none";
    parent.appendChild(el);
    const root = createRoot(el);
    holder.current = { el, root };
    return () => {
      holder.current = null;
      el.style.display = "none";
      setTimeout(() => {
        root.unmount();
        el.remove();
      }, 0);
    };
  }, [gl]);

  // Children change rarely (they read live state through refs), but keep
  // the overlay in step with every render of the scene component.
  useLayoutEffect(() => {
    holder.current?.root.render(<div style={{ transform: "translate(-50%, -50%)", pointerEvents: "auto" }}>{children}</div>);
  });

  useFrame(({ camera, size }) => {
    const h = holder.current;
    const g = anchor.current;
    if (!h || !g) return;
    g.getWorldPosition(world);
    const distance = world.distanceTo(camera.getWorldPosition(eye));
    world.project(camera);
    if (world.z < -1 || world.z > 1) {
      h.el.style.display = "none";
      return;
    }
    const x = (world.x * 0.5 + 0.5) * size.width;
    const y = (-world.y * 0.5 + 0.5) * size.height;
    h.el.style.display = "";
    h.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    const far = (camera as THREE.PerspectiveCamera).far || 1000;
    h.el.style.zIndex = String(Math.max(0, Math.min(5, Math.round(5 * (1 - distance / far)))));
  });

  return <group ref={anchor} position={position} />;
}
