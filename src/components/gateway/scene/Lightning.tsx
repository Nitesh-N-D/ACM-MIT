"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { gateway } from "@/lib/gateway/store";
import { Glow } from "./Glow";
import { PLATFORM_CENTER, SWORD_HILT, SWORD_SOCKET } from "./motion";
import { glowTexture, rng } from "./textures";
import { clamp01, useScene } from "./state";

/**
 * The lightning the sword calls down when it is struck into the lock.
 *
 * One massive bolt, built in 3D the way real lightning forms:
 * - A fractal channel (recursive midpoint displacement) from high in the sky
 *   to the sword's pommel, with branches and sub-branches forking downward.
 * - The stepped leader feels its way down while the blade falls (its front is
 *   driven by ch.strike, so it arrives exactly as the blade meets the lock).
 * - The return stroke: the whole channel blazes white, then two re-strikes
 *   down the same channel, then an afterglow.
 * - Electricity crawling down the blade and arcing out across the platform,
 *   shockwave rings, sparks, and the whole frame flashing.
 *
 * The camera shake lives in the camera rig (ch.shake). The bolt is drawn as
 * camera-facing ribbons with a white-hot core and a violet glow. Three flashes
 * in the first half second and none after, partial brightness on the full
 * frame: inside photosensitivity guidance (no more than three per second).
 */

/** Where the bolt is born: high and behind the gate. */
const SKY = new THREE.Vector3(-55, 165, -80);
/** Where it lands: the sword's pommel, just above his hands. */
const POMMEL = SWORD_HILT.clone().add(new THREE.Vector3(0, 0.45, 0.25));

/** Seconds after impact: the return stroke and two re-strikes. */
const STROKES = [
  { at: 0, peak: 1, hold: 0.055, fall: 0.09 },
  { at: 0.2, peak: 0.85, hold: 0.035, fall: 0.08 },
  { at: 0.43, peak: 0.7, hold: 0.03, fall: 0.1 },
];
const AFTERGLOW = 1.3;
const CRACKLE = 1.5;
const SPARKS = 260;
const SPARK_LIFE = 1.9;

/** Main-channel brightness s seconds after impact. */
function strokeLevel(s: number) {
  if (s < 0) return 0;
  let k = 0;
  for (const st of STROKES) {
    const u = s - st.at;
    if (u < 0) continue;
    k = Math.max(k, u < st.hold ? st.peak : st.peak * Math.exp(-(u - st.hold) / st.fall));
  }
  // The channel keeps a faint glow as it cools.
  return Math.max(k, s < AFTERGLOW ? 0.14 * (1 - s / AFTERGLOW) ** 2 : 0);
}

/* ------------------------------------------------------------------ */
/* Ribbons: camera-facing quads, one per channel segment.              */
/* ------------------------------------------------------------------ */

const RIBBON_VERT = /* glsl */ `
attribute vec3 aDir;
attribute float aSide;
attribute float aWidth;
attribute float aBright;
attribute float aArrive;
attribute float aMain;
varying float vSide;
varying float vBright;
varying float vArrive;
varying float vMain;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 d = (modelViewMatrix * vec4(aDir, 0.0)).xyz;
  vec3 c = cross(d, mv.xyz);
  float l = length(c);
  vec3 s = l > 1e-6 ? c / l : vec3(1.0, 0.0, 0.0);
  mv.xyz += s * aSide * aWidth;
  vSide = aSide;
  vBright = aBright;
  vArrive = aArrive;
  vMain = aMain;
  gl_Position = projectionMatrix * mv;
}`;

const RIBBON_FRAG = /* glsl */ `
uniform float uLead;
uniform float uLeader;
uniform float uStroke;
uniform float uBranch;
uniform vec3 uCore;
uniform vec3 uGlow;
varying float vSide;
varying float vBright;
varying float vArrive;
varying float vMain;
void main() {
  float x = abs(vSide);
  // A white-hot core, a hot inner sheath and a wide soft glow.
  float core = 1.0 - smoothstep(0.05, 0.13, x);
  float sheath = exp(-x * 9.0);
  float glow = exp(-x * 3.2) * (1.0 - x);
  float shown = step(vArrive, uLead);
  float tip = exp(-max(0.0, uLead - vArrive) * 22.0);
  float lit = mix(uBranch, uStroke, vMain) + uLeader * (0.2 + 0.8 * tip);
  float k = shown * vBright * lit;
  vec3 col = uCore * (core * 2.2 + sheath * 0.6) + uGlow * glow * 0.75;
  gl_FragColor = vec4(col * k, 1.0);
}`;

class Ribbon {
  readonly geo = new THREE.BufferGeometry();
  private n = 0;
  private readonly attrs: Record<string, THREE.BufferAttribute>;

  constructor(private readonly cap: number) {
    const v = cap * 4;
    const mk = (size: number) => new THREE.BufferAttribute(new Float32Array(v * size), size).setUsage(THREE.DynamicDrawUsage);
    this.attrs = {
      position: mk(3),
      aDir: mk(3),
      aSide: mk(1),
      aWidth: mk(1),
      aBright: mk(1),
      aArrive: mk(1),
      aMain: mk(1),
    };
    for (const [k, a] of Object.entries(this.attrs)) this.geo.setAttribute(k, a);
    const idx = new Uint32Array(cap * 6);
    for (let i = 0; i < cap; i++) idx.set([i * 4, i * 4 + 2, i * 4 + 1, i * 4 + 1, i * 4 + 2, i * 4 + 3], i * 6);
    this.geo.setIndex(new THREE.BufferAttribute(idx, 1));
    this.geo.setDrawRange(0, 0);
  }

  clear() {
    this.n = 0;
  }

  /** A segment a → b; `arrive` is when the leader reaches each end (0 sky … 1 ground). */
  seg(a: THREE.Vector3, b: THREE.Vector3, width: number, bright: number, arriveA: number, arriveB: number, main: number) {
    if (this.n >= this.cap) return;
    const A = this.attrs;
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    for (let j = 0; j < 4; j++) {
      const v = this.n * 4 + j;
      const end = j >= 2 ? b : a;
      A.position!.setXYZ(v, end.x, end.y, end.z);
      A.aDir!.setXYZ(v, dx, dy, dz);
      A.aSide!.setX(v, j % 2 === 0 ? -1 : 1);
      A.aWidth!.setX(v, width);
      A.aBright!.setX(v, bright);
      A.aArrive!.setX(v, j >= 2 ? arriveB : arriveA);
      A.aMain!.setX(v, main);
    }
    this.n++;
  }

  commit() {
    for (const a of Object.values(this.attrs)) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.n * 4 * a.itemSize);
      a.needsUpdate = true;
    }
    this.geo.setDrawRange(0, this.n * 6);
  }
}

const ribbonMaterial = (core: string, glow: string) =>
  new THREE.ShaderMaterial({
    vertexShader: RIBBON_VERT,
    fragmentShader: RIBBON_FRAG,
    uniforms: {
      uLead: { value: 0 },
      uLeader: { value: 0 },
      uStroke: { value: 0 },
      uBranch: { value: 0 },
      uCore: { value: new THREE.Color(core) },
      uGlow: { value: new THREE.Color(glow) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: false,
  });

/* ------------------------------------------------------------------ */
/* The channel.                                                       */
/* ------------------------------------------------------------------ */

const _d = new THREE.Vector3();
const _p = new THREE.Vector3();

/** A random direction across the line a → b. */
function across(a: THREE.Vector3, b: THREE.Vector3, out: THREE.Vector3) {
  _d.subVectors(b, a).normalize();
  out.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  out.addScaledVector(_d, -out.dot(_d));
  return out.lengthSq() < 1e-8 ? out.set(1, 0, 0) : out.normalize();
}

/**
 * Recursive midpoint displacement: split every segment, push the midpoint
 * across the line, halve the push, repeat. That gives the self-similar,
 * zig-zag-at-every-scale look of a real channel.
 */
function fractal(a: THREE.Vector3, b: THREE.Vector3, levels: number, rough: number, flat = false) {
  let pts = [a.clone(), b.clone()];
  for (let l = 0; l < levels; l++) {
    const next: THREE.Vector3[] = [pts[0]!];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i]!, q = pts[i + 1]!;
      // The push scales with the segment, so it is jagged at every scale.
      const amp = p.distanceTo(q) * rough;
      across(p, q, _p);
      if (flat) _p.y *= 0.15;
      next.push(new THREE.Vector3().lerpVectors(p, q, 0.5 + (Math.random() - 0.5) * 0.24).addScaledVector(_p, (Math.random() * 2 - 1) * amp), q);
    }
    pts = next;
  }
  return pts;
}

type Opts = { width: number; bright: number; main: number };

/** Lay a polyline into a ribbon, with the leader reaching it from `arrive0` at `speed`. */
function lay(r: Ribbon, pts: THREE.Vector3[], o: Opts, arrive0: number, perUnit: number) {
  let arrive = arrive0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!, b = pts[i + 1]!;
    const next = arrive + a.distanceTo(b) * perUnit;
    r.seg(a, b, o.width, o.bright, arrive, next, o.main);
    arrive = next;
  }
}

/** Forks off a channel, heading roughly the same way, and their own forks. */
function branches(r: Ribbon, pts: THREE.Vector3[], o: Opts, arrive0: number, perUnit: number, count: number, depth: number, end: THREE.Vector3) {
  const total = pts.length - 1;
  const arrivals: number[] = [arrive0];
  for (let i = 0; i < total; i++) arrivals.push(arrivals[i]! + pts[i]!.distanceTo(pts[i + 1]!) * perUnit);
  for (let k = 0; k < count; k++) {
    // Most forks come off the lower channel, where they are in view.
    const i = Math.floor(total * (0.04 + Math.sqrt(Math.random()) * 0.88));
    const start = pts[i]!;
    const dir = new THREE.Vector3().subVectors(pts[Math.min(total, i + 4)]!, start).normalize();
    const side = across(start, pts[Math.min(total, i + 4)]!, new THREE.Vector3());
    dir.addScaledVector(side, 0.45 + Math.random() * 0.75);
    dir.y -= 0.25;
    dir.normalize();
    const len = start.distanceTo(end) * (0.12 + Math.random() * 0.26);
    const tip = start.clone().addScaledVector(dir, len);
    const b = fractal(start, tip, depth > 1 ? 5 : 4, 0.3);
    const bo = { width: o.width * 0.55, bright: o.bright * (0.45 + Math.random() * 0.25), main: 0 };
    // Branches creep slower than the leader's main front.
    lay(r, b, bo, arrivals[i]!, perUnit * 1.35);
    if (depth > 1) branches(r, b, bo, arrivals[i]!, perUnit * 1.35, 2, depth - 1, tip);
  }
}

/** The whole bolt: main channel from the sky to the pommel, and its branches. */
function buildBolt(r: Ribbon) {
  r.clear();
  // The channel wanders: a bow out in the sky, then the final jump comes in
  // from his left side, clear of his helm, onto the pommel.
  const mid = new THREE.Vector3().lerpVectors(SKY, POMMEL, 0.5).add(new THREE.Vector3(14 + Math.random() * 10, 0, 8));
  const jump = POMMEL.clone().add(new THREE.Vector3(-6.5 - Math.random() * 2, 8.5 + Math.random() * 2, 2.5));
  const main = [
    ...fractal(SKY, mid, 6, 0.3),
    ...fractal(mid, jump, 7, 0.3).slice(1),
    ...fractal(jump, POMMEL, 6, 0.3).slice(1),
  ];
  let len = 0;
  for (let i = 0; i < main.length - 1; i++) len += main[i]!.distanceTo(main[i + 1]!);
  const perUnit = 1 / len;
  const o = { width: 0.8, bright: 1, main: 1 };
  lay(r, main, o, 0, perUnit);
  branches(r, main, o, 0, perUnit, 22, 2, POMMEL);
  r.commit();
}

/** Arcs crawling down the blade and spidering out across the platform. */
function buildCrackle(r: Ribbon, reach: number) {
  r.clear();
  const floor = PLATFORM_CENTER.y + 0.09;
  // Down the blade, into the lock.
  for (let k = 0; k < 3; k++) {
    lay(r, fractal(POMMEL, SWORD_SOCKET, 4, 0.06), { width: 0.18, bright: 0.9, main: 1 }, 0, 0);
  }
  // Out across the dais.
  const arcs = 9;
  const c = new THREE.Vector3(PLATFORM_CENTER.x, floor, PLATFORM_CENTER.z);
  for (let k = 0; k < arcs; k++) {
    const ang = (k / arcs) * Math.PI * 2 + Math.random() * 0.5;
    const len = (3.5 + Math.random() * 5.5) * reach;
    const end = new THREE.Vector3(c.x + Math.cos(ang) * len, floor, c.z + Math.sin(ang) * len);
    const pts = fractal(c, end, 4, 0.22, true).map((p) => p.setY(floor + Math.random() * 0.12));
    lay(r, pts, { width: 0.16, bright: 0.85, main: 1 }, 0, 0);
    // A fork off each arc.
    const j = 3 + Math.floor(Math.random() * 8);
    const s = pts[j]!;
    const fe = new THREE.Vector3(s.x + Math.cos(ang + 0.8 * (Math.random() - 0.5) * 2) * len * 0.4, floor, s.z + Math.sin(ang + 0.8 * (Math.random() - 0.5) * 2) * len * 0.4);
    lay(r, fractal(s, fe, 3, 0.25, true).map((p) => p.setY(floor + 0.03)), { width: 0.1, bright: 0.6, main: 1 }, 0, 0);
  }
  r.commit();
}

/* ------------------------------------------------------------------ */
/* Full-frame flash, and the gloom that gathers before the strike.     */
/* ------------------------------------------------------------------ */

const SCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const GLOOM_FRAG = /* glsl */ `
uniform float uGloom;
varying vec2 vUv;
void main() {
  float edge = smoothstep(0.15, 0.78, length((vUv - 0.5) * vec2(1.25, 1.0)));
  gl_FragColor = vec4(0.005, 0.01, 0.03, uGloom * (0.2 + 0.55 * edge));
}`;

/** The flash, brightest where the bolt is (top of frame). */
const FLASH_FRAG = /* glsl */ `
uniform float uFlash;
varying vec2 vUv;
void main() {
  vec3 col = vec3(0.62, 0.68, 1.0) * (0.22 + 0.2 * vUv.y);
  gl_FragColor = vec4(col * uFlash, 1.0);
}`;

export function Lightning() {
  const { ch } = useScene();
  const scene = useThree((s) => s.scene);

  const parts = useMemo(() => {
    const bolt = new Ribbon(2400);
    const boltMat = ribbonMaterial("#ffffff", "#8f7dff");
    const crackle = new Ribbon(260);
    const crackleMat = ribbonMaterial("#f2f6ff", "#6fa8ff");
    crackleMat.uniforms.uLead!.value = 9;
    const quad = new THREE.PlaneGeometry(2, 2);
    const screenMat = (frag: string, uniform: string, additive: boolean) =>
      new THREE.ShaderMaterial({
        vertexShader: SCREEN_VERT,
        fragmentShader: frag,
        uniforms: { [uniform]: { value: 0 } },
        transparent: true,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthTest: false,
        depthWrite: false,
        fog: false,
      });
    const gloom = screenMat(GLOOM_FRAG, "uGloom", false);
    const flash = screenMat(FLASH_FRAG, "uFlash", true);
    return { bolt, boltMat, crackle, crackleMat, quad, gloom, flash };
  }, []);

  const sparks = useMemo(() => {
    const vel = new Float32Array(SPARKS * 3);
    const random = rng(907);
    for (let i = 0; i < SPARKS; i++) {
      const a = random() * Math.PI * 2;
      const s = 3 + random() * 12;
      vel.set([Math.cos(a) * s, 3 + random() * 11, Math.sin(a) * s], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
    const mat = new THREE.PointsMaterial({ map: glowTexture(), color: "#dfe9ff", size: 0.4, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    return { vel, geo, mat };
  }, []);

  const shock = useMemo(
    () => ({
      geo: new THREE.RingGeometry(0.86, 1, 96),
      mats: [0, 1].map(() => new THREE.MeshBasicMaterial({ color: "#e6f0ff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide })),
    }),
    [],
  );

  useEffect(
    () => () => {
      parts.bolt.geo.dispose();
      parts.boltMat.dispose();
      parts.crackle.geo.dispose();
      parts.crackleMat.dispose();
      parts.quad.dispose();
      parts.gloom.dispose();
      parts.flash.dispose();
      sparks.geo.dispose();
      sparks.mat.dispose();
      shock.geo.dispose();
      shock.mats.forEach((m) => m.dispose());
    },
    [parts, sparks, shock],
  );

  const boltRef = useRef<THREE.Mesh>(null);
  const crackleRef = useRef<THREE.Mesh>(null);
  const gloomRef = useRef<THREE.Mesh>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const sparkRef = useRef<THREE.Points>(null);
  const shockRefs = useRef<(THREE.Mesh | null)[]>([]);
  const flashLight = useRef<THREE.DirectionalLight>(null);
  const strikeLight = useRef<THREE.PointLight>(null);
  const run = useRef({
    prevStrike: ch.strike,
    leading: false,
    impactAt: -99,
    nextCrackle: 0,
    wasFlashing: false,
    base: null as null | { bg: THREE.Color; fog: THREE.Color },
  });
  const flashColor = useMemo(() => new THREE.Color("#3a3f8a"), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const r = run.current;
    const intro = gateway.get().phase === "intro";
    const { boltMat, crackleMat } = parts;

    // The leader sets off as the blade starts down, and reaches the pommel as
    // the blade reaches the lock: its front rides on ch.strike.
    if (intro && !r.leading && r.prevStrike < 0.1 && ch.strike >= 0.1 && ch.strike < 0.999) {
      r.leading = true;
      buildBolt(parts.bolt);
    }
    if (r.prevStrike < 0.999 && ch.strike >= 0.999 && intro) {
      if (!r.leading) buildBolt(parts.bolt);
      r.leading = false;
      r.impactAt = t;
      r.nextCrackle = t;
    }
    r.prevStrike = ch.strike;
    const since = t - r.impactAt;

    // The bolt.
    let main = 0;
    if (r.leading) {
      // Stepped: the leader lurches down in bursts.
      const u = clamp01((ch.strike - 0.1) / 0.9) ** 0.6;
      boltMat.uniforms.uLead!.value = Math.floor(u * 24) / 24 + 0.015;
      boltMat.uniforms.uLeader!.value = 0.5;
      boltMat.uniforms.uStroke!.value = 0;
      boltMat.uniforms.uBranch!.value = 0;
    } else if (since >= 0 && since < AFTERGLOW) {
      main = strokeLevel(since);
      boltMat.uniforms.uLead!.value = 9;
      boltMat.uniforms.uLeader!.value = 0;
      boltMat.uniforms.uStroke!.value = main;
      boltMat.uniforms.uBranch!.value = main * (since < 0.12 ? 0.85 : Math.max(0, 0.85 - (since - 0.12) * 2.4));
    }
    if (boltRef.current) boltRef.current.visible = r.leading || (since >= 0 && since < AFTERGLOW);

    // Electricity down the blade and across the platform, re-forming every few frames.
    const crackling = since >= 0 && since < CRACKLE;
    if (crackleRef.current) crackleRef.current.visible = crackling;
    if (crackling) {
      if (t >= r.nextCrackle) {
        buildCrackle(parts.crackle, 0.55 + 0.45 * Math.min(1, since * 5));
        r.nextCrackle = t + 0.055 + Math.random() * 0.03;
        crackleMat.uniforms.uStroke!.value = (1 - since / CRACKLE) ** 1.4 * (0.55 + 0.45 * Math.random());
      }
    }

    // The flash on everything.
    const flash = main;
    parts.flash.uniforms.uFlash!.value = flash;
    if (flashRef.current) flashRef.current.visible = flash > 0.003;
    if (flashLight.current) flashLight.current.intensity = flash * 7;
    if (strikeLight.current) strikeLight.current.intensity = since >= 0 && since < 1.8 ? Math.max(main, 0.35 * (1 - since / 1.8) ** 2) * 120 : 0;

    if (!r.base) {
      const bg = scene.background instanceof THREE.Color ? scene.background.clone() : null;
      const fog = scene.fog ? scene.fog.color.clone() : null;
      if (bg && fog) r.base = { bg, fog };
    }
    if (r.base && (flash > 0.002 || r.wasFlashing)) {
      if (scene.background instanceof THREE.Color) scene.background.copy(r.base.bg).lerp(flashColor, flash * 0.55);
      scene.fog?.color.copy(r.base.fog).lerp(flashColor, flash * 0.35);
      r.wasFlashing = flash > 0.002;
    }

    // The world darkens as he raises the sword, and lifts after.
    const gloom = clamp01(ch.gloom);
    parts.gloom.uniforms.uGloom!.value = gloom;
    if (gloomRef.current) gloomRef.current.visible = gloom > 0.003;

    // Shockwaves across the platform and sparks thrown from the lock.
    shockRefs.current.forEach((m, i) => {
      if (!m) return;
      const u = clamp01((since - i * 0.14) / (1.1 + i * 0.5));
      const on = since >= i * 0.14 && u < 1;
      m.visible = on;
      if (!on) return;
      const s = 0.6 + (1 - (1 - u) ** 3) * (i === 0 ? 16 : 10);
      m.scale.set(s, s, 1);
      shock.mats[i]!.opacity = (1 - u) ** 1.6 * (i === 0 ? 1 : 0.6);
    });
    if (sparkRef.current) {
      const on = since >= 0 && since < SPARK_LIFE;
      sparkRef.current.visible = on;
      if (on) {
        const p = sparks.geo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < SPARKS; i++) {
          const tt = since * (0.6 + (i % 7) * 0.08);
          const vx = sparks.vel[i * 3]!, vy = sparks.vel[i * 3 + 1]!, vz = sparks.vel[i * 3 + 2]!;
          p.setXYZ(i, PLATFORM_CENTER.x + vx * tt, Math.max(PLATFORM_CENTER.y + 0.05, PLATFORM_CENTER.y + 0.2 + vy * tt - 9.8 * tt * tt), PLATFORM_CENTER.z + vz * tt);
        }
        p.needsUpdate = true;
        sparks.mat.opacity = (1 - since / SPARK_LIFE) ** 1.3;
      }
    }
  });

  return (
    <>
      <mesh ref={boltRef} geometry={parts.bolt.geo} material={parts.boltMat} renderOrder={6} frustumCulled={false} visible={false} />
      <mesh ref={crackleRef} geometry={parts.crackle.geo} material={parts.crackleMat} renderOrder={6} frustumCulled={false} visible={false} />
      <directionalLight ref={flashLight} position={[SKY.x * 0.3, 60, SKY.z * 0.3]} color="#c9c6ff" intensity={0} />
      <pointLight ref={strikeLight} position={[POMMEL.x, POMMEL.y + 0.5, POMMEL.z + 1.2]} color="#d6dcff" intensity={0} distance={48} decay={2} />
      <group position={[PLATFORM_CENTER.x, PLATFORM_CENTER.y + 0.05, PLATFORM_CENTER.z]} rotation={[-Math.PI / 2, 0, 0]}>
        {shock.mats.map((m, i) => (
          <mesh key={i} ref={(el) => void (shockRefs.current[i] = el)} geometry={shock.geo} material={m} renderOrder={4} visible={false} />
        ))}
      </group>
      <points ref={sparkRef} geometry={sparks.geo} material={sparks.mat} frustumCulled={false} visible={false} />
      {/* Where the bolt meets the sword, and the lock below it, blaze white. */}
      <Glow
        position={[POMMEL.x, POMMEL.y, POMMEL.z + 0.4]}
        size={10}
        color="#e9e6ff"
        intensity={(t) => {
          const s = t - run.current.impactAt;
          return s >= 0 && s < AFTERGLOW ? strokeLevel(s) * 0.85 : 0;
        }}
      />
      <Glow
        position={[PLATFORM_CENTER.x, PLATFORM_CENTER.y + 0.6, PLATFORM_CENTER.z + 0.3]}
        size={11}
        color="#e8f2ff"
        intensity={(t) => {
          const s = t - run.current.impactAt;
          return s >= 0 && s < 1.8 ? (1 - s / 1.8) ** 2 : 0;
        }}
      />
      {/* Over everything, the full frame. */}
      <mesh ref={gloomRef} geometry={parts.quad} material={parts.gloom} renderOrder={998} frustumCulled={false} visible={false} />
      <mesh ref={flashRef} geometry={parts.quad} material={parts.flash} renderOrder={999} frustumCulled={false} visible={false} />
    </>
  );
}
