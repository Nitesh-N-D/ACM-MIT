"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { territories } from "@/config/territories";
import { DISTRICT_CLEARANCE, DISTRICT_POS, GROUND_Y } from "./layout";
import { inPlaza } from "./plan";

/**
 * Public infrastructure of the free-exploration world: paved district
 * plazas with a lit rim, and the elevated transit loop with its stations
 * and a running train. The buildings themselves are in Fabric.tsx.
 */

type Props = { level: () => number };

/** A paved plaza in polished stone with a lit rim under every district landmark. */
function Plazas({ level }: Props) {
  const rims = useMemo(
    () => territories.map((t) => new THREE.MeshBasicMaterial({ color: t.accent, transparent: true, opacity: 0, toneMapped: false, depthWrite: false })),
    [],
  );
  const paving = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b2e34", metalness: 0.15, roughness: 0.42 }), []);
  const kerb = useMemo(() => new THREE.MeshStandardMaterial({ color: "#4a4d52", metalness: 0.1, roughness: 0.7 }), []);
  useFrame(() => {
    for (const m of rims) m.opacity = 0.55 * level();
  });
  return (
    <>
      {territories.map((t, i) => {
        const [x, z] = DISTRICT_POS[t.id];
        const r = DISTRICT_CLEARANCE[t.id];
        return (
          <group key={t.id} position={[x, GROUND_Y, z]}>
            <mesh material={kerb} position={[0, 0.1, 0]}>
              <cylinderGeometry args={[r + 0.4, r + 0.5, 0.2, 64]} />
            </mesh>
            <mesh material={paving} position={[0, 0.2, 0]}>
              <cylinderGeometry args={[r, r, 0.06, 64]} />
            </mesh>
            <mesh material={rims[i]} position={[0, 0.235, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[r - 0.3, r - 0.18, 96]} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* Elevated transit                                                           */
/* ------------------------------------------------------------------------- */

const DECK_Y = 9;
/** The loop runs above street centre lines, clear of every landmark. */
const LOOP: [number, number][] = [
  [-68, -44],
  [68, -44],
  [68, -135],
  [-68, -135],
];
const STATIONS: [number, number][] = [
  [-25.5, -44],
  [25.5, -44],
  [68, -89.5],
  [-68, -89.5],
  [0, -135],
];

type Seg = { a: [number, number]; b: [number, number]; len: number; from: number };

function segments(): { segs: Seg[]; total: number } {
  const segs: Seg[] = [];
  let total = 0;
  for (let i = 0; i < LOOP.length; i++) {
    const a = LOOP[i]!;
    const b = LOOP[(i + 1) % LOOP.length]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push({ a, b, len, from: total });
    total += len;
  }
  return { segs, total };
}

/** Position and heading at distance s along the loop. */
function along(segs: Seg[], total: number, s: number): [number, number, number] {
  const d = ((s % total) + total) % total;
  const seg = segs.find((g) => d >= g.from && d < g.from + g.len) ?? segs[0]!;
  const t = (d - seg.from) / seg.len;
  const x = seg.a[0] + (seg.b[0] - seg.a[0]) * t;
  const z = seg.a[1] + (seg.b[1] - seg.a[1]) * t;
  return [x, z, Math.atan2(seg.b[0] - seg.a[0], seg.b[1] - seg.a[1])];
}

const CARS = 4;
const CAR_LEN = 3.1;

function Transit({ level, reducedMotion }: Props & { reducedMotion: boolean }) {
  const train = useRef<THREE.Group>(null);
  const built = useMemo(() => {
    const { segs, total } = segments();
    const concrete = new THREE.MeshStandardMaterial({ color: "#5b5e63", roughness: 0.78, metalness: 0.05 });
    const steel = new THREE.MeshStandardMaterial({ color: "#363b43", roughness: 0.4, metalness: 0.85 });
    const glass = new THREE.MeshStandardMaterial({ color: "#1d2a36", roughness: 0.08, metalness: 0.9, transparent: true, opacity: 0.55 });
    const body = new THREE.MeshStandardMaterial({ color: "#c9ccd1", roughness: 0.3, metalness: 0.7 });
    const strip = new THREE.MeshBasicMaterial({ color: "#58e6ff", toneMapped: false });
    const windows = new THREE.MeshStandardMaterial({ color: "#0b1118", emissive: "#ffe8c0", emissiveIntensity: 0, roughness: 0.1, metalness: 0.6 });
    const group = new THREE.Group();

    const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, ry = 0) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      mesh.rotation.y = ry;
      group.add(mesh);
      return mesh;
    };

    // Guideway: a box-girder deck with parapets, and piers between junctions.
    const piers: [number, number][] = [];
    for (const s of segs) {
      const mx = (s.a[0] + s.b[0]) / 2;
      const mz = (s.a[1] + s.b[1]) / 2;
      const ry = Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1]);
      box(2.4, 0.55, s.len + 2.4, concrete, mx, GROUND_Y + DECK_Y - 0.28, mz, ry);
      for (const side of [-1, 1]) {
        const ox = Math.cos(ry) * 1.15 * side;
        const oz = -Math.sin(ry) * 1.15 * side;
        box(0.1, 0.32, s.len + 2.4, steel, mx + ox, GROUND_Y + DECK_Y + 0.16, mz + oz, ry);
      }
      for (let d = 4.25; d < s.len; d += 8.5) {
        const t = d / s.len;
        const x = s.a[0] + (s.b[0] - s.a[0]) * t;
        const z = s.a[1] + (s.b[1] - s.a[1]) * t;
        if (!inPlaza(x, z, 1)) piers.push([x, z]);
      }
    }
    for (const c of LOOP) piers.push(c);
    const pierGeo = new THREE.CylinderGeometry(0.34, 0.46, DECK_Y - 0.55, 10).translate(0, (DECK_Y - 0.55) / 2, 0);
    const capGeo = new THREE.BoxGeometry(2.2, 0.4, 0.9);
    const pierMesh = new THREE.InstancedMesh(pierGeo, concrete, piers.length);
    const capMesh = new THREE.InstancedMesh(capGeo, concrete, piers.length);
    const o = new THREE.Object3D();
    piers.forEach(([x, z], i) => {
      o.position.set(x, GROUND_Y, z);
      o.rotation.set(0, 0, 0);
      o.updateMatrix();
      pierMesh.setMatrixAt(i, o.matrix);
      const ns = segs.some((s) => s.a[0] === s.b[0] && Math.abs(s.a[0] - x) < 0.01);
      o.position.set(x, GROUND_Y + DECK_Y - 0.75, z);
      o.rotation.y = ns ? 0 : Math.PI / 2;
      o.updateMatrix();
      capMesh.setMatrixAt(i, o.matrix);
    });
    group.add(pierMesh, capMesh);

    // Stations: platform, glazed canopy on columns, and a stair tower to the street.
    for (const [x, z] of STATIONS) {
      const ns = Math.abs(Math.abs(x) - 68) < 0.1;
      const ry = ns ? 0 : Math.PI / 2;
      const len = 9;
      const sx = (dx: number, dz: number): [number, number] => (ns ? [x + dx, z + dz] : [x + dz, z + dx]);
      for (const side of [-1, 1]) {
        const [px, pz] = sx(side * 1.9, 0);
        box(1.4, 0.3, len, concrete, px, GROUND_Y + DECK_Y - 0.15, pz, ry);
        for (const f of [-0.42, 0, 0.42]) {
          const [cx, cz] = sx(side * 2.45, f * len);
          box(0.12, 2.4, 0.12, steel, cx, GROUND_Y + DECK_Y + 1.2, cz, ry);
        }
      }
      const [rx, rz] = sx(0, 0);
      box(5.4, 0.12, len + 0.6, glass, rx, GROUND_Y + DECK_Y + 2.45, rz, ry);
      box(5.6, 0.18, len + 0.8, steel, rx, GROUND_Y + DECK_Y + 2.55, rz, ry).scale.set(1, 1, 1);
      const [tx, tz] = sx(3.2, len * 0.38);
      box(1.6, DECK_Y + 2.4, 1.6, glass, tx, GROUND_Y + (DECK_Y + 2.4) / 2, tz, ry);
      box(1.7, 0.2, 1.7, steel, tx, GROUND_Y + DECK_Y + 2.5, tz, ry);
    }

    // The train: four articulated cars.
    const cars: THREE.Group[] = [];
    for (let i = 0; i < CARS; i++) {
      const car = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.15, CAR_LEN - 0.12), body);
      shell.position.y = 0.72;
      const glazing = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.42, CAR_LEN - 0.5), windows);
      glazing.position.y = 0.86;
      const line = new THREE.Mesh(new THREE.BoxGeometry(1.53, 0.05, CAR_LEN - 0.3), strip);
      line.position.y = 0.42;
      car.add(shell, glazing, line);
      cars.push(car);
    }
    return { group, segs, total, cars, windows, strip, materials: [concrete, steel, glass, body, strip, windows] };
  }, []);

  useEffect(
    () => () => {
      built.group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      for (const c of built.cars) c.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose());
      for (const m of built.materials) m.dispose();
    },
    [built],
  );

  const s = useRef(0);
  useFrame((_, dt) => {
    const l = level();
    built.windows.emissiveIntensity = 0.9 * l;
    if (!reducedMotion) s.current += Math.min(dt, 0.1) * 7;
    const g = train.current;
    if (!g) return;
    built.cars.forEach((car, i) => {
      const [x, z, h] = along(built.segs, built.total, s.current - i * CAR_LEN);
      car.position.set(x, GROUND_Y + DECK_Y, z);
      car.rotation.y = h;
    });
  });

  return (
    <>
      <primitive object={built.group} />
      <group ref={train}>
        {built.cars.map((c, i) => (
          <primitive key={i} object={c} />
        ))}
      </group>
    </>
  );
}

export function Surroundings({ level, reducedMotion = false }: Props & { reducedMotion?: boolean }) {
  return (
    <>
      <Plazas level={level} />
      <Transit level={level} reducedMotion={reducedMotion} />
    </>
  );
}
