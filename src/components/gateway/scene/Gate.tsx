"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Glow } from "./Glow";
import { fadeTexture } from "./textures";
import { COLORS, sub, useScene } from "./state";

export const GATE_Z = -9.5;
const DEPTH = 2.4;

// Opening (inner pentagon) and outer silhouette, in gate-local units.
const IN = { w: 4.3, shoulder: 8.6, apex: 12.6 };
const OUT = { w: 8.4, shoulder: 11.2, apex: 17.4 };

function pentagon(p: { w: number; shoulder: number; apex: number }, cls: typeof THREE.Shape | typeof THREE.Path) {
  const s = new cls();
  s.moveTo(-p.w, 0);
  s.lineTo(p.w, 0);
  s.lineTo(p.w, p.shoulder);
  s.lineTo(0, p.apex);
  s.lineTo(-p.w, p.shoulder);
  s.closePath();
  return s;
}

/** Monumental Gateway: extruded arch, sliding doors, seam light and flood. */
export function Gate() {
  const { ch } = useScene();
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const edgeMat = useRef<THREE.LineBasicMaterial>(null);
  const doorEdgeMat = useRef<THREE.LineBasicMaterial>(null);
  const seamMat = useRef<THREE.MeshBasicMaterial>(null);
  const floodMat = useRef<THREE.MeshBasicMaterial>(null);
  const spillMat = useRef<THREE.MeshBasicMaterial>(null);
  const floodLight = useRef<THREE.PointLight>(null);
  const pylonMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  const geo = useMemo(() => {
    const outer = pentagon(OUT, THREE.Shape) as THREE.Shape;
    outer.holes.push(pentagon(IN, THREE.Path) as THREE.Path);
    const arch = new THREE.ExtrudeGeometry(outer, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 1 });
    arch.translate(0, 0, -DEPTH / 2);

    // Inner carved frame (decorative inset outline on the front face).
    const frame = new THREE.EdgesGeometry(
      new THREE.ShapeGeometry(pentagon({ w: (IN.w + OUT.w) / 2 + 0.6, shoulder: (IN.shoulder + OUT.shoulder) / 2 + 0.5, apex: (IN.apex + OUT.apex) / 2 + 0.6 }, THREE.Shape) as THREE.Shape),
    );

    const half = (dir: 1 | -1) => {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.lineTo(dir * IN.w, 0);
      s.lineTo(dir * IN.w, IN.shoulder);
      s.lineTo(0, IN.apex);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: false });
      g.translate(0, 0, -0.225);
      return g;
    };
    const doorL = half(-1);
    const doorR = half(1);
    const opening = new THREE.ShapeGeometry(pentagon(IN, THREE.Shape) as THREE.Shape);

    return {
      arch,
      archEdges: new THREE.EdgesGeometry(arch, 30),
      frame,
      doorL,
      doorR,
      doorEdges: new THREE.EdgesGeometry(doorL, 20),
      doorEdgesR: new THREE.EdgesGeometry(doorR, 20),
      opening,
      seam: new THREE.PlaneGeometry(0.12, IN.apex),
      spill: new THREE.PlaneGeometry(IN.w * 2.4, 14),
      pylon: new THREE.CylinderGeometry(0.35, 1.3, 22, 4, 1),
      pylonLine: new THREE.BoxGeometry(0.06, 18, 0.06),
    };
  }, []);

  const mats = useMemo(
    () => ({
      stone: new THREE.MeshStandardMaterial({ color: "#121c40", metalness: 0.55, roughness: 0.48, flatShading: true }),
      door: new THREE.MeshStandardMaterial({ color: "#0b122b", metalness: 0.8, roughness: 0.3, flatShading: true }),
    }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const open = ch.doors;
    const slide = open * (IN.w + 0.2);
    if (left.current) left.current.position.x = -slide;
    if (right.current) right.current.position.x = slide;

    if (edgeMat.current) edgeMat.current.opacity = ch.gate * 0.4;
    if (doorEdgeMat.current) doorEdgeMat.current.opacity = sub(ch.seam, 0, 1) * 0.6 * (1 - open);
    if (seamMat.current) seamMat.current.opacity = ch.seam * (1 - sub(open, 0, 0.35)) * (0.85 + 0.15 * Math.sin(t * 9));
    if (floodMat.current) floodMat.current.opacity = sub(ch.flood, 0, 1) * 0.95;
    if (spillMat.current) spillMat.current.opacity = ch.flood * 0.38;
    if (floodLight.current) floodLight.current.intensity = ch.flood * 320;
    pylonMats.current.forEach((m) => {
      if (m) m.opacity = ch.gate * (0.55 + 0.25 * Math.sin(t * 0.9));
    });
  });

  return (
    <group position={[0, 0, GATE_Z]}>
      <mesh geometry={geo.arch} material={mats.stone} />
      <lineSegments geometry={geo.archEdges}>
        <lineBasicMaterial ref={edgeMat} color={COLORS.cyan} transparent opacity={0} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={geo.frame} position={[0, 0, DEPTH / 2 + 0.14]}>
        <lineBasicMaterial color={COLORS.cyan} transparent opacity={0.18} toneMapped={false} />
      </lineSegments>

      {/* Doors slide into the wall cavity */}
      <mesh ref={left} geometry={geo.doorL} material={mats.door}>
        <lineSegments geometry={geo.doorEdges}>
          <lineBasicMaterial ref={doorEdgeMat} color={COLORS.cyan} transparent opacity={0} toneMapped={false} />
        </lineSegments>
      </mesh>
      <mesh ref={right} geometry={geo.doorR} material={mats.door}>
        <lineSegments geometry={geo.doorEdgesR}>
          <lineBasicMaterial color={COLORS.cyan} transparent opacity={0.08} toneMapped={false} />
        </lineSegments>
      </mesh>

      {/* Seam of light between the doors */}
      <mesh geometry={geo.seam} position={[0, IN.apex / 2, 0.3]} renderOrder={5}>
        <meshBasicMaterial ref={seamMat} color={COLORS.ice} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>

      {/* Light of NEXUS behind the doors */}
      <mesh geometry={geo.opening} position={[0, 0, -0.5]} renderOrder={1}>
        <meshBasicMaterial ref={floodMat} color="#9feeff" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight ref={floodLight} position={[0, 6, 1.8]} color="#8fe9ff" intensity={0} distance={34} decay={2} />
      <Glow position={[0, 6, -1]} size={26} color={COLORS.cyan} intensity={() => ch.flood * 0.55} />
      <Glow position={[0, 6.5, -1]} size={9} color={COLORS.ice} intensity={() => sub(ch.flood, 0, 0.6) * 0.75} />

      {/* Light spilling across the ground toward the platform */}
      <mesh geometry={geo.spill} rotation={[-Math.PI / 2, 0, Math.PI]} position={[0, 0.03, 7.4]} renderOrder={1}>
        <meshBasicMaterial ref={spillMat} map={fadeTexture()} color={COLORS.cyan} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>

      {/* Flanking pylons */}
      {[-1, 1].map((s, i) => (
        <group key={s} position={[s * 14.5, 0, 1.5]}>
          <mesh geometry={geo.pylon} position={[0, 11, 0]} material={mats.stone} />
          <mesh geometry={geo.pylonLine} position={[0, 10, 0.95]} rotation={[-0.06, 0, 0]}>
            <meshBasicMaterial ref={(m) => void (pylonMats.current[i] = m)} color={COLORS.cyan} transparent opacity={0} toneMapped={false} />
          </mesh>
          <Glow position={[0, 22.4, 0]} size={3.4} color={COLORS.cyan} intensity={(t) => ch.gate * (0.7 + 0.3 * Math.sin(t * 1.3 + s))} />
        </group>
      ))}
    </group>
  );
}
