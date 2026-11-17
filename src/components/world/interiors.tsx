"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getTerritory, territories, type Territory, type TerritoryId } from "@/config/territories";
import { getHall, hallHref, hallsOf, topicsOf, type TopicHall } from "@/config/topics";
import type { HallBoard } from "@/lib/data/halls";
import { openWorldPage } from "@/components/explore/WorldRouting";
import { districtOf, isHall, isInterior } from "@/components/explore/destinations";
import { explore, useExplore } from "@/components/explore/store";
import { FONT, canvasTexture, wrap } from "./canvasText";
import { useHallBoards } from "./hallBoards";
import { DISTRICT_POS, HALL_Y, INTERIOR_Y, ROOM } from "./layout";

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
 * Each topic of a reception opens a topic hall: a room of the same plan, one
 * level further in, whose main display shows what the hall holds (every
 * hackathon, every Generative AI path…) as tiles that open their pages. Its
 * left wall describes the hall and opens its full page; its right wall lists
 * the district's other halls, and its exit leads back to the reception.
 *
 * No lights are added (that would recompile every material in the city);
 * the rooms read from the scene's ambient light, emissive screens and
 * unlit light panels.
 */

const W = ROOM.w;
const D = ROOM.d;
const H = ROOM.h;
const EXIT_GREEN = "#3ddc84";

type Rect = { x: number; y: number; w: number; h: number };

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

/** Canvas size of the main display and the plane it is shown on. */
const MAIN = { w: 1536, h: 614, pw: 8, ph: 3.2 };

/** Draws the main display; returns its texture and where each topic chip landed. */
function mainDisplay(t: Territory) {
  const { c, x } = screen(MAIN.w, MAIN.h, t.accent);
  const chips: Rect[] = [];
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
    chips.push({ x: cx, y: 448, w, h: 52 });
    x.fillStyle = "#dfe6f5";
    x.fillText(label, cx + 20, 483);
    cx += w + 16;
  }
  x.fillStyle = "#7d89a6";
  x.font = `400 22px ${FONT}`;
  x.fillText("NEXUS · ACM MIT CAMPUS STUDENT CHAPTER", 64, 566);
  return { texture: canvasTexture(c), chips };
}

/** Canvas size of the side screens and their planes, and the exhibition's topic tiles. */
const SIDE = { w: 1024, h: 460, pw: 7, ph: 3.15 };
function exhibitionTiles(n: number): Rect[] {
  const cols = n > 6 ? 4 : n > 3 ? 3 : n;
  const tw = (SIDE.w - 96 - (cols - 1) * 20) / cols;
  return Array.from({ length: n }, (_, i) => ({ x: 48 + (i % cols) * (tw + 20), y: 168 + Math.floor(i / cols) * 130, w: tw, h: 110 }));
}
/** Directory rows on the right-hand screen. */
const dirRow = (i: number): Rect => ({ x: 40, y: 176 + i * 44 - 32, w: 944, h: 42 });
const inside = (r: Rect, px: number, py: number) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

function exhibitionScreen(t: Territory) {
  const { c, x } = screen(SIDE.w, SIDE.h, t.accent);
  x.fillStyle = t.accent;
  x.font = `600 24px ${FONT}`;
  x.fillText("EXHIBITION", 48, 70);
  x.fillStyle = "#f2f6ff";
  x.font = `700 44px ${FONT}`;
  x.fillText(`What lives in ${t.short}`, 48, 126);
  x.fillStyle = "#7d89a6";
  x.font = `400 20px ${FONT}`;
  x.textAlign = "right";
  x.fillText("SELECT A HALL TO ENTER", SIDE.w - 48, 70);
  x.textAlign = "left";
  const tiles = exhibitionTiles(Math.min(t.topics.length, 8));
  const size = tiles.length > 6 ? 24 : 28;
  tiles.forEach((r, i) => {
    x.fillStyle = hexA(t.accent, 0.1);
    x.fillRect(r.x, r.y, r.w, r.h);
    x.fillStyle = t.accent;
    x.fillRect(r.x, r.y, 5, r.h);
    x.fillStyle = hexA(t.accent, 0.9);
    x.font = `600 20px ${FONT}`;
    x.fillText(String(i + 1).padStart(2, "0"), r.x + 24, r.y + 40);
    x.textAlign = "right";
    x.fillText("→", r.x + r.w - 18, r.y + 40);
    x.textAlign = "left";
    x.fillStyle = "#e6ebf7";
    x.font = `600 ${size}px ${FONT}`;
    wrap(x, t.topics[i]!, r.w - 40, 2).forEach((l, k) => x.fillText(l, r.x + 24, r.y + 76 + k * (size + 2)));
  });
  return canvasTexture(c);
}

function directoryScreen(t: Territory) {
  const { c, x } = screen(SIDE.w, SIDE.h, t.accent);
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

/** The tiles of a hall's main display: up to six items, three to a row. */
function boardTiles(n: number): Rect[] {
  const tw = (MAIN.w - 128 - 2 * 24) / 3;
  return Array.from({ length: n }, (_, i) => ({ x: 64 + (i % 3) * (tw + 24), y: 214 + Math.floor(i / 3) * 172, w: tw, h: 152 }));
}

/** Main display of a topic hall: its name and its items as tiles. */
function hallDisplay(t: Territory, hall: TopicHall, board: HallBoard | undefined) {
  const { c, x } = screen(MAIN.w, MAIN.h, t.accent);
  x.textBaseline = "alphabetic";
  x.fillStyle = t.accent;
  x.font = `600 28px ${FONT}`;
  x.fillText(`${t.code} · TOPIC HALL · ${t.short.toUpperCase()}`, 64, 84);
  x.fillStyle = "#f2f6ff";
  x.font = `700 76px ${FONT}`;
  x.fillText(hall.name.toUpperCase(), 64, 168);
  const items = board?.items ?? [];
  const count = board?.count ?? 0;
  x.textAlign = "right";
  x.fillStyle = "#7d89a6";
  x.font = `400 22px ${FONT}`;
  if (items.length) x.fillText("SELECT AN ITEM TO OPEN IT", MAIN.w - 64, 84);
  x.fillStyle = hexA(t.accent, 0.95);
  x.font = `600 26px ${FONT}`;
  if (board) x.fillText(`${count} ${count === 1 ? "ITEM" : "ITEMS"}${board.source === "sample" ? " · SAMPLE DATA" : ""}`, MAIN.w - 64, 168);
  x.textAlign = "left";

  const tiles = boardTiles(items.length);
  tiles.forEach((r, i) => {
    const item = items[i]!;
    x.fillStyle = hexA(t.accent, 0.1);
    x.fillRect(r.x, r.y, r.w, r.h);
    x.fillStyle = t.accent;
    x.fillRect(r.x, r.y, 5, r.h);
    x.fillStyle = hexA(t.accent, 0.95);
    x.font = `600 19px ${FONT}`;
    x.fillText(item.kind.toUpperCase(), r.x + 26, r.y + 36);
    x.textAlign = "right";
    x.fillText(item.external ? "↗" : "→", r.x + r.w - 20, r.y + 36);
    x.textAlign = "left";
    x.fillStyle = "#eef2fb";
    x.font = `600 30px ${FONT}`;
    wrap(x, item.title, r.w - 52, 2).forEach((l, k) => x.fillText(l, r.x + 26, r.y + 78 + k * 34));
    if (item.meta) {
      x.fillStyle = "#8f9ab4";
      x.font = `400 19px ${FONT}`;
      x.fillText(wrap(x, item.meta.toUpperCase(), r.w - 52, 1)[0] ?? "", r.x + 26, r.y + r.h - 18);
    }
  });

  if (items.length === 0) {
    x.strokeStyle = hexA(t.accent, 0.35);
    x.lineWidth = 2;
    x.setLineDash([10, 8]);
    x.strokeRect(64, 214, MAIN.w - 128, 300);
    x.setLineDash([]);
    x.fillStyle = "#c3cce4";
    x.font = `500 34px ${FONT}`;
    x.textAlign = "center";
    const msg = !board || board.source === "error" ? "This hall could not be loaded right now." : "Nothing has been published in this hall yet.";
    x.fillText(msg, MAIN.w / 2, 354);
    x.fillStyle = "#7d89a6";
    x.font = `400 24px ${FONT}`;
    x.fillText("Its page lists everything as soon as it is.", MAIN.w / 2, 404);
    x.textAlign = "left";
  }

  x.fillStyle = "#7d89a6";
  x.font = `400 22px ${FONT}`;
  const more = count - items.length;
  x.fillText(more > 0 ? `+ ${more} MORE ON THE HALL PAGE — SEE THE LEFT WALL` : "NEXUS · ACM MIT CAMPUS STUDENT CHAPTER", 64, 572);
  return { texture: canvasTexture(c), rects: tiles };
}

/** The "open the page" button on a hall's left wall. */
const HALL_BUTTON: Rect = { x: 48, y: 338, w: 440, h: 72 };

/** Left wall of a topic hall: what the hall is, and its full page. */
function hallAbout(t: Territory, hall: TopicHall) {
  const { c, x } = screen(SIDE.w, SIDE.h, t.accent);
  x.fillStyle = t.accent;
  x.font = `600 24px ${FONT}`;
  x.fillText("ABOUT THIS HALL", 48, 70);
  x.fillStyle = "#f2f6ff";
  x.font = `700 44px ${FONT}`;
  x.fillText(wrap(x, hall.name, SIDE.w - 96, 1)[0] ?? hall.name, 48, 126);
  x.fillStyle = "#b8c2da";
  x.font = `400 26px ${FONT}`;
  wrap(x, hall.blurb, SIDE.w - 96, 4).forEach((l, i) => x.fillText(l, 48, 180 + i * 36));
  const r = HALL_BUTTON;
  x.fillStyle = hexA(t.accent, 0.16);
  x.fillRect(r.x, r.y, r.w, r.h);
  x.strokeStyle = t.accent;
  x.lineWidth = 2;
  x.strokeRect(r.x, r.y, r.w, r.h);
  x.fillStyle = "#f2f6ff";
  x.font = `600 24px ${FONT}`;
  x.fillText("OPEN THE HALL PAGE  →", r.x + 28, r.y + 46);
  x.fillStyle = "#7d89a6";
  x.font = `400 20px ${FONT}`;
  x.fillText("EVERY ITEM, IN FULL", r.x + r.w + 28, r.y + 46);
  return { texture: canvasTexture(c), rects: [r] };
}

/** Right wall of a topic hall: back to the reception, then the district's other halls. */
function hallList(t: Territory, halls: TopicHall[], slug: string) {
  const { c, x } = screen(SIDE.w, SIDE.h, t.accent);
  x.fillStyle = t.accent;
  x.font = `600 24px ${FONT}`;
  x.fillText(`HALLS OF ${t.short.toUpperCase()}`, 48, 70);
  x.fillStyle = "#7d89a6";
  x.font = `400 20px ${FONT}`;
  x.textAlign = "right";
  x.fillText("SELECT TO WALK THERE", SIDE.w - 48, 70);
  x.textAlign = "left";
  const rows = ["← Reception", ...halls.map((h) => h.name)];
  const step = Math.min(44, (SIDE.h - 120) / rows.length);
  const rects: (Rect | null)[] = rows.map((label, i) => {
    const r = { x: 40, y: 96 + i * step, w: 944, h: step - 4 };
    const here = i > 0 && halls[i - 1]!.slug === slug;
    if (here) {
      x.fillStyle = hexA(t.accent, 0.16);
      x.fillRect(r.x, r.y, r.w, r.h);
    }
    const mid = r.y + r.h / 2 + 8;
    x.fillStyle = i === 0 ? t.accent : here ? "#ffffff" : "#c3cce4";
    x.font = `${here || i === 0 ? 700 : 500} ${Math.round(Math.min(26, step * 0.6))}px ${FONT}`;
    x.fillText(label.toUpperCase(), 64, mid);
    x.fillStyle = "#7d89a6";
    x.font = `400 18px ${FONT}`;
    x.textAlign = "right";
    x.fillText(here ? "YOU ARE HERE" : "→", 976, mid);
    x.textAlign = "left";
    return here ? null : r;
  });
  return { texture: canvasTexture(c), rects };
}

/** Opens an item from a hall's board: site pages in the world, outside links in a new tab. */
function openItem(item: { href: string; external?: boolean }) {
  if (item.external) window.open(item.href, "_blank", "noopener,noreferrer");
  else openWorldPage(item.href);
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

/** A reception (`slug` null) or one of its topic halls. */
function Room({ id, slug }: { id: TerritoryId; slug: string | null }) {
  const t = getTerritory(id);
  const hall = useMemo(() => (slug ? getHall(id, slug) : null), [id, slug]);
  const halls = useMemo(() => hallsOf(id), [id]);
  const boards = useHallBoards();
  const board = slug ? boards[`${id}/${slug}`] : undefined;
  const topics = useMemo(() => topicsOf(id), [id]);
  const built = useMemo(() => {
    const accent = new THREE.Color(t.accent);
    const screens = hall
      ? { main: hallDisplay(t, hall, board), exhibition: hallAbout(t, hall), directory: hallList(t, halls, hall.slug) }
      : {
          main: (({ texture, chips }) => ({ texture, rects: chips }))(mainDisplay(t)),
          exhibition: { texture: exhibitionScreen(t), rects: exhibitionTiles(Math.min(topics.length, 8)) },
          directory: { texture: directoryScreen(t), rects: territories.map((d, k) => (d.id === id ? null : dirRow(k))) },
        };
    const textures = {
      main: screens.main.texture,
      exhibition: screens.exhibition.texture,
      directory: screens.directory.texture,
      reception: sign(hall ? `HALL · ${hall.name.toUpperCase()}` : `RECEPTION · ${t.code}`, t.accent, hall ? 768 : 512),
      welcome: sign(`WELCOME TO ${t.short.toUpperCase()}`, t.accent, 768, 96),
      exit: sign(hall ? "RECEPTION ▲" : "EXIT ▲", EXIT_GREEN, hall ? 512 : 384, 112),
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
      hover: new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
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
    const rects = { main: screens.main.rects as (Rect | null)[], exhibition: screens.exhibition.rects as (Rect | null)[], directory: screens.directory.rects };
    return { textures, mats, geos, rects };
  }, [id, t, hall, halls, board, topics]);

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

  // Reception: topic chips (main display) and tiles (exhibition) open their
  // topic hall; directory rows walk to that district's reception.
  // Hall: tiles open their item, the left wall the hall's page, the right
  // wall the other halls (or the reception).
  const walls = useMemo(
    () => ({ main: { ...MAIN, rects: built.rects.main }, exhibition: { ...SIDE, rects: built.rects.exhibition }, directory: { ...SIDE, rects: built.rects.directory } }),
    [built],
  );
  type Wall = keyof typeof walls;
  const [hot, setHot] = useState<{ wall: Wall; i: number } | null>(null);
  const hit = (wall: Wall, e: ThreeEvent<PointerEvent | MouseEvent>) => {
    if (!e.uv) return -1;
    const s = walls[wall];
    const px = e.uv.x * s.w;
    const py = (1 - e.uv.y) * s.h;
    return s.rects.findIndex((r) => r !== null && inside(r, px, py));
  };
  const hover = (wall: Wall) => (e: ThreeEvent<PointerEvent>) => {
    const i = hit(wall, e);
    document.body.style.cursor = i >= 0 ? "pointer" : "";
    setHot((h) => (i < 0 ? null : h?.wall === wall && h.i === i ? h : { wall, i }));
  };
  const leave = () => {
    document.body.style.cursor = "";
    setHot(null);
  };
  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );
  const select = (wall: Wall) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    const i = hit(wall, e);
    if (i < 0) return;
    if (hall) {
      const item = board?.items[i];
      if (wall === "main") item && openItem(item);
      else if (wall === "exhibition") openWorldPage(hallHref(id, hall.slug));
      else if (i === 0) toReception();
      else openWorldPage(hallHref(id, halls[i - 1]!.slug));
    } else if (wall === "directory") explore.go(`${territories[i]!.id}:in`);
    else openWorldPage(topics[i]!.href);
  };
  /** Highlight over the hovered chip, tile or row, in the screen plane's units. */
  const highlight = (wall: Wall, z: number) => {
    const r = hot?.wall === wall ? walls[wall].rects[hot.i] : null;
    if (!r) return null;
    const s = walls[wall];
    return (
      <mesh material={built.mats.hover} position={[((r.x + r.w / 2) / s.w - 0.5) * s.pw, (0.5 - (r.y + r.h / 2) / s.h) * s.ph, z]}>
        <planeGeometry args={[(r.w / s.w) * s.pw, (r.h / s.h) * s.ph]} />
      </mesh>
    );
  };
  const screenProps = (wall: Wall) => ({ onPointerMove: hover(wall), onPointerOut: leave, onClick: select(wall) });

  /** From a hall back to its reception (closing the hall's page, if it is open). */
  function toReception() {
    if (window.location.pathname !== "/explore") openWorldPage("/explore");
    explore.go(`${id}:in`);
  }
  const exit = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    if (hall) toReception();
    else explore.go(id);
  };

  const { mats, geos } = built;
  const [x, z] = DISTRICT_POS[id];
  const box = (size: V3, position: V3, material: THREE.Material, key?: string) => (
    <mesh key={key} material={material} position={position}>
      <boxGeometry args={size} />
    </mesh>
  );

  return (
    <group position={[x, hall ? HALL_Y : INTERIOR_Y, z]}>
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
      <mesh material={mats.main} position={[0, 4.05, -D / 2 + 0.14]} {...screenProps("main")}>
        <planeGeometry args={[8, 3.2]} />
      </mesh>
      <group position={[0, 4.05, -D / 2 + 0.14]}>{highlight("main", 0.005)}</group>
      {box([8, 0.05, 0.06], [0, 2.1, -D / 2 + 0.16], mats.glow)}

      {/* Left wall: exhibition screen */}
      <group position={[-W / 2 + 0.07, 3.2, -0.8]} rotation={[0, Math.PI / 2, 0]}>
        {box([7.4, 3.6, 0.1], [0, 0, 0], mats.trim)}
        <mesh material={mats.exhibition} position={[0, 0, 0.06]} {...screenProps("exhibition")}>
          <planeGeometry args={[7, 3.15]} />
        </mesh>
        {highlight("exhibition", 0.065)}
      </group>
      {/* Right wall: directory */}
      <group position={[W / 2 - 0.07, 3.2, -0.8]} rotation={[0, -Math.PI / 2, 0]}>
        {box([7.4, 3.6, 0.1], [0, 0, 0], mats.trim)}
        <mesh material={mats.directory} position={[0, 0, 0.06]} {...screenProps("directory")}>
          <planeGeometry args={[7, 3.15]} />
        </mesh>
        {highlight("directory", 0.065)}
      </group>

      {/* Reception: desk, its screen and the hanging sign (a hall hangs only its name) */}
      {hall ? (
        <group position={[0, 0, -1.2]}>
          <mesh material={mats.reception} position={[0, 5.55, 0]}>
            <planeGeometry args={[3.6, 0.45]} />
          </mesh>
          {box([0.02, H - 5.78, 0.02], [-1.5, 5.78 + (H - 5.78) / 2, 0], mats.trim)}
          {box([0.02, H - 5.78, 0.02], [1.5, 5.78 + (H - 5.78) / 2, 0], mats.trim)}
        </group>
      ) : (
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
      )}

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
          <planeGeometry args={[hall ? 2 : 1.5, 0.44]} />
        </mesh>
      </group>
    </group>
  );
}

/** The room the visitor is currently in, if any: a reception or a topic hall. */
export function DistrictInterior() {
  const focus = useExplore((s) => s.focus);
  const slug = useExplore((s) => s.hall);
  const id = isInterior(focus) ? districtOf(focus) : null;
  if (!id) return null;
  const hall = isHall(focus) && slug && getHall(id, slug) ? slug : null;
  return <Room key={`${id}/${hall ?? "reception"}`} id={id} slug={hall} />;
}
