"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { gateway, useGateway } from "@/lib/gateway/store";
import { Artifact } from "./Artifact";
import { Gate } from "./Gate";
import { Motes, Starfield } from "./Particles";
import { Platform } from "./Platform";
import { Sentinel } from "./Sentinel";
import { Bridge, City, Ground } from "./World";
import { COLORS, FINAL, START, clamp01, useScene, type Channels } from "./state";

/* ---------------------------------------------------------------------------
 * Camera path: void → close-up of the Sentinel (A), then up over the
 * threshold into the final hero framing (B).
 * ------------------------------------------------------------------------- */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const PATH_A = new THREE.CatmullRomCurve3([v(0, 34, 96), v(-6, 16, 52), v(-2, 7.5, 24), v(0, 5.6, 12.5)]);
const LOOK_A = new THREE.CatmullRomCurve3([v(0, 22, 0), v(0, 10, -4), v(0, 6.5, -3), v(0, 5.6, -1.5)]);
const PATH_B = new THREE.CatmullRomCurve3([v(0, 5.6, 12.5), v(7, 8, 17), v(3, 10.5, 23), v(0, 10.5, 27)]);
const LOOK_B = new THREE.CatmullRomCurve3([v(0, 5.6, -1.5), v(0, 6.5, -6), v(0, 7, -12), v(0, 7.2, -16)]);

function CameraRig() {
  const { ch } = useScene();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  const tmp = useMemo(() => ({ pos: v(0, 0, 0), look: v(0, 0, 0) }), []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const p = pointer.current;
    const k = 1 - Math.exp(-dt * 2.5);
    p.sx += (p.x - p.sx) * k;
    p.sy += (p.y - p.sy) * k;

    if (ch.camB > 0) {
      PATH_B.getPoint(ch.camB, tmp.pos);
      LOOK_B.getPoint(ch.camB, tmp.look);
    } else {
      PATH_A.getPoint(ch.camA, tmp.pos);
      LOOK_A.getPoint(ch.camA, tmp.look);
    }

    // Ambient sway + pointer parallax, strongest once settled.
    const settle = ch.frame;
    tmp.pos.x += Math.sin(t * 0.17) * 0.6 * settle + p.sx * 1.6 * settle;
    tmp.pos.y += Math.sin(t * 0.23) * 0.25 * settle - p.sy * 0.7 * settle;
    camera.position.copy(tmp.pos);
    camera.lookAt(tmp.look);

    // Wide screens: shift the monument right of the hero copy.
    const aspect = size.width / Math.max(1, size.height);
    const shift = clamp01((aspect - 1.05) / 0.75) * 0.17 * ch.frame;
    const offset = -shift * camera.filmGauge;
    if (Math.abs(camera.filmOffset - offset) > 1e-3) {
      camera.filmOffset = offset;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

/* ---------------------------------------------------------------------------
 * Director: the 15-step activation sequence as one GSAP timeline.
 * ------------------------------------------------------------------------- */

type Cue = { step: number; at: number; tweens: [keyof Channels, number, string?][] };

const CUES: Cue[] = [
  { step: 0, at: 0, tweens: [["stars", 2.2]] },
  { step: 1, at: 0.3, tweens: [["camA", 6.6, "power2.inOut"]] },
  { step: 2, at: 1.2, tweens: [["gate", 2.2]] },
  { step: 3, at: 2.4, tweens: [["visor", 0.9]] },
  { step: 4, at: 3.0, tweens: [["platform", 1.8, "power1.inOut"]] },
  { step: 5, at: 3.8, tweens: [["crystal", 1.4]] },
  { step: 6, at: 4.6, tweens: [["rings", 1.6]] },
  { step: 7, at: 5.6, tweens: [["lift", 1.4, "power2.inOut"]] },
  { step: 8, at: 6.6, tweens: [["pulse", 0.9, "none"]] },
  { step: 9, at: 7.2, tweens: [["seam", 0.6]] },
  { step: 10, at: 7.8, tweens: [["doors", 1.7, "power2.inOut"]] },
  { step: 11, at: 8.4, tweens: [["flood", 1.1]] },
  { step: 12, at: 9.2, tweens: [["bridge", 1.9, "power1.in"]] },
  { step: 13, at: 9.6, tweens: [["camB", 3.4, "power2.inOut"], ["frame", 3.4, "power2.inOut"]] },
  { step: 14, at: 10.4, tweens: [["city", 2.4]] },
];
const COMPLETE_AT = 12.2;

function Director() {
  const { ch } = useScene();
  const { gl, scene, camera } = useThree();
  const skipToken = useGateway((s) => s.skipToken);
  const replayToken = useGateway((s) => s.replayToken);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const firstFrame = useRef(false);

  // Upload all shaders/programs before the first visible frame.
  useEffect(() => {
    gl.compile(scene, camera);
  }, [gl, scene, camera]);

  // The timeline is paused and advanced from the render loop: it stays in
  // sync with what is drawn, and a capped step keeps slow GPUs from either
  // stalling the sequence or skipping whole beats in one frame.
  useFrame((_, dt) => {
    const t = tl.current;
    if (t && t.progress() < 1) t.time(t.time() + Math.min(dt, 0.25), false);
    if (!firstFrame.current) {
      firstFrame.current = true;
      // Defer one tick so the frame is actually on screen.
      requestAnimationFrame(() => gateway.setReady(true));
    }
  });

  // Play (or replay) the intro; otherwise jump straight to the final state.
  useEffect(() => {
    tl.current?.kill();
    if (gateway.get().phase !== "intro") {
      Object.assign(ch, FINAL);
      return;
    }
    Object.assign(ch, START);
    const t = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
    for (const cue of CUES) {
      t.call(() => gateway.setStep(cue.step), undefined, cue.at);
      for (const [key, dur, ease] of cue.tweens) {
        t.fromTo(ch, { [key]: 0 }, { [key]: 1, duration: dur, ease: ease ?? "power2.out", immediateRender: false }, cue.at);
      }
    }
    t.call(() => gateway.complete(), undefined, COMPLETE_AT);
    tl.current = t;
    return () => {
      t.kill();
    };
    // replayToken restarts the sequence.
  }, [ch, replayToken]);

  // Skip: settle everything immediately.
  useEffect(() => {
    if (!skipToken) return;
    tl.current?.kill();
    Object.assign(ch, FINAL);
    gateway.complete();
  }, [ch, skipToken]);

  return null;
}

/* ---------------------------------------------------------------------------
 * Lighting
 * ------------------------------------------------------------------------- */

function Lights() {
  const { tier } = useScene();
  return (
    <>
      <hemisphereLight args={["#6f8dff", "#050816", tier.environment ? 0.55 : 1.1]} />
      <directionalLight position={[-9, 14, 18]} intensity={1.5} color="#cfe0ff" />
      <directionalLight position={[6, 9, -24]} intensity={2.2} color={COLORS.cyan} />
      {tier.environment && (
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={1.6} color="#7f9cff" position={[0, 6, 14]} scale={[16, 4, 1]} />
          <Lightformer form="rect" intensity={2.4} color={COLORS.cyan} position={[0, 8, -16]} scale={[10, 10, 1]} />
          <Lightformer form="ring" intensity={1.2} color="#ffffff" position={[-10, 10, 4]} scale={4} />
          <Lightformer form="rect" intensity={0.8} color={COLORS.violet} position={[12, 4, 2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
        </Environment>
      )}
    </>
  );
}

/** Everything inside the canvas. */
export function GatewayScene() {
  return (
    <>
      <color attach="background" args={[COLORS.void]} />
      <fogExp2 attach="fog" args={[COLORS.fog, 0.0085]} />
      <Lights />
      <Starfield />
      <Ground />
      <Platform />
      <Motes />
      <Sentinel />
      <Artifact />
      <Gate />
      <Bridge />
      <City />
      <CameraRig />
      <Director />
    </>
  );
}
