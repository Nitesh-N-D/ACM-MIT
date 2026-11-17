"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { territories } from "@/config/territories";
import { Ground as WorldGround } from "@/components/world/CityBlocks";
import { Fabric } from "@/components/world/Fabric";
import { Landmark } from "@/components/world/landmarks";
import { DISTRICT_POS, GROUND_Y } from "@/components/world/layout";
import { Glow } from "./Glow";
import { COLORS, clamp01, sub, useScene } from "./state";

/* ---------------------------------------------------------------------------
 * The NEXUS Bridge — a structural causeway that assembles itself across the
 * chasm as energy travels along it:
 *   1 conduit ignites  2 energy head advances  3 deck sections rise and lock
 *   4 girders + ribs seat  5 rails extend  6 pylons light in sequence
 *   7 stay cables energise  8 flow channels run  9 link reaches the Core.
 * ------------------------------------------------------------------------- */

const BRIDGE_START = -6.8;
const SECTION = 3.2;
const SECTIONS = 16;
const BRIDGE_LEN = SECTION * SECTIONS;
const DECK_W = 7;
const PYLON_AT = [2, 6, 10, 14];
const PYLON_X = 4.9;
const PYLON_TOP = 10;

const sectionZ = (i: number) => BRIDGE_START - SECTION * (i + 0.5);
const sectionStart = (i: number) => (i / SECTIONS) * 0.74;

/** Instances per deck section: [x, y, z-offset, sx, sy, sz]. */
const SECTION_PARTS: [number, number, number, number, number, number][] = [
  [0, -0.32, 0, DECK_W, 0.5, SECTION - 0.1],
  [-3.7, -0.2, 0, 0.5, 1.0, SECTION],
  [3.7, -0.2, 0, 0.5, 1.0, SECTION],
  [0, -0.9, 0, 8.2, 0.5, 0.6],
  [-3.7, 0.72, 0, 0.12, 0.9, 0.12],
  [3.7, 0.72, 0, 0.12, 0.9, 0.12],
  [-3.7, 1.18, 0, 0.1, 0.1, SECTION],
  [3.7, 1.18, 0, 0.1, 0.1, SECTION],
];

const bridgeVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const bridgeFrag = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  uniform vec3 uCore;
  uniform vec3 uEdge;
  varying vec2 vUv;
  void main() {
    float along = vUv.y;                       // 0 at platform, 1 at the Core
    if (along > uProgress) discard;
    float across = abs(vUv.x - 0.5) * 2.0;     // 0 centre, 1 edge
    float core = smoothstep(0.1, 0.0, across);
    float lane = smoothstep(0.035, 0.0, abs(across - 0.5));
    float edge = smoothstep(0.045, 0.0, abs(across - 0.9));
    // Chevrons flowing toward the city.
    float chev = smoothstep(0.75, 1.0, fract(along * 26.0 - uTime * 0.9 + across * 0.9)) * step(across, 0.86);
    float flow = 0.6 + 0.4 * sin(along * 150.0 - uTime * 6.0);
    float head = smoothstep(uProgress - 0.05, uProgress, along);
    vec3 col = uCore * (core * flow + lane * 0.5 + chev * 0.16) + uEdge * edge * 1.5 + vec3(1.0) * head * 1.4;
    float a = core * 0.9 + lane * 0.4 + edge * 0.9 + chev * 0.16 + head;
    gl_FragColor = vec4(col, a);
  }
`;

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

export function Bridge() {
  const { ch } = useScene();
  const deck = useRef<THREE.InstancedMesh>(null);
  const spark = useRef<THREE.Group>(null);
  const last = useRef(-1);

  const mats = useMemo(
    () => ({
      deck: new THREE.MeshStandardMaterial({ color: "#131f48", metalness: 0.85, roughness: 0.34 }),
      pylon: new THREE.MeshStandardMaterial({ color: "#0f1a3e", metalness: 0.8, roughness: 0.32, flatShading: true }),
      arch: new THREE.MeshStandardMaterial({ color: "#0b1330", metalness: 0.75, roughness: 0.42, flatShading: true }),
      lit: PYLON_AT.map(() => new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0, toneMapped: false })),
      cable: new THREE.LineBasicMaterial({ color: "#6f86c4", transparent: true, opacity: 0.35 }),
      ribbon: new THREE.ShaderMaterial({
        vertexShader: bridgeVert,
        fragmentShader: bridgeFrag,
        uniforms: {
          uProgress: { value: 0 },
          uTime: { value: 0 },
          uCore: { value: new THREE.Color(COLORS.cyan) },
          uEdge: { value: new THREE.Color(COLORS.electric) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [],
  );

  const geo = useMemo(() => {
    const pts: number[] = [];
    for (const i of PYLON_AT) {
      for (const s of [-1, 1]) {
        for (const k of [-3, -2, -1, 1, 2, 3]) {
          pts.push(PYLON_X * s, PYLON_TOP - 0.4, sectionZ(i), 3.7 * s, 0.3, sectionZ(i) + k * SECTION * 0.62);
        }
      }
    }
    const cables = new THREE.BufferGeometry();
    cables.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return {
      box: new THREE.BoxGeometry(1, 1, 1),
      ribbon: new THREE.PlaneGeometry(DECK_W, BRIDGE_LEN, 1, 1),
      pylon: new THREE.CylinderGeometry(0.42, 1.7, 46, 4, 1).rotateY(Math.PI / 4),
      cap: new THREE.OctahedronGeometry(0.5, 0),
      strip: new THREE.BoxGeometry(0.1, 8.5, 0.1),
      arch: new THREE.TorusGeometry(13, 0.5, 6, 28, Math.PI),
      cables,
    };
  }, []);

  const o = useMemo(() => new THREE.Object3D(), []);

  const layout = (p: number) => {
    const m = deck.current;
    if (!m) return;
    let n = 0;
    for (let i = 0; i < SECTIONS; i++) {
      const e = easeOut(sub(p, sectionStart(i), sectionStart(i) + 0.26));
      const z = sectionZ(i);
      for (const [x, y, dz, sx, sy, sz] of SECTION_PARTS) {
        // Sections rise out of the chasm and scale into place.
        o.position.set(x * (0.6 + 0.4 * e), y - (1 - e) * 6, z + dz);
        o.scale.set(sx * e, sy * e, sz * e);
        o.rotation.set((1 - e) * 0.5, 0, 0);
        o.updateMatrix();
        m.setMatrixAt(n++, o.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    layout(ch.bridge);
    deck.current?.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(({ clock }) => {
    const p = clamp01(ch.bridge);
    if (p !== last.current) {
      last.current = p;
      layout(p);
    }
    const t = clock.elapsedTime;
    const energy = sub(p, 0.08, 1);
    mats.ribbon.uniforms.uProgress!.value = energy;
    mats.ribbon.uniforms.uTime!.value = t;
    mats.lit.forEach((m, k) => {
      const on = sub(p, sectionStart(PYLON_AT[k]!) + 0.12, sectionStart(PYLON_AT[k]!) + 0.3);
      m.opacity = on * (0.85 + 0.15 * Math.sin(t * 2.2 + k));
    });
    mats.cable.opacity = 0.3 + 0.5 * sub(p, 0.6, 1);
    mats.cable.color.set(p > 0.6 ? "#8fd8ff" : "#6f86c4");
    if (spark.current) {
      spark.current.position.z = BRIDGE_START - energy * BRIDGE_LEN;
      spark.current.visible = energy > 0.001 && energy < 0.999;
    }
  });

  return (
    <group>
      <instancedMesh ref={deck} args={[geo.box, mats.deck, SECTIONS * SECTION_PARTS.length]} frustumCulled={false} />

      {/* Pylons standing in the chasm, lit in sequence as the deck arrives. */}
      {PYLON_AT.map((i, k) =>
        [-1, 1].map((s) => (
          <group key={`${i}${s}`} position={[PYLON_X * s, 0, sectionZ(i)]}>
            <mesh geometry={geo.pylon} material={mats.pylon} position={[0, PYLON_TOP - 23, 0]} />
            <mesh geometry={geo.strip} material={mats.lit[k]} position={[-0.62 * s, 4.6, 0]} rotation={[0, 0, 0.028 * s]} />
            <mesh geometry={geo.cap} material={mats.lit[k]} position={[0, PYLON_TOP + 0.5, 0]} scale={[1, 1.8, 1]} />
            <Glow
              position={[0, PYLON_TOP + 0.6, 0]}
              size={4.5}
              color={COLORS.cyan}
              intensity={() => sub(ch.bridge, sectionStart(i) + 0.12, sectionStart(i) + 0.3) * 0.8}
            />
          </group>
        )),
      )}
      <lineSegments geometry={geo.cables} material={mats.cable} />

      {/* Twin arches carrying the span across the chasm. */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={geo.arch} material={mats.arch} position={[2.7 * s, -13.9, -26]} rotation={[0, Math.PI / 2, 0]} />
      ))}

      {/* Plane is rotated so uv.y runs from the platform (0) to the Core (1). */}
      <mesh
        geometry={geo.ribbon}
        material={mats.ribbon}
        rotation={[-Math.PI / 2, 0, Math.PI]}
        position={[0, -0.04, BRIDGE_START - BRIDGE_LEN / 2]}
        renderOrder={4}
        frustumCulled={false}
      />
      <group ref={spark} position={[0, 0.5, BRIDGE_START]}>
        <Glow size={4.5} color={COLORS.ice} intensity={() => 1} />
      </group>
    </group>
  );
}

/* ---------------------------------------------------------------------------
 * The city beyond the gate — instanced fabric + six district landmarks.
 * ------------------------------------------------------------------------- */

export function City() {
  const { ch, tier } = useScene();
  return (
    <group>
      <Fabric detail={tier.detail === 2 ? 1 : tier.detail} arrival={false} environment={tier.environment} level={() => sub(ch.city, 0, 0.8)} />
      {territories.map((t, i) => {
        const [x, z] = DISTRICT_POS[t.id];
        return (
          <group key={t.id} position={[x, GROUND_Y, z]}>
            <Landmark id={t.id} level={() => sub(ch.city, 0.15 + i * 0.1, 0.55 + i * 0.08)} />
          </group>
        );
      })}
    </group>
  );
}

export function Ground() {
  const { ch } = useScene();
  return <WorldGround glow={() => Math.max(ch.platform * 0.4, ch.city)} />;
}
