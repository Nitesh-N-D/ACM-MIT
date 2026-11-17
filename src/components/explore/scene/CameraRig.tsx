"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { GROUND_Y } from "@/components/world/layout";
import { TOUR, destination, isInterior } from "../destinations";
import { cameraInput, explore } from "../store";

/**
 * Orbit camera for the NEXUS world.
 *
 * - Drag rotates; azimuth is unbounded, so the view turns through a full
 *   360 degrees and keeps going.
 * - Vertical drag tilts within a comfortable range.
 * - Wheel and two-finger pinch zoom, limited per destination.
 * - Everything is damped: input moves a goal, the camera eases toward it.
 * - Travelling to a destination moves the orbit centre, radius and angle.
 * - Stepping into or out of a district interior is a cut (the HUD fades
 *   through it): the rooms lie below the city, so easing would cross the
 *   ground.
 */

const POL_MIN = 0.3;
const POL_MAX = 1.52;
const TAU = Math.PI * 2;
const TOUR_SECONDS = 9;

type Orbit = { x: number; y: number; z: number; r: number; az: number; pol: number };

declare global {
  interface Window {
    /** Read-only camera state for automated QA. */
    __nexusExploreCam?: Orbit;
    /** Where the camera is easing towards (QA may pin both to frame a view). */
    __nexusExploreGoal?: Orbit;
  }
}

export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  // Starts far out and high so the first seconds read as an arrival.
  const cur = useRef<Orbit>({ x: 0, y: 20, z: -40, r: 330, az: 0.55, pol: 0.78 });
  const goal = useRef<Orbit>({ x: 0, y: 6, z: -50, r: 150, az: 0, pol: 1.0 });
  const limits = useRef({ min: 60, max: 240 });
  const seen = useRef(-1);
  const inside = useRef(false);
  const floor = useRef(GROUND_Y + 1.2);
  const drag = useRef({ active: false, idle: 0, tour: 0 });

  useEffect(() => {
    const el = gl.domElement;
    const g = goal.current;
    const d = drag.current;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;

    const spread = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const clampR = () => {
      g.r = Math.min(limits.current.max, Math.max(limits.current.min, g.r));
    };

    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      d.active = true;
      if (pointers.size === 2) pinch = spread();
    };
    const move = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      d.idle = 0;
      if (pointers.size >= 2) {
        const s = spread();
        if (pinch > 0 && s > 0) {
          g.r *= pinch / s;
          clampR();
        }
        pinch = s;
      } else {
        g.az -= dx * 0.0052;
        g.pol = Math.min(POL_MAX, Math.max(POL_MIN, g.pol - dy * 0.004));
      }
      if (Math.abs(dx) + Math.abs(dy) > 1) explore.steer();
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinch = 0;
      d.active = pointers.size > 0;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      g.r *= Math.exp(Math.max(-120, Math.min(120, e.deltaY)) * 0.0014);
      clampR();
      d.idle = 0;
      explore.steer();
    };

    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useEffect(() => {
    window.__nexusExploreCam = cur.current;
    window.__nexusExploreGoal = goal.current;
    return () => {
      delete window.__nexusExploreCam;
      delete window.__nexusExploreGoal;
    };
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = explore.get();
    const g = goal.current;
    const c = cur.current;
    const d = drag.current;

    // Travel to a newly chosen destination.
    if (s.travel !== seen.current) {
      seen.current = s.travel;
      const dest = destination(s.focus);
      [g.x, g.y, g.z] = dest.target;
      g.r = dest.radius;
      g.pol = dest.pol;
      const az = s.travelAz ?? dest.az;
      // Take the shortest way round rather than unwinding earlier turns.
      g.az = az + TAU * Math.round((g.az - az) / TAU);
      limits.current = { min: dest.min, max: dest.max };
      floor.current = dest.floor ?? GROUND_Y + 1.2;
      d.tour = 0;
      if (isInterior(s.focus) !== inside.current) {
        inside.current = !inside.current;
        Object.assign(c, g);
      }
    }

    // Button nudges.
    if (cameraInput.zoom !== 0) {
      g.r = Math.min(limits.current.max, Math.max(limits.current.min, g.r * Math.exp(cameraInput.zoom)));
      cameraInput.zoom = 0;
    }
    if (cameraInput.rotate !== 0) {
      g.az += cameraInput.rotate;
      cameraInput.rotate = 0;
    }

    // Cinematic tour and optional auto-rotation.
    d.idle += dt;
    if (s.mode === "cinematic") {
      d.tour += dt;
      if (!reducedMotion) g.az += dt * 0.07;
      if (d.tour > TOUR_SECONDS) {
        const next = TOUR[(TOUR.indexOf(s.focus) + 1) % TOUR.length]!;
        explore.tour(next);
      }
    } else if (s.autoRotate && !d.active && !reducedMotion) {
      g.az += dt * 0.09;
    }

    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2);
    c.x += (g.x - c.x) * k;
    c.y += (g.y - c.y) * k;
    c.z += (g.z - c.z) * k;
    c.r += (g.r - c.r) * k;
    c.az += (g.az - c.az) * k;
    c.pol += (g.pol - c.pol) * k;

    const sin = Math.sin(c.pol);
    camera.position.set(
      c.x + c.r * sin * Math.sin(c.az),
      // Never dip below the ground (or an interior's floor).
      Math.max(floor.current, c.y + c.r * Math.cos(c.pol)),
      c.z + c.r * sin * Math.cos(c.az),
    );
    camera.lookAt(c.x, c.y, c.z);
  });

  return null;
}
