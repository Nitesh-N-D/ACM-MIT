"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { rng } from "@/components/gateway/scene/textures";
import { DISTRICT_POS } from "./layout";

/**
 * NEXUS Central Core — the ACM MIT headquarters tower.
 *
 * A stone podium with a lit lobby and a grand portal facing the arrival
 * avenue (+z), a glass and metal curtain-wall tower in three setbacks with
 * an exoskeleton of fins, skywalks reaching out toward every district, and a
 * crown carrying the chapter's name. Glass, signs and the crown band are
 * canvas textures drawn once at load; everything else is primitives.
 *
 * Height budget matches the landmark beam: the spire tip sits at ~53.
 */

type Shared = { body: THREE.MeshStandardMaterial; alt: THREE.MeshStandardMaterial; lit: THREE.MeshBasicMaterial };
type V3 = [number, number, number];

const OCT = Math.PI / 8; // turns an 8-sided cylinder so a flat face looks down +z

/** Curtain wall: diffuse glass with mullions, and a matching map of lit windows. */
function curtainTextures() {
  const W = 256;
  const H = 512;
  const cols = 16;
  const rows = 32;
  const glass = document.createElement("canvas");
  const lights = document.createElement("canvas");
  glass.width = lights.width = W;
  glass.height = lights.height = H;
  const g = glass.getContext("2d")!;
  const l = lights.getContext("2d")!;
  const r = rng(4207);
  const cw = W / cols;
  const ch = H / rows;
  g.fillStyle = "#0b1526";
  g.fillRect(0, 0, W, H);
  l.fillStyle = "#000";
  l.fillRect(0, 0, W, H);
  for (let y = 0; y < rows; y++) {
    // Whole floors are sometimes lit or dark together, like a real office tower.
    const floor = r();
    for (let x = 0; x < cols; x++) {
      const shade = 18 + Math.floor(r() * 16);
      g.fillStyle = `rgb(${shade - 6},${shade + 4},${shade + 22})`;
      g.fillRect(x * cw + 1, y * ch + 2, cw - 2, ch - 4);
      const p = r();
      if ((floor > 0.25 && p < 0.55) || p < 0.12) {
        const warm = r() > 0.22;
        const a = 0.45 + r() * 0.55;
        l.fillStyle = warm ? `rgba(255,214,160,${a})` : `rgba(160,220,255,${a})`;
        l.fillRect(x * cw + 1, y * ch + 2, cw - 2, ch - 4);
      }
    }
    // Spandrel line at every slab.
    g.fillStyle = "#2a3346";
    g.fillRect(0, y * ch, W, 2);
  }
  // Vertical mullions.
  g.fillStyle = "#3a4458";
  for (let x = 0; x <= cols; x++) g.fillRect(x * cw - 1, 0, 2, H);
  const make = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  };
  return { map: make(glass), emissive: make(lights) };
}

/** Lettering for the portal sign and the crown band. */
function textTexture(kind: "portal" | "band", accent: string) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = kind === "portal" ? 256 : 128;
  const x = c.getContext("2d")!;
  x.clearRect(0, 0, c.width, c.height);
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.shadowColor = accent;
  x.shadowBlur = 18;
  x.fillStyle = "#f2f7ff";
  if (kind === "portal") {
    x.font = "700 120px system-ui, 'Segoe UI', sans-serif";
    x.fillText("ACM  MIT", 512, 104);
    x.shadowBlur = 8;
    x.fillStyle = accent;
    x.font = "600 44px system-ui, 'Segoe UI', sans-serif";
    x.fillText("N E X U S   ·   H E A D Q U A R T E R S", 512, 206);
  } else {
    x.font = "700 64px system-ui, 'Segoe UI', sans-serif";
    x.fillText("ACM MIT   ◆   NEXUS   ◆", 512, 66);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** `count` boxes on a circle, rotated to face outward: one draw call. */
function Ring({ count, radius, size, y, material, offset = 0 }: { count: number; radius: number; size: V3; y: number; material: THREE.Material; offset?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = offset + (i / count) * Math.PI * 2;
      o.position.set(Math.sin(a) * radius, y, Math.cos(a) * radius);
      o.rotation.set(0, a, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [count, radius, y, offset]);
  return (
    <instancedMesh ref={ref} args={[undefined, material, count]}>
      <boxGeometry args={size} />
    </instancedMesh>
  );
}

/** One octagonal glass section of the tower with its slab and fins. */
function Section({ y0, y1, r0, r1, glass, alt, lit }: { y0: number; y1: number; r0: number; r1: number; glass: THREE.Material; alt: THREE.Material; lit: THREE.Material }) {
  const h = y1 - y0;
  return (
    <group>
      <mesh material={glass} position={[0, y0 + h / 2, 0]} rotation={[0, OCT, 0]}>
        <cylinderGeometry args={[r1, r0, h, 8, 1, true]} />
      </mesh>
      {/* Exoskeleton: a metal fin on every corner of the octagon. */}
      <Ring count={8} radius={(r0 + r1) / 2 + 0.12} size={[0.34, h, 0.62]} y={y0 + h / 2} material={alt} offset={OCT} />
      {/* Setback slab with a lit edge. */}
      <mesh material={alt} position={[0, y1 + 0.25, 0]} rotation={[0, OCT, 0]}>
        <cylinderGeometry args={[r1 + 0.55, r1 + 0.55, 0.5, 8]} />
      </mesh>
      <mesh material={lit} position={[0, y1 + 0.02, 0]} rotation={[0, OCT, 0]}>
        <cylinderGeometry args={[r1 + 0.6, r1 + 0.6, 0.08, 8, 1, true]} />
      </mesh>
    </group>
  );
}

/** Skywalks from the podium roof toward each district, ending in a glass lift. */
function Skywalks({ alt, lit, glass }: { alt: THREE.Material; lit: THREE.Material; glass: THREE.Material }) {
  const arms = useMemo(() => {
    const [cx, cz] = DISTRICT_POS.core;
    return (Object.keys(DISTRICT_POS) as (keyof typeof DISTRICT_POS)[])
      .filter((id) => id !== "core")
      .map((id) => Math.atan2(DISTRICT_POS[id][0] - cx, DISTRICT_POS[id][1] - cz));
  }, []);
  const inner = 6.9;
  const outer = 11.1;
  const len = outer - inner;
  return (
    <>
      {arms.map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <mesh material={alt} position={[0, 6.15, inner + len / 2]}>
            <boxGeometry args={[1.7, 0.34, len]} />
          </mesh>
          {[-0.82, 0.82].map((x) => (
            <mesh key={x} material={lit} position={[x, 6.75, inner + len / 2]}>
              <boxGeometry args={[0.06, 0.06, len]} />
            </mesh>
          ))}
          <mesh material={glass} position={[0, 6.62, inner + len / 2]}>
            <boxGeometry args={[1.62, 0.6, len]} />
          </mesh>
          {/* Lift tower at the plaza edge. */}
          <mesh material={glass} position={[0, 3.6, outer]}>
            <cylinderGeometry args={[0.72, 0.72, 7.2, 12, 1, true]} />
          </mesh>
          <mesh material={alt} position={[0, 7.35, outer]}>
            <cylinderGeometry args={[0.86, 0.86, 0.3, 12]} />
          </mesh>
          <mesh material={lit} position={[0, 7.56, outer]}>
            <cylinderGeometry args={[0.5, 0.5, 0.1, 12]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function CoreTower({ body, alt, lit }: Shared) {
  const accent = `#${lit.color.getHexString()}`;
  const built = useMemo(() => {
    const curtain = curtainTextures();
    const glassFor = (repeatX: number, repeatY: number) => {
      const map = curtain.map.clone();
      const emissiveMap = curtain.emissive.clone();
      map.repeat.set(repeatX, repeatY);
      emissiveMap.repeat.set(repeatX, repeatY);
      return new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: "#ffffff", emissiveIntensity: 0.6, metalness: 0.85, roughness: 0.12, side: THREE.DoubleSide });
    };
    const portal = textTexture("portal", accent);
    const band = textTexture("band", accent);
    band.repeat.set(3, 1);
    return {
      curtain,
      portal,
      band,
      towers: [glassFor(3, 13.5 / 32), glassFor(3, 11.5 / 32), glassFor(2, 9.5 / 32)],
      stone: new THREE.MeshStandardMaterial({ color: "#8d929c", roughness: 0.62, metalness: 0.08 }),
      lobby: new THREE.MeshStandardMaterial({ color: "#101826", emissive: "#ffd6a0", emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.1, transparent: true, opacity: 0.88 }),
      walkGlass: new THREE.MeshStandardMaterial({ color: "#7fa8c8", metalness: 0.4, roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
      sign: new THREE.MeshBasicMaterial({ map: portal, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }),
      crown: new THREE.MeshBasicMaterial({ map: band, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, side: THREE.FrontSide }),
    };
  }, [accent]);

  useEffect(
    () => () => {
      built.curtain.map.dispose();
      built.curtain.emissive.dispose();
      built.portal.dispose();
      built.band.dispose();
      for (const m of built.towers) {
        m.map?.dispose();
        m.emissiveMap?.dispose();
        m.dispose();
      }
      for (const m of [built.stone, built.lobby, built.walkGlass, built.sign, built.crown]) m.dispose();
    },
    [built],
  );

  useFrame(({ clock }) => {
    const on = lit.opacity; // already carries the district level and focus
    for (const m of built.towers) m.emissiveIntensity = 0.15 + 0.85 * on;
    built.lobby.emissiveIntensity = 0.25 + 0.9 * on;
    built.sign.opacity = Math.min(1, 0.35 + on);
    built.crown.opacity = Math.min(1, 0.25 + on);
    // The crown band turns slowly, so the name passes every side of the city.
    built.band.offset.x = (clock.elapsedTime * 0.01) % 1;
  });

  const { stone, lobby, walkGlass, sign, crown, towers } = built;

  return (
    <>
      {/* Stepped plinth. */}
      {[
        [9.0, 0.35, 0.175],
        [8.4, 0.35, 0.525],
        [7.8, 0.35, 0.875],
      ].map(([r, h, y]) => (
        <mesh key={r} material={stone} position={[0, y!, 0]} rotation={[0, OCT, 0]}>
          <cylinderGeometry args={[r!, r!, h!, 8]} />
        </mesh>
      ))}

      {/* Podium: a glass lobby between stone piers, roofed in metal. */}
      <mesh material={lobby} position={[0, 3.55, 0]} rotation={[0, OCT, 0]}>
        <cylinderGeometry args={[7.0, 7.0, 4.9, 8, 1, true]} />
      </mesh>
      <mesh material={body} position={[0, 3.55, 0]} rotation={[0, OCT, 0]}>
        <cylinderGeometry args={[5.4, 5.4, 4.9, 8]} />
      </mesh>
      <Ring count={8} radius={7.05} size={[0.95, 4.9, 0.95]} y={3.55} material={stone} offset={OCT} />
      <Ring count={16} radius={7.02} size={[0.12, 4.9, 0.2]} y={3.55} material={alt} />
      <mesh material={alt} position={[0, 6.25, 0]} rotation={[0, OCT, 0]}>
        <cylinderGeometry args={[7.7, 7.5, 0.5, 8]} />
      </mesh>
      <mesh material={lit} position={[0, 6.02, 0]} rotation={[0, OCT, 0]}>
        <cylinderGeometry args={[7.72, 7.72, 0.07, 8, 1, true]} />
      </mesh>

      {/* Grand portal on the avenue side. */}
      <group position={[0, 0, 6.6]}>
        {[-1, 1].map((s) => (
          <mesh key={s} material={stone} position={[s * 2.75, 4.4, 0.8]}>
            <boxGeometry args={[1.1, 8.8, 1.5]} />
          </mesh>
        ))}
        <mesh material={stone} position={[0, 8.15, 0.8]}>
          <boxGeometry args={[6.6, 1.5, 1.5]} />
        </mesh>
        <mesh material={sign} position={[0, 8.15, 1.56]}>
          <planeGeometry args={[5.4, 1.35]} />
        </mesh>
        {/* Canopy with a lit underside. */}
        <mesh material={alt} position={[0, 5.0, 1.9]}>
          <boxGeometry args={[4.6, 0.26, 2.6]} />
        </mesh>
        <mesh material={lit} position={[0, 4.86, 1.9]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.2, 2.2]} />
        </mesh>
        {/* Doors: warm light behind tall glass. */}
        <mesh material={lobby} position={[0, 3.0, 0.45]}>
          <boxGeometry args={[4.2, 3.9, 0.1]} />
        </mesh>
        {[-1.4, 0, 1.4].map((x) => (
          <mesh key={x} material={alt} position={[x, 3.0, 0.52]}>
            <boxGeometry args={[0.08, 3.9, 0.08]} />
          </mesh>
        ))}
        {/* Entrance steps. */}
        {[0, 1].map((k) => (
          <mesh key={k} material={stone} position={[0, 0.88 - k * 0.35, 1.6 + k * 0.55]}>
            <boxGeometry args={[5.4, 0.35, 1.2]} />
          </mesh>
        ))}
      </group>

      {/* Tower: three glass sections stepping back as they rise. */}
      <Section y0={6.5} y1={20} r0={5.0} r1={4.7} glass={towers[0]!} alt={alt} lit={lit} />
      <Section y0={20.5} y1={32} r0={4.3} r1={4.0} glass={towers[1]!} alt={alt} lit={lit} />
      <Section y0={32.5} y1={42} r0={3.5} r1={3.1} glass={towers[2]!} alt={alt} lit={lit} />
      {/* Lit seams down the middle of four faces. */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2;
        return (
          <mesh key={i} material={lit} position={[Math.sin(a) * 4.52, 13.25, Math.cos(a) * 4.52]} rotation={[0, a, 0]}>
            <boxGeometry args={[0.12, 13.4, 0.2]} />
          </mesh>
        );
      })}

      {/* Crown: the chapter's name on a turning band, open fins, and the spire. */}
      <mesh material={crown} position={[0, 43.3, 0]}>
        <cylinderGeometry args={[3.35, 3.35, 1.5, 48, 1, true]} />
      </mesh>
      <Ring count={8} radius={2.7} size={[0.22, 4.4, 0.5]} y={44.7} material={alt} offset={OCT} />
      <group position={[0, 46.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={alt}><torusGeometry args={[2.6, 0.16, 4, 48]} /></mesh>
        <mesh material={lit}><torusGeometry args={[2.36, 0.06, 5, 48]} /></mesh>
      </group>
      <mesh material={body} position={[0, 44.6, 0]}>
        <cylinderGeometry args={[1.5, 2.2, 5.2, 8]} />
      </mesh>
      <mesh material={alt} position={[0, 49.5, 0]}>
        <cylinderGeometry args={[0.1, 1.05, 7.2, 8]} />
      </mesh>
      <mesh material={lit} position={[0, 52.5, 0]}>
        <octahedronGeometry args={[0.9, 0]} />
      </mesh>

      <Skywalks alt={alt} lit={lit} glass={walkGlass} />
    </>
  );
}
