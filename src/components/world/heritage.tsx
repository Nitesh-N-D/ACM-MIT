"use client";

import { OverlayLabel } from "./OverlayLabel";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { HERITAGE_GALLERIES, type HeritageEntry, type HeritageGallery } from "@/config/heritage";
import { isInterior } from "@/components/explore/destinations";
import { explore } from "@/components/explore/store";
import { FONT, canvasTexture, wrap } from "./canvasText";
import { GROUND_Y, HERITAGE } from "./layout";

/**
 * The ACM Heritage Archive.
 *
 * A monumental stone hall on its own plaza: a stepped stylobate, a portico of
 * six columns under a pediment and a frieze carrying the archive's name, and
 * a glass dome ringed by slow holographic bands. The hall is hollow and can
 * be entered: an oculus under the dome lights a central monument, and the
 * three gallery walls (ACM global to the west, ACM India to the north, the
 * ACM MIT Student Chapter to the east) carry timelines drawn from the real
 * archive entries. Selecting a wall opens that gallery in the HUD.
 *
 * Local frame: the group sits on the plaza centre at GROUND_Y; the portico
 * faces +z (toward the arrival avenue). Everything stays within ~10.9 units
 * of the centre, inside the plaza (HERITAGE.r = 12).
 */

/** Hall floor height, interior centre (z) and eye height; mirrored in explore/destinations. */
export const ARCHIVE = {
  floor: 1,
  centreZ: -1,
  eye: 3.1,
  height: 16.6,
} as const;

const GOLD = "#e8c46a";

/** Wall layout of each gallery panel (inside face of its wall). */
const WALLS: Record<HeritageGallery, { pos: [number, number, number]; rotY: number }> = {
  global: { pos: [-7.58, 3.95, ARCHIVE.centreZ], rotY: Math.PI / 2 },
  india: { pos: [0, 3.95, -5.58], rotY: 0 },
  chapter: { pos: [7.58, 3.95, ARCHIVE.centreZ], rotY: -Math.PI / 2 },
};
const PANEL_W = 8;
const PANEL_H = 4;
/** How many exhibits a wall timeline can show legibly. */
const WALL_MAX = 9;

/** "ACM HERITAGE ARCHIVE", engraved in gold on the frieze. */
function friezeTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 96;
  const x = c.getContext("2d")!;
  x.fillStyle = "#3a3126";
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "#4b4032";
  x.fillRect(0, 6, c.width, 2);
  x.fillRect(0, c.height - 8, c.width, 2);
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.shadowColor = GOLD;
  x.shadowBlur = 10;
  x.fillStyle = "#ffe3a3";
  x.font = `600 54px ${FONT}`;
  x.fillText("A C M   H E R I T A G E   A R C H I V E", 512, 50);
  return canvasTexture(c);
}

/** One gallery wall: its name, introduction and a timeline of its exhibits. */
function galleryTexture(id: HeritageGallery, entries: HeritageEntry[]) {
  const g = HERITAGE_GALLERIES.find((v) => v.id === id)!;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const x = c.getContext("2d")!;
  const bg = x.createLinearGradient(0, 0, 0, c.height);
  bg.addColorStop(0, "#0c1224");
  bg.addColorStop(1, "#060913");
  x.fillStyle = bg;
  x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = g.accent;
  x.globalAlpha = 0.55;
  x.lineWidth = 3;
  x.strokeRect(10, 10, c.width - 20, c.height - 20);
  x.globalAlpha = 1;

  x.textBaseline = "alphabetic";
  x.textAlign = "left";
  x.fillStyle = g.accent;
  x.font = `600 22px ${FONT}`;
  x.fillText(`GALLERY ${g.code}`, 48, 66);
  x.fillStyle = "#f2f6ff";
  x.font = `700 46px ${FONT}`;
  x.fillText(g.name.toUpperCase(), 48, 118);
  x.fillStyle = "#aab4cc";
  x.font = `400 22px ${FONT}`;
  wrap(x, g.intro, c.width - 96, 2).forEach((l, i) => x.fillText(l, 48, 158 + i * 28));

  const shown = entries.slice(0, WALL_MAX);
  const lineY = 312;
  if (shown.length === 0) {
    x.textAlign = "center";
    x.fillStyle = "#e6ebf7";
    x.font = `600 32px ${FONT}`;
    x.fillText("Awaiting the chapter's first exhibit", 512, 318);
    x.fillStyle = "#8a94ad";
    x.font = `400 21px ${FONT}`;
    x.fillText("Published by the ACM MIT team — verified, sourced, with consent for every photograph.", 512, 360);
    return canvasTexture(c);
  }

  const x0 = 70;
  const x1 = c.width - 70;
  x.strokeStyle = g.accent;
  x.globalAlpha = 0.5;
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(x0 - 30, lineY);
  x.lineTo(x1 + 30, lineY);
  x.stroke();
  x.globalAlpha = 1;
  const step = shown.length > 1 ? (x1 - x0) / (shown.length - 1) : 0;
  const colW = Math.min(170, shown.length > 1 ? step - 18 : 400);
  shown.forEach((e, i) => {
    const cx = shown.length > 1 ? x0 + step * i : 512;
    x.fillStyle = g.accent;
    x.save();
    x.translate(cx, lineY);
    x.rotate(Math.PI / 4);
    x.fillRect(-7, -7, 14, 14);
    x.restore();
    x.textAlign = "center";
    x.fillStyle = g.accent;
    x.font = `700 26px ${FONT}`;
    x.fillText(e.year ? String(e.year) : e.date_label || "—", cx, lineY - 26);
    x.fillStyle = "#dfe5f3";
    x.font = `500 15px ${FONT}`;
    wrap(x, e.title, colW, 4).forEach((l, k) => x.fillText(l, cx, lineY + 40 + k * 19));
  });
  if (entries.length > WALL_MAX) {
    x.textAlign = "right";
    x.fillStyle = "#8a94ad";
    x.font = `400 18px ${FONT}`;
    x.fillText(`+ ${entries.length - WALL_MAX} more in the archive`, c.width - 48, c.height - 30);
  }
  return canvasTexture(c);
}

type V3 = [number, number, number];

function Box({ size, position, material }: { size: V3; position: V3; material: THREE.Material }) {
  return (
    <mesh material={material} position={position}>
      <boxGeometry args={size} />
    </mesh>
  );
}

const COLUMN_X = [-7.2, -5, -2.8, 2.8, 5, 7.2];

function sorted(entries: HeritageEntry[], id: HeritageGallery) {
  return entries.filter((e) => e.gallery === id).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.sort_order - b.sort_order);
}

type Props = {
  entries?: HeritageEntry[];
  /** World reveal, 0..1. */
  level: () => number;
  /**
   * false: a distant silhouette (the gateway backdrop): no gallery walls,
   * interior light, pick volume or label.
   */
  interactive?: boolean;
};

const NONE: HeritageEntry[] = [];

export function HeritageArchive({ entries = NONE, level, interactive = true }: Props) {
  const mats = useMemo(
    () => ({
      stone: new THREE.MeshStandardMaterial({
        color: "#bdb5a6",
        roughness: 0.58,
        metalness: 0.04,
      }),
      plinth: new THREE.MeshStandardMaterial({
        color: "#8b8578",
        roughness: 0.72,
        metalness: 0.03,
      }),
      floor: new THREE.MeshStandardMaterial({
        color: "#14171e",
        roughness: 0.42,
        metalness: 0.2,
        envMapIntensity: 0.35,
      }),
      bronze: new THREE.MeshStandardMaterial({
        color: "#9a7442",
        roughness: 0.32,
        metalness: 0.85,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: "#8fd2ff",
        roughness: 0.06,
        metalness: 0.55,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      gold: new THREE.MeshBasicMaterial({
        color: GOLD,
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
      ring: new THREE.MeshBasicMaterial({
        color: GOLD,
        transparent: true,
        opacity: 0,
        toneMapped: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
      ring2: new THREE.MeshBasicMaterial({
        color: "#3fe4ff",
        transparent: true,
        opacity: 0,
        toneMapped: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    }),
    [],
  );
  const accentMats = useMemo(
    () =>
      Object.fromEntries(
        HERITAGE_GALLERIES.map((g) => [
          g.id,
          new THREE.MeshBasicMaterial({
            color: g.accent,
            transparent: true,
            opacity: 0,
            toneMapped: false,
          }),
        ]),
      ) as Record<HeritageGallery, THREE.MeshBasicMaterial>,
    [],
  );
  const frieze = useMemo(() => {
    const map = friezeTexture();
    return {
      map,
      mat: new THREE.MeshStandardMaterial({
        map,
        emissiveMap: map,
        emissive: new THREE.Color("#ffffff"),
        emissiveIntensity: 0.55,
        roughness: 0.5,
        metalness: 0.3,
      }),
    };
  }, []);
  const panels = useMemo(() => {
    if (!interactive) return [];
    return HERITAGE_GALLERIES.map((g) => {
      const list = sorted(entries, g.id);
      const map = galleryTexture(g.id, list);
      const mat = new THREE.MeshStandardMaterial({
        map,
        emissiveMap: map,
        emissive: new THREE.Color("#ffffff"),
        emissiveIntensity: 0.9,
        roughness: 0.55,
        metalness: 0.1,
      });
      return { id: g.id, map, mat, count: Math.min(list.length, WALL_MAX) };
    });
  }, [entries, interactive]);
  const pediment = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-8.2, 0);
    s.lineTo(8.2, 0);
    s.lineTo(0, 2.3);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 2.8, bevelEnabled: false });
  }, []);

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
      Object.values(accentMats).forEach((m) => m.dispose());
      frieze.map.dispose();
      frieze.mat.dispose();
      pediment.dispose();
    },
    [mats, accentMats, frieze, pediment],
  );
  useEffect(
    () => () => {
      for (const p of panels) {
        p.map.dispose();
        p.mat.dispose();
      }
    },
    [panels],
  );

  const rings = useRef<THREE.Group>(null);
  const holo = useRef<THREE.Group>(null);
  const label = useRef<HTMLButtonElement>(null);
  const emphasis = useRef(0);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const s = explore.get();
    const inside = s.focus === "archive";
    const goal = inside ? 1 : s.focus === "heritage" ? 0.7 : 0;
    emphasis.current += (goal - emphasis.current) * (1 - Math.exp(-Math.min(dt, 0.1) * 4));
    const f = emphasis.current;
    const l = level();
    mats.gold.opacity = Math.min(1, l * (0.7 + 0.1 * Math.sin(t * 1.3) + 0.25 * f));
    mats.ring.opacity = l * (0.32 + 0.25 * f);
    mats.ring2.opacity = l * (0.22 + 0.2 * f);
    for (const g of HERITAGE_GALLERIES) {
      const active = inside && s.gallery === g.id;
      accentMats[g.id].opacity = Math.min(1, l * (0.45 + 0.25 * f + (active ? 0.4 : 0)));
    }
    for (const p of panels) p.mat.emissiveIntensity = 0.75 + (inside && s.gallery === p.id ? 0.35 : 0);
    if (!s.reducedMotion) {
      if (rings.current) rings.current.rotation.y = t * 0.12;
      if (holo.current) {
        holo.current.rotation.y = t * 0.35;
        holo.current.children.forEach((c, i) => (c.rotation.x = Math.PI / 2 + Math.sin(t * 0.4 + i * 2.1) * 0.5));
      }
    }
    if (label.current) {
      label.current.dataset.on = f > 0.4 ? "true" : "false";
      label.current.style.visibility = inside || isInterior(s.focus) ? "hidden" : "visible";
    }
  });

  const pick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return; // the end of a drag
    explore.go(explore.get().focus === "heritage" ? "archive" : "heritage");
  };
  const pickWall = (id: HeritageGallery) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    if (explore.get().focus !== "archive") explore.go("archive");
    explore.openGallery(id);
  };

  const cz = ARCHIVE.centreZ;
  const F = ARCHIVE.floor;

  return (
    <group position={[HERITAGE.x, GROUND_Y, HERITAGE.z]}>
      {/* Stylobate and the steps up to the portico */}
      <Box material={mats.plinth} size={[17.2, F - 0.23, 13]} position={[0, (F + 0.23) / 2, -0.1]} />
      {[0, 1, 2].map((i) => {
        const top = F - 0.19 * (i + 1);
        return <Box key={i} material={mats.plinth} size={[12, top - 0.23, 0.5]} position={[0, (top + 0.23) / 2, 6.65 + 0.5 * i]} />;
      })}
      <Box material={mats.gold} size={[17.24, 0.04, 0.04]} position={[0, F + 0.01, 6.42]} />

      {/* Hall: polished floor and four walls, the front one with the doorway */}
      <mesh material={mats.floor} position={[0, F + 0.005, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15.2, 9.2]} />
      </mesh>
      <Box material={mats.stone} size={[16, 8.5, 0.4]} position={[0, F + 4.25, -5.8]} />
      <Box material={mats.stone} size={[0.4, 8.5, 9.6]} position={[-7.8, F + 4.25, cz]} />
      <Box material={mats.stone} size={[0.4, 8.5, 9.6]} position={[7.8, F + 4.25, cz]} />
      <Box material={mats.stone} size={[5.8, 8.5, 0.4]} position={[-5.1, F + 4.25, 3.8]} />
      <Box material={mats.stone} size={[5.8, 8.5, 0.4]} position={[5.1, F + 4.25, 3.8]} />
      <Box material={mats.stone} size={[4.4, 2.9, 0.4]} position={[0, F + 7.05, 3.8]} />
      {/* Bronze door surround */}
      <Box material={mats.bronze} size={[0.22, 5.6, 0.5]} position={[-2.3, F + 2.8, 3.8]} />
      <Box material={mats.bronze} size={[0.22, 5.6, 0.5]} position={[2.3, F + 2.8, 3.8]} />
      <Box material={mats.bronze} size={[4.82, 0.22, 0.5]} position={[0, F + 5.6, 3.8]} />

      {/* Roof slab framing the oculus, with a cornice */}
      <Box material={mats.stone} size={[16.4, 0.6, 2.7]} position={[0, F + 8.8, 2.85]} />
      <Box material={mats.stone} size={[16.4, 0.6, 2.7]} position={[0, F + 8.8, -4.85]} />
      <Box material={mats.stone} size={[5.7, 0.6, 5]} position={[-5.35, F + 8.8, cz]} />
      <Box material={mats.stone} size={[5.7, 0.6, 5]} position={[5.35, F + 8.8, cz]} />
      <Box material={mats.plinth} size={[16.8, 0.3, 10.6]} position={[0, F + 8.42, cz]} />

      {/* Drum, glass dome, lantern and finial */}
      <mesh material={mats.stone} position={[0, F + 9.7, cz]}>
        <cylinderGeometry args={[3.6, 3.7, 1.2, 40, 1, true]} />
      </mesh>
      <mesh material={mats.bronze} position={[0, F + 10.3, cz]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.62, 0.12, 8, 48]} />
      </mesh>
      <mesh material={mats.glass} position={[0, F + 10.3, cz]}>
        <sphereGeometry args={[3.55, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {[0.55, 1.1].map((lat) => (
        <mesh key={lat} material={mats.bronze} position={[0, F + 10.3 + 3.55 * Math.sin(lat), cz]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3.55 * Math.cos(lat), 0.06, 6, 40]} />
        </mesh>
      ))}
      <mesh material={mats.bronze} position={[0, F + 14.3, cz]}>
        <cylinderGeometry args={[0.55, 0.65, 0.9, 12]} />
      </mesh>
      <mesh material={mats.gold} position={[0, F + 15.2, cz]}>
        <octahedronGeometry args={[0.38]} />
      </mesh>

      {/* Holographic rings around the dome */}
      <group ref={rings} position={[0, F + 11.6, cz]}>
        <mesh material={mats.ring} rotation={[Math.PI / 2 - 0.18, 0, 0]}>
          <torusGeometry args={[5.2, 0.035, 6, 96]} />
        </mesh>
        <mesh material={mats.ring2} rotation={[Math.PI / 2 + 0.22, 0.3, 0]}>
          <torusGeometry args={[5.7, 0.025, 6, 96]} />
        </mesh>
      </group>

      {/* Portico: six columns, entablature with the frieze, pediment */}
      {COLUMN_X.map((x) => (
        <group key={x} position={[x, 0, 5.4]}>
          <Box material={mats.stone} size={[1.1, 0.3, 1.1]} position={[0, F + 0.15, 0]} />
          <mesh material={mats.stone} position={[0, F + 0.3 + 3.65, 0]}>
            <cylinderGeometry args={[0.4, 0.46, 7.3, 18]} />
          </mesh>
          <Box material={mats.stone} size={[1.1, 0.35, 1.1]} position={[0, F + 7.775, 0]} />
        </group>
      ))}
      <Box material={mats.stone} size={[16.4, 0.9, 2.8]} position={[0, F + 8.4, 5]} />
      <mesh material={frieze.mat} position={[0, F + 8.4, 6.41]}>
        <planeGeometry args={[13, 1.22]} />
      </mesh>
      <mesh geometry={pediment} material={mats.stone} position={[0, F + 8.85, 3.6]} />
      <mesh material={mats.gold} position={[0, F + 9.75, 6.42]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.7, 0.7, 0.04]} />
      </mesh>

      {/* Interior: the oculus light, the monument and the three gallery walls */}
      {interactive && <pointLight position={[0, F + 7.4, cz]} color="#ffe2b8" intensity={38} distance={17} decay={2} />}
      <mesh material={mats.gold} position={[0, F + 0.012, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.58, 64]} />
      </mesh>
      <mesh material={mats.bronze} position={[0, F + 0.25, cz]}>
        <cylinderGeometry args={[0.62, 0.78, 0.5, 24]} />
      </mesh>
      <group ref={holo} position={[0, F + 6.6, cz]}>
        {HERITAGE_GALLERIES.map((g, i) => (
          <mesh key={g.id} material={accentMats[g.id]} rotation={[Math.PI / 2, i * 1.05, 0]}>
            <torusGeometry args={[1.05 + i * 0.16, 0.028, 6, 64]} />
          </mesh>
        ))}
        <mesh material={mats.gold}>
          <octahedronGeometry args={[0.32]} />
        </mesh>
      </group>
      {/* Lit paths from the monument to each gallery wall */}
      <Box material={accentMats.global} size={[5.6, 0.01, 0.07]} position={[-4.4, F + 0.012, cz]} />
      <Box material={accentMats.chapter} size={[5.6, 0.01, 0.07]} position={[4.4, F + 0.012, cz]} />
      <Box material={accentMats.india} size={[0.07, 0.01, 2.9]} position={[0, F + 0.012, -4.05]} />

      {panels.map((p) => {
        const w = WALLS[p.id];
        return (
          <group key={p.id} position={w.pos} rotation={[0, w.rotY, 0]}>
            <Box material={mats.bronze} size={[PANEL_W + 0.4, PANEL_H + 0.4, 0.06]} position={[0, 0, -0.01]} />
            <mesh material={p.mat} position={[0, 0, 0.03]} onClick={pickWall(p.id)}>
              <planeGeometry args={[PANEL_W, PANEL_H]} />
            </mesh>
            <Box material={accentMats[p.id]} size={[PANEL_W, 0.05, 0.05]} position={[0, -PANEL_H / 2 - 0.35, 0.05]} />
            {/* One lit marker per exhibit, under its place on the timeline */}
            {Array.from({ length: p.count }, (_, i) => {
              const x0 = -PANEL_W / 2 + (70 / 1024) * PANEL_W;
              const span = PANEL_W * (1 - 140 / 1024);
              const x = p.count > 1 ? x0 + (span * i) / (p.count - 1) : 0;
              return (
                <mesh key={i} material={accentMats[p.id]} position={[x, -PANEL_H / 2 - 0.35, 0.09]} rotation={[0, 0, Math.PI / 4]}>
                  <boxGeometry args={[0.12, 0.12, 0.04]} />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {interactive && (
        <>
          {/* Invisible pick volume: select the Archive, select again to go in */}
          <mesh
            position={[0, 8.5, -0.2]}
            onClick={pick}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "";
            }}
          >
            <cylinderGeometry args={[9.6, 9.6, 17, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
          <OverlayLabel position={[0, ARCHIVE.height + 2.6, cz]}>
            <button
              ref={label}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => explore.go(explore.get().focus === "heritage" ? "archive" : "heritage")}
              style={{ borderColor: GOLD }}
              className="border-l-2 bg-void/70 px-2 py-1 text-left font-mono text-[0.6rem] tracking-[0.18em] whitespace-nowrap text-silver uppercase backdrop-blur-sm transition-colors data-[on=true]:bg-deep data-[on=true]:text-ice"
            >
              <span style={{ color: GOLD }}>H</span> Heritage Archive
            </button>
          </OverlayLabel>
        </>
      )}
    </group>
  );
}
