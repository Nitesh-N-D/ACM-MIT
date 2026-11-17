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
 *  - Score: a slow, heroic minor progression (string-like saws, sub bass,
 *    war drums, a high arpeggio) that begins when the Sentinel's sword strikes
 *    the lock, and plays on in the background.
 *  - Lightning: the thunderclap (a crack and a long rolling rumble) and the
 *    crackle of electricity when the bolt lands on the sword.
 *  - Cues: accents synced to the gateway activation sequence.
 *
 * Browsers only allow audio after a user gesture, so the engine starts on the
 * first click / key press (if the visitor hasn't muted it) or when the sound
 * toggle is pressed. The choice is remembered in localStorage.
 */

import { gateway } from "@/lib/gateway/store";
import { STRIKE_IMPACT, STRIKE_STEP } from "@/lib/gateway/steps";

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
let droneGain: GainNode | null = null;
let musicBus: GainNode | null = null;
let brown: AudioBuffer | null = null;
let white: AudioBuffer | null = null;
let musicTimer: number | undefined;
let musicNext = 0;
let musicBar = 0;
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
  droneGain = ac.createGain();
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

  // Noise for the thunder and the crackle of the lightning.
  brown = noiseBuffer(ac, 6);
  white = whiteBuffer(ac, 3);

  // The score has its own bus, faded in when it begins.
  musicBus = ac.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(master);
}

function whiteBuffer(ac: AudioContext, seconds: number) {
  const len = ac.sampleRate * seconds;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/* ------------------------------------------------------------------------ */
/* Lightning                                                                 */

/**
 * Thunder: a sharp crack (near strikes only) and a long rumble that rolls in
 * uneven swells. `distance` 0 is overhead, 1 is far across the city: far
 * thunder arrives later, darker and softer.
 */
function thunder(at: number, distance: number, gain: number) {
  if (!ctx || !master || !brown || !white) return;
  const d = Math.min(1, Math.max(0, distance));
  const start = at + d * 1.4;

  if (d < 0.35) {
    const crack = ctx.createBufferSource();
    crack.buffer = white;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain * 0.9, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    crack.connect(hp).connect(g).connect(master);
    crack.start(start, Math.random() * 2);
    crack.stop(start + 0.4);
  }

  const dur = 4.5 + Math.random() * 2 + d * 1.5;
  const rumble = ctx.createBufferSource();
  rumble.buffer = brown;
  rumble.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(900 - d * 600, start);
  lp.frequency.exponentialRampToValueAtTime(110, start + dur);
  const g = ctx.createGain();
  // Rolling swells under a decaying envelope.
  const curve = new Float32Array(96);
  let swell = 1;
  for (let i = 0; i < curve.length; i++) {
    const x = i / (curve.length - 1);
    if (i % 8 === 0) swell = 0.55 + Math.random() * 0.45;
    const attack = Math.min(1, x / (0.015 + d * 0.08));
    curve[i] = gain * (1.6 - d) * attack * Math.exp(-x * 3.2) * swell;
  }
  curve[curve.length - 1] = 0;
  g.gain.setValueCurveAtTime(curve, start, dur);
  rumble.connect(lp).connect(g).connect(master);
  rumble.start(start, Math.random() * 3);
  rumble.stop(start + dur + 0.05);
}

/** Electricity sizzling over steel and stone: noise chopped into crackles, dying away. */
function crackle(at: number, dur: number, gain: number) {
  if (!ctx || !master || !white) return;
  const src = ctx.createBufferSource();
  src.buffer = white;
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 3200;
  bp.Q.value = 0.8;
  const g = ctx.createGain();
  const curve = new Float32Array(160);
  for (let i = 0; i < curve.length; i++) {
    const x = i / (curve.length - 1);
    curve[i] = (Math.random() < 0.45 ? Math.random() : 0.05) * gain * (1 - x) ** 1.5;
  }
  curve[curve.length - 1] = 0;
  g.gain.setValueCurveAtTime(curve, at, dur);
  src.connect(bp).connect(g).connect(master);
  src.start(at, Math.random() * 2);
  src.stop(at + dur + 0.05);
}

/**
 * Steel driven into stone as the lightning lands on it: a heavy boom, a
 * ringing clang, the thunderclap overhead, the two re-strikes, and the
 * electricity crackling away.
 */
function impact(at: number) {
  boom(at, 0.95);
  boom(at + 0.04, 0.5);
  [196, 523.3, 1187, 2093].forEach((f, i) => tone(f, at, 2.2 - i * 0.35, 0.11 - i * 0.022, "sine", true));
  thunder(at + 0.01, 0, 1);
  thunder(at + 0.2, 0.2, 0.35);
  thunder(at + 0.43, 0.25, 0.25);
  crackle(at, 1.5, 0.22);
}

/* ------------------------------------------------------------------------ */
/* Score                                                                     */

const BAR = 4.8; // seconds: 4 beats at 50 bpm
/** Am – F – C – G: an open, heroic minor turn. Roots and voicings in Hz. */
const PROGRESSION = [
  [110, 130.81, 164.81, 220],
  [87.31, 110, 130.81, 174.61],
  [130.81, 164.81, 196, 261.63],
  [98, 123.47, 146.83, 196],
] as const;

function drum(at: number, gain: number) {
  if (!ctx || !musicBus) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(78, at);
  o.frequency.exponentialRampToValueAtTime(38, at + 0.7);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
  o.connect(g).connect(musicBus);
  o.start(at);
  o.stop(at + 1.15);
}

function scheduleBar(at: number, bar: number) {
  if (!ctx || !musicBus || !echo) return;
  const chord = PROGRESSION[bar % PROGRESSION.length]!;

  // Strings: two detuned saws per voice under a slowly opening filter.
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.Q.value = 0.7;
  lp.frequency.setValueAtTime(650, at);
  lp.frequency.linearRampToValueAtTime(1500, at + BAR * 0.6);
  lp.frequency.linearRampToValueAtTime(800, at + BAR + 1);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0, at);
  sg.gain.linearRampToValueAtTime(0.05, at + 1.1);
  sg.gain.setValueAtTime(0.05, at + BAR - 0.2);
  sg.gain.linearRampToValueAtTime(0, at + BAR + 1.2);
  lp.connect(sg).connect(musicBus);
  for (const f of chord) {
    for (const det of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(lp);
      o.start(at);
      o.stop(at + BAR + 1.3);
    }
  }

  // Sub bass on the root.
  const sub = ctx.createOscillator();
  const subG = ctx.createGain();
  sub.frequency.value = chord[0] / 2;
  subG.gain.setValueAtTime(0, at);
  subG.gain.linearRampToValueAtTime(0.09, at + 0.4);
  subG.gain.linearRampToValueAtTime(0, at + BAR + 0.4);
  sub.connect(subG).connect(musicBus);
  sub.start(at);
  sub.stop(at + BAR + 0.5);

  // War drums.
  const beat = BAR / 4;
  drum(at, 0.42);
  drum(at + beat * 1.5, 0.16);
  drum(at + beat * 2, 0.3);
  drum(at + beat * 3, 0.16);
  drum(at + beat * 3.5, 0.22);

  // From the third bar, a high arpeggio through the echo.
  if (bar >= 2) {
    const notes = [chord[0] * 4, chord[1] * 4, chord[2] * 4, chord[3] * 2];
    for (let i = 0; i < 8; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = at + i * (beat / 2);
      o.type = "triangle";
      o.frequency.value = notes[i % notes.length]!;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.018, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
      o.connect(g).connect(musicBus);
      g.connect(echo);
      o.start(t0);
      o.stop(t0 + 0.6);
    }
  }
}

/** Begin the score (once). The drone steps back to make room for it. */
function startScore(at?: number) {
  if (!ctx || !musicBus || musicTimer !== undefined) return;
  const t0 = at ?? ctx.currentTime + 0.05;
  musicNext = t0;
  musicBar = 0;
  musicBus.gain.cancelScheduledValues(t0);
  musicBus.gain.setValueAtTime(0, t0);
  musicBus.gain.linearRampToValueAtTime(1, t0 + 2.5);
  droneGain?.gain.setTargetAtTime(0.08, t0, 2);
  const pump = () => {
    if (!ctx) return;
    while (musicNext < ctx.currentTime + 1.2) {
      scheduleBar(musicNext, musicBar++);
      musicNext += BAR;
    }
  };
  pump();
  musicTimer = window.setInterval(pump, 300);
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
  // The strike is often the very gesture that starts the engine, so the
  // context may still be resuming: schedule anyway, it plays once running.
  if (!ctx || ctx.state === "closed" || state.pref !== "on") return;
  const t = ctx.currentTime + 0.01;
  switch (step) {
    case STRIKE_STEP: {
      // The swing, then the blade meeting the lock and the lightning landing;
      // the score begins on the impact.
      whoosh(t + STRIKE_IMPACT * 0.35, STRIKE_IMPACT * 0.7, 300, 2600, 0.22);
      impact(t + STRIKE_IMPACT);
      startScore(t + STRIKE_IMPACT + 0.1);
      return;
    }
    case 2: // gate materialises
      whoosh(t, 2.2, 180, 900, 0.12);
      break;
    case 3: // visor ignites
      tone(1318.51, t, 1.2, 0.05);
      tone(1975.53, t + 0.09, 1.0, 0.03);
      break;
    case 5: // the sword is raised; thunder far off
      tone(220, t, 2.4, 0.06, "triangle");
      tone(330, t + 0.25, 2.2, 0.05, "triangle");
      thunder(t + 0.8, 0.9, 0.4);
      break;
    case 7: // the key is turned
      tone(164.81, t + 0.8, 2.6, 0.05, "triangle");
      tone(246.94, t + 1.0, 2.4, 0.04, "triangle");
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
    // Skipped, or never shown: the score simply plays.
    if (s.phase === "complete" && state.running) startScore();
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
    // Waiting on the strike: come up fast, so the impact lands at full weight.
    const g = gateway.get();
    fadeTo(MASTER, g.waiting || (g.phase === "intro" && g.struck) ? 0.4 : 2.5);
    await ctx.resume();
    set({ running: true });
    // The score waits for the sword to strike when the intro is playing.
    if (g.phase !== "intro") startScore();
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
      window.clearInterval(musicTimer);
      musicTimer = undefined;
      unsubGateway?.();
      void ctx?.close();
      ctx = null;
      master = null;
      echo = null;
      droneGain = musicBus = null;
      brown = white = null;
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
