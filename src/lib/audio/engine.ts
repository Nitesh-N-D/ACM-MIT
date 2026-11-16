/**
 * NEXUS soundscape — fully procedural (Web Audio API). No audio files are
 * downloaded or shipped: every sound is synthesised in the browser, so there
 * is nothing to license and nothing heavy to load.
 *
 * Layers
 *  - Drone: detuned low saws through a slowly breathing low-pass filter.
 *  - Pad: an open fifth chord whose voices swell independently.
 *  - Air: filtered noise, like wind moving through the city.
 *  - Signals: sparse pentatonic "data" pings through an echo.
 *  - Cues: accents synced to the gateway activation sequence.
 *
 * Browsers only allow audio after a user gesture, so the engine starts on the
 * first click / key press (if the visitor hasn't muted it) or when the sound
 * toggle is pressed. The choice is remembered in localStorage.
 */

import { gateway } from "@/lib/gateway/store";

const PREF_KEY = "nexus:sound"; // "on" | "off"
const MASTER = 0.32;

export type SoundState = { pref: "on" | "off"; running: boolean };

let state: SoundState = { pref: "on", running: false };
const listeners = new Set<() => void>();
const set = (p: Partial<SoundState>) => {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let echo: GainNode | null = null;
let pingTimer: number | undefined;
let unsubGateway: (() => void) | undefined;

function readPref(): "on" | "off" {
  try {
    return window.localStorage.getItem(PREF_KEY) === "off" ? "off" : "on";
  } catch {
    return "on";
  }
}

function writePref(v: "on" | "off") {
  try {
    window.localStorage.setItem(PREF_KEY, v);
  } catch {
    /* not remembered — fine */
  }
}

/* ------------------------------------------------------------------------ */

function noiseBuffer(ac: AudioContext, seconds = 4) {
  const len = ac.sampleRate * seconds;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  // Brown noise: integrated white noise, softer than hiss.
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

function lfo(
  ac: AudioContext,
  rate: number,
  depth: number,
  target: AudioParam,
) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.frequency.value = rate;
  g.gain.value = depth;
  o.connect(g).connect(target);
  o.start();
}

function build(ac: AudioContext) {
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  master = ac.createGain();
  master.gain.value = 0;
  master.connect(comp).connect(ac.destination);

  // Echo bus for pings and cues.
  const delay = ac.createDelay(2);
  delay.delayTime.value = 0.42;
  const fb = ac.createGain();
  fb.gain.value = 0.38;
  const wet = ac.createBiquadFilter();
  wet.type = "lowpass";
  wet.frequency.value = 2600;
  echo = ac.createGain();
  echo.connect(delay).connect(wet).connect(fb).connect(delay);
  wet.connect(master);
  echo.connect(master);

  // Drone.
  const droneFilter = ac.createBiquadFilter();
  droneFilter.type = "lowpass";
  droneFilter.frequency.value = 340;
  droneFilter.Q.value = 0.8;
  const droneGain = ac.createGain();
  droneGain.gain.value = 0.16;
  droneFilter.connect(droneGain).connect(master);
  for (const [type, f, detune] of [
    ["sawtooth", 55, -7],
    ["sawtooth", 55, 7],
    ["sine", 110, 0],
  ] as const) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.connect(droneFilter);
    o.start();
  }
  lfo(ac, 0.045, 160, droneFilter.frequency);

  // Pad: A2 E3 B3 E4 — open, unresolved, "vast".
  [110, 164.81, 246.94, 329.63].forEach((f, i) => {
    const o = ac.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    const g = ac.createGain();
    g.gain.value = 0.03;
    lfo(ac, 0.03 + i * 0.017, 0.026, g.gain);
    o.connect(g).connect(master!);
    o.start();
  });

  // Air.
  const air = ac.createBufferSource();
  air.buffer = noiseBuffer(ac);
  air.loop = true;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 520;
  bp.Q.value = 0.6;
  const airGain = ac.createGain();
  airGain.gain.value = 0.1;
  lfo(ac, 0.06, 0.06, airGain.gain);
  lfo(ac, 0.021, 260, bp.frequency);
  air.connect(bp).connect(airGain).connect(master);
  air.start();
}

/* ------------------------------------------------------------------------ */

function tone(
  freq: number,
  at: number,
  dur: number,
  peak: number,
  type: OscillatorType = "sine",
  toEcho = true,
) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master);
  if (toEcho && echo) g.connect(echo);
  o.start(at);
  o.stop(at + dur + 0.05);
}

const PENTA = [659.25, 739.99, 880, 987.77, 1108.73, 1318.51];

function schedulePing() {
  pingTimer = window.setTimeout(
    () => {
      if (ctx && ctx.state === "running") {
        const f = PENTA[Math.floor(Math.random() * PENTA.length)]!;
        const now = ctx.currentTime;
        tone(f, now, 1.4, 0.035);
        if (Math.random() < 0.4) tone(f * 1.5, now + 0.18, 1.1, 0.02);
      }
      schedulePing();
    },
    4000 + Math.random() * 6000,
  );
}

/** Low impact: pitch-dropping sine + noise burst. */
function boom(at: number, gain = 0.5) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(90, at);
  o.frequency.exponentialRampToValueAtTime(32, at + 1.6);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 2.2);
  o.connect(g).connect(master);
  o.start(at);
  o.stop(at + 2.3);
}

/** Filtered noise sweep (doors opening / passage). */
function whoosh(
  at: number,
  dur: number,
  from: number,
  to: number,
  gain = 0.25,
) {
  if (!ctx || !master) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, Math.ceil(dur) + 1);
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 1.4;
  f.frequency.setValueAtTime(from, at);
  f.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + dur * 0.4);
  g.gain.linearRampToValueAtTime(0, at + dur);
  src.connect(f).connect(g).connect(master);
  src.start(at);
  src.stop(at + dur + 0.1);
}

/** Accents for the 15-step activation sequence. */
function cue(step: number) {
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime + 0.01;
  switch (step) {
    case 2: // gate materialises
      whoosh(t, 2.2, 180, 900, 0.12);
      break;
    case 3: // visor ignites
      tone(1318.51, t, 1.2, 0.05);
      tone(1975.53, t + 0.09, 1.0, 0.03);
      break;
    case 5: // artifact charging
      tone(220, t, 2.4, 0.06, "triangle");
      tone(330, t + 0.25, 2.2, 0.05, "triangle");
      break;
    case 8: // resonance pulse
      boom(t, 0.55);
      whoosh(t, 1.2, 2400, 300, 0.18);
      break;
    case 10: // doors part
      whoosh(t, 1.8, 120, 1400, 0.22);
      break;
    case 14: // the city lights up
      [440, 554.37, 659.25, 880].forEach((f, i) =>
        tone(f, t + i * 0.12, 3.2, 0.04, "triangle"),
      );
      break;
  }
}

function watchGateway() {
  let last = gateway.get().step;
  unsubGateway = gateway.subscribe(() => {
    const s = gateway.get();
    if (s.step !== last) {
      last = s.step;
      if (s.phase === "intro") cue(s.step);
    }
  });
}

/* ------------------------------------------------------------------------ */

function fadeTo(v: number, seconds: number) {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(v, now + seconds);
}

async function start() {
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return;
  try {
    if (!ctx) {
      ctx = new AC();
      build(ctx);
      schedulePing();
      watchGateway();
    }
    await ctx.resume();
    fadeTo(MASTER, 2.5);
    set({ running: true });
  } catch {
    set({ running: false });
  }
}

function stop() {
  if (!ctx) return set({ running: false });
  fadeTo(0, 0.6);
  const c = ctx;
  window.setTimeout(() => {
    if (state.pref === "off" || document.hidden) void c.suspend();
  }, 700);
  set({ running: false });
}

let installed = false;

export const sound = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  /** Install once: read preference, arm the first-gesture start, pause in background tabs. */
  install() {
    if (installed) return () => {};
    installed = true;
    set({ pref: readPref() });

    const onGesture = (e: Event) => {
      // The toggle handles its own click.
      if ((e.target as Element | null)?.closest?.("[data-sound-toggle]"))
        return;
      if (state.pref === "on" && !state.running) void start();
      disarm();
    };
    const disarm = () => {
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("keydown", onGesture, true);
    };
    window.addEventListener("pointerdown", onGesture, true);
    window.addEventListener("keydown", onGesture, true);

    const onVisibility = () => {
      if (!ctx) return;
      if (document.hidden) {
        void ctx.suspend();
      } else if (state.pref === "on" && state.running) {
        void ctx.resume();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disarm();
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(pingTimer);
      unsubGateway?.();
      void ctx?.close();
      ctx = null;
      master = null;
      echo = null;
      installed = false;
    };
  },

  toggle() {
    if (state.running) {
      writePref("off");
      set({ pref: "off" });
      stop();
    } else {
      writePref("on");
      set({ pref: "on" });
      void start();
    }
  },
};
