"use client";

import { setConsoleFunction } from "three";

/**
 * three r183 deprecated THREE.Clock, but @react-three/fiber 9 (the latest
 * stable release) still creates one inside every canvas's store, so each
 * canvas printed a deprecation warning we cannot fix from our code. Our own
 * code uses no Clock. This routes three's console output through its official
 * hook, drops that single known message, and forwards everything else exactly
 * as three would have printed it.
 */
const SILENCED = ["THREE.Clock: This module has been deprecated"];

type StackTrace = { isStackTrace: true; getError: (message: string) => Error };
const isTrace = (v: unknown): v is StackTrace => typeof v === "object" && v !== null && (v as { isStackTrace?: boolean }).isStackTrace === true;

let installed = false;

export function installThreeConsole() {
  if (installed) return;
  installed = true;
  setConsoleFunction((type, message, ...params) => {
    if (type === "warn" && SILENCED.some((s) => message.startsWith(s))) return;
    const out = type === "error" ? console.error : type === "warn" ? console.warn : console.log;
    if (isTrace(params[0])) out(params[0].getError(message));
    else out(message, ...params);
  });
}

installThreeConsole();
