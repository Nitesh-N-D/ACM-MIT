"use client";

import { Environment, Html, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { HeritageEntry } from "@/config/heritage";
import { territories, type TerritoryId } from "@/config/territories";
import { SwordKey } from "@/components/gateway/scene/SwordKey";
import { Gate } from "@/components/gateway/scene/Gate";
import { Motes, Starfield } from "@/components/gateway/scene/Particles";
import { Platform } from "@/components/gateway/scene/Platform";
import { Sentinel } from "@/components/gateway/scene/Sentinel";
import { COLORS, useScene } from "@/components/gateway/scene/state";
import { Bridge } from "@/components/gateway/scene/World";
import { Ground } from "@/components/world/CityBlocks";
import { Fabric } from "@/components/world/Fabric";
import { HeritageArchive } from "@/components/world/heritage";
import { Landmark, landmarkHeight } from "@/components/world/landmarks";
import { DISTRICT_CLEARANCE, DISTRICT_POS, GROUND_Y } from "@/components/world/layout";
import { Pedestrians } from "@/components/world/Pedestrians";
import { Surroundings } from "@/components/world/Surroundings";
import { DistrictInterior } from "@/components/world/interiors";
import { interiorOf, isInterior, isTerritory } from "../destinations";
import { explore } from "../store";
import { CameraRig } from "./CameraRig";

/** Relative liveliness of each district (0..1), from real site data. */
export type Activity = Partial<Record<TerritoryId, number>>;

const IDS = territories.map((t) => t.id);
type Focus = Record<TerritoryId, number>;

/** Smoothed 0..1 emphasis per district (selected = 1, hovered = 0.5). */
function useFocus() {
  const focus = useMemo(() => Object.fromEntries(IDS.map((id) => [id, 0])) as Focus, []);
  const arrive = useRef(0);
  useFrame((_, dt) => {
    const s = explore.get();
    const selected = isTerritory(s.focus) ? s.focus : null;
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 5);
    for (const id of IDS) {
      const goal = selected === id ? 1 : s.hovered === id ? 0.5 : 0;
      focus[id] += (goal - focus[id]) * k;
    }
    arrive.current = Math.min(1, arrive.current + dt / 2.4);
  });
  return { focus, arrive };
}

function District({ id, index, focus, arrive, activity }: { id: TerritoryId; index: number; focus: Focus; arrive: { current: number }; activity: number }) {
  const t = territories[index]!;
  const [x, z] = DISTRICT_POS[id];
  const h = landmarkHeight(id);
  const label = useRef<HTMLButtonElement>(null);

  useFrame(() => {
    if (!label.current) return;
    label.current.dataset.on = focus[id] > 0.4 ? "true" : "false";
    // Labels are DOM overlays: geometry cannot hide them, so they go when the visitor is indoors.
    label.current.style.visibility = isInterior(explore.get().focus) ? "hidden" : "visible";
  });

  return (
    <group position={[x, GROUND_Y, z]}>
      <Landmark
        id={id}
        level={() => Math.min(1, Math.max(0, arrive.current * 1.4 - index * 0.07)) * (0.72 + 0.28 * activity)}
        focus={() => focus[id]}
      />
      {/* Invisible pick volume: easier to hit than the landmark's thin parts. */}
      <mesh
        position={[0, h / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          explore.hover(id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          explore.hover(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 6) return; // the end of a drag, not a click
          // A second click on the district in view steps inside.
          explore.go(explore.get().focus === id ? interiorOf(id) : id);
        }}
      >
        <cylinderGeometry args={[DISTRICT_CLEARANCE[id] * 0.8, DISTRICT_CLEARANCE[id] * 0.8, h, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      <Html position={[0, h + 7, 0]} center zIndexRange={[5, 0]}>
        <button
          ref={label}
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => explore.go(id)}
          onPointerEnter={() => explore.hover(id)}
          onPointerLeave={() => explore.hover(null)}
          style={{ borderColor: t.accent }}
          className="border-l-2 bg-void/70 px-2 py-1 text-left font-mono text-[0.6rem] tracking-[0.18em] whitespace-nowrap text-silver uppercase backdrop-blur-sm transition-colors data-[on=true]:bg-deep data-[on=true]:text-ice"
        >
          <span style={{ color: t.accent }}>{t.code}</span> {t.short}
        </button>
      </Html>
    </group>
  );
}

/** Lit avenues on the ground from the Core to every other district. */
function Avenues({ focus, arrive }: { focus: Focus; arrive: { current: number } }) {
  const items = useMemo(() => {
    const core = DISTRICT_POS.core;
    return territories
      .filter((t) => t.id !== "core")
      .map((t) => {
        const [x, z] = DISTRICT_POS[t.id];
        const dx = x - core[0];
        const dz = z - core[1];
        return {
          id: t.id,
          len: Math.hypot(dx, dz),
          mid: [(x + core[0]) / 2, GROUND_Y + 0.06, (z + core[1]) / 2] as [number, number, number],
          rot: Math.atan2(dx, dz),
          mat: new THREE.MeshBasicMaterial({ color: t.accent, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
        };
      });
  }, []);
  useFrame(({ clock }) => {
    for (const a of items) {
      const f = Math.max(focus[a.id], focus.core * 0.6);
      a.mat.opacity = arrive.current * (0.16 + 0.5 * f + 0.05 * Math.sin(clock.elapsedTime * 1.4 + a.len));
    }
  });
  return (
    <>
      {items.map((a) => (
        <mesh key={a.id} material={a.mat} position={a.mid} rotation={[-Math.PI / 2, 0, a.rot]} renderOrder={2}>
          <planeGeometry args={[1.1, a.len]} />
        </mesh>
      ))}
    </>
  );
}

function Lights() {
  const { tier } = useScene();
  return (
    <>
      <hemisphereLight args={["#7f9cff", "#050816", tier.environment ? 0.65 : 1.25]} />
      <directionalLight position={[-9, 14, 18]} intensity={1.5} color="#cfe0ff" />
      <directionalLight position={[6, 9, -24]} intensity={2.0} color={COLORS.cyan} />
      <directionalLight position={[40, 60, -120]} intensity={1.1} color="#9fb6ff" />
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

/** The whole NEXUS world, viewable from any direction. */
export function ExploreScene({ activity, heritage, reducedMotion }: { activity: Activity; heritage: HeritageEntry[]; reducedMotion: boolean }) {
  const { tier } = useScene();
  const { focus, arrive } = useFocus();
  return (
    <>
      <color attach="background" args={[COLORS.void]} />
      <fogExp2 attach="fog" args={[COLORS.fog, 0.0042]} />
      <Lights />
      <Starfield />
      <Ground glow={() => arrive.current} arrival />
      <Platform />
      <Motes />
      <Sentinel />
      <SwordKey />
      <Gate />
      <Bridge />
      <Fabric detail={tier.detail} arrival environment={tier.environment} level={() => arrive.current} />
      <Surroundings level={() => arrive.current} reducedMotion={reducedMotion} />
      <Pedestrians count={tier.people} reducedMotion={reducedMotion} level={() => arrive.current} />
      <Avenues focus={focus} arrive={arrive} />
      {territories.map((t, i) => (
        <District key={t.id} id={t.id} index={i} focus={focus} arrive={arrive} activity={activity[t.id] ?? 0} />
      ))}
      <HeritageArchive entries={heritage} level={() => arrive.current} />
      <DistrictInterior />
      <CameraRig reducedMotion={reducedMotion} />
    </>
  );
}
