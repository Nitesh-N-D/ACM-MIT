"use client";

import { useSyncExternalStore } from "react";
import type { HallBoards } from "@/lib/data/halls";

/**
 * What the boards of each topic hall's room show, loaded on the server with
 * the explore page and read inside the 3D scene (which sits outside React
 * context, so a tiny store carries it across).
 */
let boards: HallBoards = {};
const listeners = new Set<() => void>();

export function setHallBoards(next: HallBoards) {
  if (next === boards) return;
  boards = next;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export function useHallBoards(): HallBoards {
  return useSyncExternalStore(
    subscribe,
    () => boards,
    () => boards,
  );
}
