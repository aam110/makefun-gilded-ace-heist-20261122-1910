// gadgets.js — the thief's tools (smoke, lockpick, coin decoy) and the WebAudio synth.
// Every gadget has a count and a point cost, shown in the HUD. All sound is oscillators:
// no audio files, no network, nothing loaded at runtime.

import { GADGETS } from './world.js';

/** Fresh gadget inventory: counts and costs copied from the catalogue. */
export function freshInventory() {
  return GADGETS.map((g) => ({ ...g, left: g.count }));
}

export function gadgetById(inv, id) { return inv.find((g) => g.id === id); }

/** Can the thief afford (and still hold) this gadget? */
export function canUse(inv, id) {
  const g = gadgetById(inv, id);
  return g && g.left > 0;
}

/** Spend one gadget: returns its point cost, or 0 when none are left. */
export function spendGadget(inv, id) {
  const g = gadgetById(inv, id);
  if (!g || g.left <= 0) return 0;
  g.left--;
  return g.cost;
}

// ---------------------------------------------------------------- smoke clouds

/** A smoke cloud blinds cones inside its radius while its timer runs. */
export function makeSmoke(x, y) { return { x, y, r: 78, t: 6, max: 6 }; }

export function stepSmoke(clouds, dt) {
  for (let i = clouds.length - 1; i >= 0; i--) {
    clouds[i].t -= dt;
    if (clouds[i].t <= 0) clouds.splice(i, 1);
  }
}

// ---------------------------------------------------------------- coin decoys

/** A thrown coin arcs to its landing spot, then rings and lures guards. */
export function makeCoin(x, y, tx, ty) {
  return { x, y, tx, ty, t: 0, flight: 0.45, landed: false, ring: 0, ringT: 0 };
}

export function stepCoins(coins, dt, onLand) {
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    if (!c.landed) {
      c.t += dt;
      const k = Math.min(1, c.t / c.flight);
      c.x = c.x + (c.tx - c.x) * k * 0.5;
      c.y = c.y + (c.ty - c.y) * k * 0.5;
      if (k >= 1) { c.landed = true; c.x = c.tx; c.y = c.ty; c.ringT = 1.6; onLand(c); }
    } else {
      c.ringT -= dt;
      c.ring = Math.min(1, c.ring + dt * 2);
      if (c.ringT <= 0) coins.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------- lockpicks

/** Is the thief close enough to the locked door to pick it? */
export function nearLockedDoor(player, job, state) {
  if (state.doorOpen) return false;
  const d = job.lockedDoor;
  const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
  return Math.hypot(player.x - cx, player.y - cy) < 64;
}

// ---------------------------------------------------------------- sound

let audioCtx = null;
let muted = false;

function ctx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/** One oscillator blip: frequency, duration, wave shape, gain. */
function blip(freq, dur, type, gain, when) {
  const ac = ctx();
  if (!ac || muted) return;
  const t0 = ac.currentTime + (when || 0);
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ac.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

/** Named sound effects, all synthesized. */
export const sfx = {
  pickup() { blip(880, 0.12, 'triangle', 0.14); blip(1320, 0.18, 'triangle', 0.12, 0.07); },
  coin() { blip(1568, 0.09, 'square', 0.07); blip(2093, 0.12, 'square', 0.06, 0.06); },
  smoke() { blip(220, 0.3, 'sawtooth', 0.06); blip(160, 0.35, 'sawtooth', 0.05, 0.08); },
  lockpick() { blip(660, 0.06, 'square', 0.08); blip(660, 0.06, 'square', 0.08, 0.12); blip(990, 0.14, 'triangle', 0.12, 0.24); },
  suspicious() { blip(392, 0.2, 'sine', 0.12); blip(330, 0.25, 'sine', 0.12, 0.15); },
  spotted() { blip(523, 0.12, 'sawtooth', 0.12); blip(392, 0.12, 'sawtooth', 0.12, 0.12); blip(523, 0.2, 'sawtooth', 0.12, 0.24); },
  caught() { blip(196, 0.5, 'sawtooth', 0.14); blip(147, 0.6, 'sawtooth', 0.14, 0.3); },
  win() { [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'triangle', 0.13, i * 0.13)); },
  click() { blip(740, 0.05, 'sine', 0.07); },
  laser() { blip(1200, 0.08, 'sawtooth', 0.06); blip(900, 0.1, 'sawtooth', 0.06, 0.08); },
};

export function toggleMute() { muted = !muted; return muted; }
export function isMuted() { return muted; }
