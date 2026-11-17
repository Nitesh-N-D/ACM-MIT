"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getTerritory, territories, type Territory, type TerritoryId } from "@/config/territories";
import { districtOf, isInterior } from "@/components/explore/destinations";
import { explore, useExplore } from "@/components/explore/store";
import { FONT, canvasTexture, wrap } from "./canvasText";
import { DISTRICT_POS, INTERIOR_Y, ROOM } from "./layout";

/**
 * District interiors: the reception and exhibition hall of each landmark.
 *
 * Only the room the visitor is in exists; it is built when they step inside
 * and disposed when they leave. Every room shares one plan (entrance on the
 * +z wall, behind the arriving camera) dressed in its district's accent and
 * content:
 *
 * - far wall: the main display (code, name, purpose, description, topics)
 * - left wall: the exhibition screen, one tile per topic
 * - right wall: the NEXUS directory, every district with its code
 * - a reception desk with its sign, a holographic centrepiece, columns,
 *   ceiling light panels, and floor markers leading in from the entrance
 * - the exit: selecting it returns to the district outside
 *
 * No lights are added (that would recompile every material in the city);
 * the rooms read from the scene's ambient light, emissive screens and
 * unlit light panels.
 */

const W = ROOM.w;
const D = ROOM.d;
const H = ROOM.h;
const EXIT_GREEN = "#3ddc84";

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function screen(w: number, h: number, accent: string) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  const bg = x.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0b1226");
  bg.addColorStop(1, "#050812");
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
  x.strokeStyle = hexA(accent, 0.6);
  x.lineWidth = 3;
  x.strokeRect(10, 10, w - 20, h - 20);
  return { c, x };
}

function mainDisplay(t: Territory) {
  const { c, x } = screen(1536, 614, t.accent);
  x.textBaseline = "alphabetic";
  x.fillStyle = t.accent;
  x.font = `600 30px ${FONT}`;
  x.fillText(`${t.code} · ${t.purpose.toUpperCase()}`, 64, 92);
  x.fillStyle = "#f2f6ff";
  x.font = `700 84px ${FONT}`;
  x.fillText(t.name.toUpperCase(), 64, 190);
  x.fillStyle = "#b8c2da";
  x.font = `400 36px ${FONT}`;
  wrap(x, t.description, 1400, 3).forEach((l, i) => x.fillText(l, 64, 262 + i * 48));
  let cx = 64;
  x.font = `600 24px ${FONT}`;
  for (const topic of t.topics) {
    const label = topic.toUpperCase();
    const w = x.measureText(label).width + 40;
    if (cx + w > 1472) break;
    x.strokeStyle = hexA(t.accent, 0.7);
    x.lineWidth = 2;
    x.strokeRect(cx, 448, w, 52);
    x.fillStyle = "#dfe6f5";
    x.fillText(label, cx + 20, 483);
    cx += w + 16;
  }
  x.fillStyle = "#7d89a6";
  x.font = `400 22px ${FONT}`;
  x.fillText("NEXUS · ACM MIT CAMPUS STUDENT CHAPTER", 64, 566);
  return canvasTexture(c);
}

function exhibitionScreen(t: Territory) {
  const { c, x } = screen(1024, 460, t.accent);
  x.fillStyle = t.accent;
  x.font = `600 24px ${FONT}`;
  x.fillText("EXHIBITION", 48, 70);
  x.fillStyle = "#f2f6ff";
  x.font = `700 44px ${FONT}`;
  x.fillText(`What lives in ${t.short}`, 48, 126);
  const n = Math.min(t.topics.length, 6);
  const cols = n > 3 ? 3 : n;
  const tw = (1024 - 96 - (cols - 1) * 20) / cols;
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const tx = 48 + col * (tw + 20);
    const ty = 168 + row * 130;
    x.fillStyle = hexA(t.accent, 0.1);
    x.fillRect(tx, ty, tw, 110);
    x.fillStyle = t.accent;
    x.fillRect(tx, ty, 5, 110);
    x.fillStyle = hexA(t.accent, 0.9);
    x.font = `600 20px ${FONT}`;
    x.fillText(String(i + 1).padStart(2, "0"), tx + 24, ty + 40);
    x.fillStyle = "#e6ebf7";
    x.font = `600 28px ${FONT}`;
    wrap(x, t.topics[i]!, tw - 48, 2).forEach((l, k) => x.fillText(l, tx + 24, ty + 76 + k * 30));
  }
  return canvasTexture(c);
}

function directoryScreen(t: Territory) {
  const { c, x } = screen(1024, 460, t.accent);
  x.fillStyle = t.accent;
  x.font = `600 24px ${FONT}`;
  x.fillText("NEXUS DIRECTORY", 48, 70);
  x.fillStyle = "#f2f6ff";
  x.font = `700 40px ${FONT}`;
  x.fillText("You are here", 48, 122);
  territories.forEach((d, i) => {
    const y = 176 + i * 44;
    const here = d.id === t.id;
    if (here) {
      x.fillStyle = hexA(d.accent, 0.16);
      x.fillRect(40, y - 32, 944, 42);
    }
    x.fillStyle = d.accent;
    x.save();
    x.translate(62, y - 11);
    x.rotate(Math.PI / 4);
    x.fillRect(-6, -6, 12, 12);
    x.restore();
    x.font = `600 22px ${FONT}`;
    x.fillText(d.code, 88, y);
    x.fillStyle = here ? "#ffffff" : "#c3cce4";
    x.font = `${here ? 700 : 500} 26px ${FONT}`;
    x.fillText(d.name, 168, y);
    x.fillStyle = "#7d89a6";
    x.font = `400 20px ${FONT}`;
    x.textAlign = "right";
    x.fillText(here ? "YOU ARE HERE" : d.purpose, 976, y);
    x.textAlign = "left";
  });
  return canvasTexture(c);
}

function sign(text: string, color: string, w = 512, h = 112) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  x.fillStyle = "#070b16";
  x.fillRect(0, 0, w, h);
  x.fillStyle = color;
  x.fillRect(0, h - 6, w, 6);
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.shadowColor = color;
  x.shadowBlur = 12;
  x.fillStyle = "#f4f8ff";
  x.font = `700 ${Math.round(h * 0.42)}px ${FONT}`;
  x.fillText(text, w / 2, h / 2 - 2);
  return canvasTexture(c);
}

/** A distinct holographic form per district. */
function emblem(id: TerritoryId): THREE.BufferGeometry {
  switch (id) {
    case "core":
      return new THREE.OctahedronGeometry(0.62);
    case "intelligence":
      return new THREE.IcosahedronGeometry(0.62, 1);
    case "frontier":
      return new THREE.TetrahedronGeometry(0.7);
    case "colosseum":
      return new THREE.TorusGeometry(0.5, 0.16, 10, 28);
    case "vault":
      return new THREE.BoxGeometry(0.75, 0.75, 0.75);
    case "sanctuary":
      return new THREE.DodecahedronGeometry(0.6);
  }
}

type V3 = [number, number, number];

function Room({ id }: { id: TerritoryId }) {
  const t = getTerritory(id);
  const built = useMemo(() => {
    const accent = new THREE.Color(t.accent);
    const textures = {
      main: mainDisplay(t),
      exhibition: exhibitionScreen(t),
      directory: directoryScreen(t),
      reception: sign(`RECEPTION · ${t.code}`, t.accent),
      welcome: sign(`WELCOME TO ${t.short.toUpperCase()}`, t.accent, 768, 96),
      exit: sign("EXIT ▲", EXIT_GREEN, 384, 112),
    };
    const screenMat = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, toneMapped: false });
    const mats = {
      shell: new THREE.MeshStandardMaterial({ color: "#121a2c", emissive: "#0a1020", roughness: 0.85, metalness: 0.05, side: THREE.BackSide }),
      floor: new THREE.MeshStandardMaterial({ color: "#10151f", roughness: 0.92, metalness: 0, envMapIntensity: 0.1 }),
      ceiling: new THREE.MeshStandardMaterial({ color: "#0c111d", roughness: 0.9 }),
      trim: new THREE.MeshStandardMaterial({ color: "#2a3346", roughness: 0.4, metalness: 0.8 }),
      desk: new THREE.MeshStandardMaterial({ color: "#d9dde6", roughness: 0.3, metalness: 0.1 }),
      panel: new THREE.MeshBasicMaterial({ color: "#e4ecff", toneMapped: false }),
      accent: new THREE.MeshBasicMaterial({ color: accent, toneMapped: false }),
      glow: new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      holo: new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.9, toneMapped: false }),
      door: new THREE.MeshStandardMaterial({ color: "#0a1a2a", emissive: accent, emissiveIntensity: 0.18, roughness: 0.08, metalness: 0.6 }),
      main: screenMat(textures.main),
      exhibition: screenMat(textures.exhibition),
      directory: screenMat(textures.directory),
      reception: screenMat(textures.reception),
      welcome: screenMat(textures.welcome),
      exit: screenMat(textures.exit),
    };
    const chevron = new THREE.Shape();
    chevron.moveTo(-0.32, 0);
    chevron.lineTo(0, 0.3);
    chevron.lineTo(0.32, 0);
    chevron.lineTo(0.32, -0.12);
    chevron.lineTo(0, 0.18);
    chevron.lineTo(-0.32, -0.12);
    chevron.closePath();
    const geos = { chevron: new THREE.ShapeGeometry(chevron), emblem: emblem(id) };
    return { textures, mats, geos };
  }, [id, t]);

  useEffect(
    () => () => {
      Object.values(built.textures).forEach((x) => x.dispose());
      Object.values(built.mats).forEach((x) => x.dispose());
      Object.values(built.geos).forEach((x) => x.dispose());
    },
    [built],
  );

  const holo = useRef<THREE.Group>(null);
  const markers = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const s = explore.get();
    const time = clock.elapsedTime;
    if (!s.reducedMotion && holo.current) {
      holo.current.rotation.y = time * 0.4;
      holo.current.children[0]!.rotation.x = time * 0.3;
      holo.current.position.y = 1.85 + Math.sin(time * 1.1) * 0.06;
    }
    built.mats.glow.opacity = 0.42 + 0.14 * Math.sin(time * 1.6);
    // The floor markers pulse in sequence toward the main display.
    if (!s.reducedMotion) markers.current?.children.forEach((m, i) => m.scale.setScalar(0.85 + 0.25 * Math.max(0, Math.sin(time * 2.4 - i * 0.7))));
  });

  const exit = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    explore.go(id);
  };

  const { mats, geos } = built;
  const [x, z] = DISTRICT_POS[id];
  const box = (size: V3, position: V3, material: THREE.Material, key?: string) => (
    <mesh key={key} material={material} position={position}>
      <boxGeometry args={size} />
    </mesh>
  );

  return (
    <group position={[x, INTERIOR_Y, z]}>
      {/* Enclosure: walls seen from inside, floor and ceiling */}
      <mesh material={mats.shell} position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      <mesh material={mats.floor} position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 0.02, D - 0.02]} />
      </mesh>
      <mesh material={mats.ceiling} position={[0, H - 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 0.02, D - 0.02]} />
      </mesh>
      {/* Skirting and cornice in the district accent */}
      {box([W - 0.1, 0.06, 0.04], [0, 0.18, -D / 2 + 0.03], mats.accent)}
      {box([W - 0.1, 0.06, 0.04], [0, H - 0.4, -D / 2 + 0.03], mats.accent)}
      {box([0.04, 0.06, D - 0.1], [-W / 2 + 0.03, 0.18, 0], mats.accent)}
      {box([0.04, 0.06, D - 0.1], [W / 2 - 0.03, 0.18, 0], mats.accent)}
      {box([0.04, 0.06, D - 0.1], [-W / 2 + 0.03, H - 0.4, 0], mats.accent)}
      {box([0.04, 0.06, D - 0.1], [W / 2 - 0.03, H - 0.4, 0], mats.accent)}

      {/* Ceiling light panels */}
      {[-5, 0, 5].flatMap((px) => [-3.2, 1.6].map((pz) => box([3.2, 0.04, 0.6], [px, H - 0.03, pz], mats.panel, `${px}:${pz}`)))}

      {/* Columns with lit bands */}
      {[-5.8, 5.8].flatMap((cx) =>
        [-3.4, 2.6].map((cz) => (
          <group key={`${cx}:${cz}`} position={[cx, 0, cz]}>
            <mesh material={mats.trim} position={[0, H / 2, 0]}>
              <cylinderGeometry args={[0.32, 0.36, H, 16]} />
            </mesh>
            <mesh material={mats.accent} position={[0, 1.2, 0]}>
              <cylinderGeometry args={[0.37, 0.37, 0.05, 16]} />
            </mesh>
          </group>
        )),
      )}

      {/* Far wall: the main display */}
      {/* Raised so the centrepiece, seen from the entrance, sits below it. */}
      {box([8.5, 3.7, 0.12], [0, 4.05, -D / 2 + 0.07], mats.trim)}
      <mesh material={mats.main} position={[0, 4.05, -D / 2 + 0.14]}>
        <planeGeometry args={[8, 3.2]} />
      </mesh>
      {box([8, 0.05, 0.06], [0, 2.1, -D / 2 + 0.16], mats.glow)}

      {/* Left wall: exhibition screen */}
      <group position={[-W / 2 + 0.07, 3.2, -0.8]} rotation={[0, Math.PI / 2, 0]}>
        {box([7.4, 3.6, 0.1], [0, 0, 0], mats.trim)}
        <mesh material={mats.exhibition} position={[0, 0, 0.06]}>
          <planeGeometry args={[7, 3.15]} />
        </mesh>
      </group>
      {/* Right wall: directory */}
      <group position={[W / 2 - 0.07, 3.2, -0.8]} rotation={[0, -Math.PI / 2, 0]}>
        {box([7.4, 3.6, 0.1], [0, 0, 0], mats.trim)}
        <mesh material={mats.directory} position={[0, 0, 0.06]}>
          <planeGeometry args={[7, 3.15]} />
        </mesh>
      </group>

      {/* Reception: desk, its screen and the hanging sign */}
      <group position={[-3.4, 0, -1.4]} rotation={[0, 0.4, 0]}>
        {box([3.4, 1.0, 0.85], [0, 0.5, 0], mats.desk)}
        {box([3.5, 0.06, 0.95], [0, 1.03, 0], mats.trim)}
        {box([3.4, 0.05, 0.02], [0, 0.82, 0.44], mats.accent)}
        <mesh material={mats.welcome} position={[0, 0.52, 0.432]}>
          <planeGeometry args={[2.6, 0.32]} />
        </mesh>
        <mesh material={mats.reception} position={[0, 3.6, 0]}>
          <planeGeometry args={[2.4, 0.52]} />
        </mesh>
        {box([0.02, H - 3.86, 0.02], [-1, 3.86 + (H - 3.86) / 2, 0], mats.trim)}
        {box([0.02, H - 3.86, 0.02], [1, 3.86 + (H - 3.86) / 2, 0], mats.trim)}
      </group>

      {/* Holographic centrepiece */}
      <group position={[0, 0, -3]}>
        <mesh material={mats.trim} position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.85, 1, 0.4, 32]} />
        </mesh>
        <mesh material={mats.glow} position={[0, 0.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.8, 48]} />
        </mesh>
        <group ref={holo} position={[0, 1.85, 0]}>
          <mesh geometry={geos.emblem} material={mats.holo} />
          <mesh material={mats.glow} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.05, 0.02, 6, 64]} />
          </mesh>
        </group>
      </group>

      {/* Floor markers from the entrance toward the display */}
      <group ref={markers}>
        {[5.6, 4.4, 3.2, 2.0, 0.8, -0.4].map((mz) => (
          <mesh key={mz} geometry={geos.chevron} material={mats.glow} position={[0, 0.012, mz]} rotation={[-Math.PI / 2, 0, 0]} />
        ))}
      </group>
      <mesh material={mats.glow} position={[0, 0.012, -3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.56, 64]} />
      </mesh>

      {/* Entrance and exit, behind the arriving visitor */}
      <group position={[0, 0, D / 2 - 0.07]} rotation={[0, Math.PI, 0]}>
        {box([3.6, 3.4, 0.12], [0, 1.7, 0], mats.trim)}
        <mesh material={mats.door} position={[-0.81, 1.62, 0.07]} onClick={exit}>
          <planeGeometry args={[1.58, 3.12]} />
        </mesh>
        <mesh material={mats.door} position={[0.81, 1.62, 0.07]} onClick={exit}>
          <planeGeometry args={[1.58, 3.12]} />
        </mesh>
        <mesh material={mats.exit} position={[0, 3.85, 0.07]} onClick={exit}>
          <planeGeometry args={[1.5, 0.44]} />
        </mesh>
      </group>
    </group>
  );
}

/** The interior the visitor is currently in, if any. */
export function DistrictInterior() {
  const focus = useExplore((s) => s.focus);
  const id = isInterior(focus) ? districtOf(focus) : null;
  return id ? <Room key={id} id={id} /> : null;
}
