// render.js — every pixel of the Gilded Ace: the casino floor, the guards and their
// vision cones, the loot, the full side-panel HUD, the banners and the getaway screen.
// All art is procedural Canvas 2D: no image files, no fonts loaded, no network.

import { PLAY_W, PLAY_H, TOP_BAR, ROUTE_DEFS } from './world.js';
import { CONE_HALF_ANGLE, CONE_RANGE, alarmBand, inShadow } from './guards.js';

export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const HUD_X = PLAY_W; // 904 — the side panel starts here
export const HUD_W = CANVAS_W - PLAY_W; // 376

const GOLD = '#d4af37';
const GOLD_BRIGHT = '#ffd76a';
const TEAL = '#0f766e';
const TEAL_DARK = '#0b3d3a';
const CRIMSON = '#c1121f';
const CREAM = '#f5e6c8';
const INK = '#14100a';

// ---------------------------------------------------------------- helpers

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = `${weight || '700'} ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function smallText(ctx, str, x, y, size, color, align) {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

// ---------------------------------------------------------------- the room

/** Art-deco carpet: deep teal with a gold diamond lattice, drawn fresh every frame. */
export function drawCarpet(ctx, job, time) {
  ctx.fillStyle = '#0d2f2b';
  ctx.fillRect(0, TOP_BAR, PLAY_W, PLAY_H);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, TOP_BAR, PLAY_W, PLAY_H); ctx.clip();
  ctx.strokeStyle = 'rgba(212,175,55,0.16)';
  ctx.lineWidth = 1;
  const step = 46;
  for (let y = TOP_BAR - step; y < TOP_BAR + PLAY_H + step; y += step) {
    for (let x = -step; x < PLAY_W + step; x += step) {
      const ox = ((y / step) % 2 === 0) ? 0 : step / 2;
      ctx.beginPath();
      ctx.moveTo(x + ox, y - 14); ctx.lineTo(x + ox + 14, y);
      ctx.lineTo(x + ox, y + 14); ctx.lineTo(x + ox - 14, y);
      ctx.closePath(); ctx.stroke();
    }
  }
  // Warm light pools under every chandelier.
  for (const p of job.props) {
    if (p.type !== 'chandelier') continue;
    const cx = p.x + p.w / 2, cy = TOP_BAR + p.y + p.h / 2;
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 130);
    g.addColorStop(0, 'rgba(255,214,106,0.34)');
    g.addColorStop(0.6, 'rgba(255,190,80,0.13)');
    g.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 130, 0, Math.PI * 2); ctx.fill();
  }
  // Vignette: dark edges sell the midnight casino.
  const vg = ctx.createRadialGradient(PLAY_W / 2, TOP_BAR + PLAY_H / 2, PLAY_H * 0.42, PLAY_W / 2, TOP_BAR + PLAY_H / 2, PLAY_H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, TOP_BAR, PLAY_W, PLAY_H);
  ctx.restore();
  void time;
}

export function drawWalls(ctx, job, state) {
  for (const w of job.walls) {
    ctx.fillStyle = '#3a2c14';
    ctx.fillRect(w.x, TOP_BAR + w.y, w.w, w.h);
    ctx.fillStyle = GOLD;
    ctx.fillRect(w.x, TOP_BAR + w.y, w.w, 3);
    ctx.fillRect(w.x, TOP_BAR + w.y + w.h - 3, w.w, 3);
  }
  // Locked door: gold bars while shut, open gap once picked.
  const d = job.lockedDoor;
  if (!state.doorOpen) {
    ctx.fillStyle = '#5c4312';
    ctx.fillRect(d.x, TOP_BAR + d.y, d.w, d.h);
    ctx.fillStyle = GOLD_BRIGHT;
    for (let y = d.y + 6; y < d.y + d.h - 4; y += 12) ctx.fillRect(d.x + 3, TOP_BAR + y, d.w - 6, 5);
    smallText(ctx, 'LOCKED', d.x + d.w / 2, TOP_BAR + d.y - 6, 10, GOLD_BRIGHT, 'center');
  } else {
    ctx.fillStyle = 'rgba(127,227,200,0.35)';
    ctx.fillRect(d.x, TOP_BAR + d.y, d.w, d.h);
    smallText(ctx, 'OPEN', d.x + d.w / 2, TOP_BAR + d.y - 6, 10, '#7fe3c8', 'center');
  }
}

/** One casino prop, drawn procedurally by type. */
function drawProp(ctx, p, time) {
  const x = p.x, y = TOP_BAR + p.y;
  if (p.type === 'roulette') {
    ctx.fillStyle = '#14532d'; rr(ctx, x, y, p.w, p.h, 12); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; rr(ctx, x, y, p.w, p.h, 12); ctx.stroke();
    ctx.fillStyle = '#7c2d12'; ctx.beginPath(); ctx.arc(x + p.w / 2, y + p.h / 2, 30, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = CREAM; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + p.w / 2, y + p.h / 2, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = CREAM; ctx.beginPath(); ctx.arc(x + p.w / 2, y + p.h / 2, 9, 0, Math.PI * 2); ctx.fill();
    const ball = time * 2.4;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + p.w / 2 + Math.cos(ball) * 22, y + p.h / 2 + Math.sin(ball) * 22, 4, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#dc2626' : '#111827';
      ctx.fillRect(x + 8 + i * 10, y + p.h - 16, 9, 10);
    }
  } else if (p.type === 'slot') {
    ctx.fillStyle = '#7f1d1d'; rr(ctx, x, y, p.w, p.h, 8); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; rr(ctx, x, y, p.w, p.h, 8); ctx.stroke();
    ctx.fillStyle = CREAM; ctx.fillRect(x + 8, y + 10, p.w - 16, 26);
    ctx.fillStyle = CRIMSON; ctx.font = '700 16px Arial';
    ctx.textAlign = 'center'; ctx.fillText('7 7 7', x + p.w / 2, y + 29);
    ctx.fillStyle = GOLD_BRIGHT; ctx.fillRect(x + 12, y + 48, p.w - 24, 8);
    ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(x + p.w / 2, y + 66, 6, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'chandelier') {
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.arc(x + p.w / 2, y + p.h / 2, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = GOLD_BRIGHT; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + p.w / 2 + Math.cos(a) * 18, y + p.h / 2 + Math.sin(a) * 18);
      ctx.lineTo(x + p.w / 2 + Math.cos(a) * 30, y + p.h / 2 + Math.sin(a) * 30);
      ctx.stroke();
      ctx.fillStyle = '#fff7cc';
      ctx.beginPath(); ctx.arc(x + p.w / 2 + Math.cos(a) * 32, y + p.h / 2 + Math.sin(a) * 32, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,247,204,0.85)';
    ctx.beginPath(); ctx.arc(x + p.w / 2, y + p.h / 2, 7, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'table') {
    ctx.fillStyle = '#14532d'; rr(ctx, x, y, p.w, p.h, 10); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; rr(ctx, x, y, p.w, p.h, 10); ctx.stroke();
    ctx.fillStyle = CREAM;
    ctx.fillRect(x + 14, y + 14, 16, 22); ctx.fillRect(x + 36, y + 14, 16, 22);
    ctx.fillStyle = CRIMSON; ctx.beginPath(); ctx.arc(x + p.w - 24, y + 22, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = GOLD_BRIGHT; ctx.beginPath(); ctx.arc(x + p.w - 42, y + 22, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 24, y + p.h - 18, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 44, y + p.h - 18, 7, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'bar') {
    ctx.fillStyle = '#431407'; rr(ctx, x, y, p.w, p.h, 8); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; rr(ctx, x, y, p.w, p.h, 8); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = ['#16a34a', '#dc2626', '#2563eb', '#f59e0b'][i % 4];
      ctx.fillRect(x + 10 + i * 19, y + 8, 10, 22);
    }
    ctx.fillStyle = GOLD_BRIGHT; ctx.fillRect(x + 6, y + 38, p.w - 12, 4);
  } else if (p.type === 'plant') {
    ctx.fillStyle = '#78350f'; ctx.fillRect(x + 14, y + p.h - 16, 16, 16);
    ctx.fillStyle = '#15803d';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.45;
      ctx.beginPath();
      ctx.ellipse(x + p.w / 2 + Math.cos(a) * 12, y + 16 + Math.sin(a) * 10, 7, 16, a, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (p.type === 'rope') {
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.arc(x + 4, y + 13, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + p.w - 4, y + 13, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = CRIMSON; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x + 4, y + 10);
    ctx.quadraticCurveTo(x + p.w / 2, y + 26, x + p.w - 4, y + 10); ctx.stroke();
  } else if (p.type === 'pillar') {
    ctx.fillStyle = '#292524'; ctx.fillRect(x, y, p.w, p.h);
    ctx.fillStyle = GOLD; ctx.fillRect(x, y, p.w, 4); ctx.fillRect(x, y + p.h - 4, p.w, 4);
  } else if (p.type === 'safe') {
    ctx.fillStyle = '#374151'; rr(ctx, x, y, p.w, p.h, 6); ctx.fill();
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; rr(ctx, x, y, p.w, p.h, 6); ctx.stroke();
    ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(x + p.w / 2, y + p.h / 2, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = GOLD_BRIGHT; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + p.w / 2, y + p.h / 2, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = GOLD_BRIGHT; ctx.beginPath(); ctx.arc(x + p.w / 2, y + p.h / 2, 6, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'vent') {
    ctx.fillStyle = '#44403c'; ctx.fillRect(x, y, p.w, p.h);
    ctx.strokeStyle = '#a8a29e'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x + 4, y + 7 + i * 8); ctx.lineTo(x + p.w - 4, y + 7 + i * 8); ctx.stroke();
    }
  }
  if (p.label && p.type !== 'chandelier' && p.type !== 'pillar') {
    smallText(ctx, p.label.toUpperCase(), x + p.w / 2, y + p.h + 12, 9, 'rgba(245,230,200,0.75)', 'center');
  }
}

export function drawProps(ctx, job, time) {
  for (const p of job.props) drawProp(ctx, p, time);
}

/** The three named routes, drawn faintly on the floor so the judge sees the depth. */
export function drawRoutes(ctx, job) {
  job.routes.forEach((pts, i) => {
    ctx.strokeStyle = ROUTE_DEFS[i].color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    pts.forEach(([px, py], k) => { if (k === 0) ctx.moveTo(px, TOP_BAR + py); else ctx.lineTo(px, TOP_BAR + py); });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    // Arrowhead at the end of each route.
    const last = pts[pts.length - 1], prev = pts[pts.length - 2];
    const a = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
    ctx.fillStyle = ROUTE_DEFS[i].color;
    ctx.beginPath();
    ctx.moveTo(last[0] + Math.cos(a) * 10, TOP_BAR + last[1] + Math.sin(a) * 10);
    ctx.lineTo(last[0] + Math.cos(a + 2.5) * 8, TOP_BAR + last[1] + Math.sin(a + 2.5) * 8);
    ctx.lineTo(last[0] + Math.cos(a - 2.5) * 8, TOP_BAR + last[1] + Math.sin(a - 2.5) * 8);
    ctx.closePath(); ctx.fill();
  });
}

// ---------------------------------------------------------------- threats

/** A guard's vision cone: gold when calm, red when hunting. */
function drawCone(ctx, x, y, facing, color, range) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - CONE_HALF_ANGLE, facing + CONE_HALF_ANGLE);
  ctx.closePath();
  const g = ctx.createRadialGradient(x, y, 10, x, y, range);
  g.addColorStop(0, color.replace('A', '0.42'));
  g.addColorStop(1, color.replace('A', '0.05'));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = color.replace('A', '0.55');
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

export function drawThreats(ctx, job, state, run, time) {
  // Patrol paths: dashed lines the judge can read before the thief moves.
  ctx.setLineDash([5, 7]);
  for (const g of state.guards) {
    ctx.strokeStyle = 'rgba(255,215,106,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    g.waypoints.forEach(([px, py], k) => { if (k === 0) ctx.moveTo(px, TOP_BAR + py); else ctx.lineTo(px, TOP_BAR + py); });
    ctx.closePath(); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Camera cones sweep; guard cones follow facing.
  for (const c of state.cameras) {
    const facing = c.baseAngle + Math.sin(c.phase) * c.sweep;
    drawCone(ctx, c.x, TOP_BAR + c.y, facing, 'rgba(239,68,68,A)', c.range);
  }
  for (const g of state.guards) {
    const color = g.mode === 'chase' ? 'rgba(239,68,68,A)' : g.mode === 'investigate' ? 'rgba(251,191,36,A)' : 'rgba(255,215,106,A)';
    if (g.mode !== 'blinded') drawCone(ctx, g.x, TOP_BAR + g.y, g.facing, color, CONE_RANGE);
  }

  // Laser grids pulse red.
  for (const l of job.lasers) {
    const pulse = 0.55 + Math.sin(time * 5) * 0.3;
    ctx.strokeStyle = `rgba(239,68,68,${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(l.x1, TOP_BAR + l.y1); ctx.lineTo(l.x2, TOP_BAR + l.y2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${pulse * 0.7})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(l.x1, TOP_BAR + l.y1); ctx.lineTo(l.x2, TOP_BAR + l.y2); ctx.stroke();
    smallText(ctx, l.name, (l.x1 + l.x2) / 2, TOP_BAR + (l.y1 + l.y2) / 2 - 8, 10, '#fca5a5', 'center');
  }
  void run;
}

export function drawCameras(ctx, job, state) {
  for (const c of state.cameras) {
    const y = TOP_BAR + c.y;
    ctx.fillStyle = '#1f2937'; rr(ctx, c.x - 11, y - 8, 22, 16, 4); ctx.fill();
    ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1.5; rr(ctx, c.x - 11, y - 8, 22, 16, 4); ctx.stroke();
    const facing = c.baseAngle + Math.sin(c.phase) * c.sweep;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.arc(c.x + Math.cos(facing) * 8, y + Math.sin(facing) * 8, 3.5, 0, Math.PI * 2); ctx.fill();
    smallText(ctx, c.name, c.x, y + 26, 9, '#fca5a5', 'center');
  }
}

// ---------------------------------------------------------------- loot, guards, thief

export function drawLoot(ctx, state, time) {
  for (const l of state.loot) {
    if (l.taken) continue;
    const y = TOP_BAR + l.y;
    const pulse = 1 + Math.sin(time * 3 + l.x) * 0.15;
    const glow = ctx.createRadialGradient(l.x, y, 2, l.x, y, l.objective ? 46 : 30);
    glow.addColorStop(0, l.objective ? 'rgba(255,215,106,0.55)' : 'rgba(127,227,200,0.4)');
    glow.addColorStop(1, 'rgba(255,215,106,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(l.x, y, l.objective ? 46 : 30, 0, Math.PI * 2); ctx.fill();
    // Gem: a faceted diamond.
    ctx.fillStyle = l.objective ? GOLD_BRIGHT : '#7fe3c8';
    ctx.beginPath();
    ctx.moveTo(l.x, y - 11 * pulse); ctx.lineTo(l.x + 9 * pulse, y);
    ctx.lineTo(l.x, y + 11 * pulse); ctx.lineTo(l.x - 9 * pulse, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.moveTo(l.x, y - 11 * pulse); ctx.lineTo(l.x + 9 * pulse, y); ctx.lineTo(l.x, y);
    ctx.closePath(); ctx.fill();
    if (l.objective) {
      smallText(ctx, '★ ' + l.name.toUpperCase(), l.x, y - 18, 11, GOLD_BRIGHT, 'center');
      smallText(ctx, 'OBJECTIVE', l.x, y + 26, 9, GOLD_BRIGHT, 'center');
    } else {
      smallText(ctx, l.name, l.x, y + 24, 9, 'rgba(245,230,200,0.85)', 'center');
    }
  }
}

export function drawGuards(ctx, state) {
  for (const g of state.guards) {
    const y = TOP_BAR + g.y;
    // Shadow under the guard.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(g.x, y + 14, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    // Body: dark suit, gold trim; red when chasing.
    ctx.fillStyle = g.mode === 'chase' ? '#7f1d1d' : g.mode === 'blinded' ? '#44403c' : '#1c1917';
    ctx.beginPath(); ctx.arc(g.x, y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = g.mode === 'chase' ? '#ef4444' : GOLD;
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.x, y, 13, 0, Math.PI * 2); ctx.stroke();
    // Head + facing wedge.
    ctx.fillStyle = '#f5d0a9';
    ctx.beginPath(); ctx.arc(g.x, y - 2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = g.mode === 'chase' ? '#ef4444' : GOLD_BRIGHT;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(g.facing) * 6, y - 2 + Math.sin(g.facing) * 6);
    ctx.lineTo(g.x + Math.cos(g.facing + 2.4) * 10, y - 2 + Math.sin(g.facing + 2.4) * 10);
    ctx.lineTo(g.x + Math.cos(g.facing - 2.4) * 10, y - 2 + Math.sin(g.facing - 2.4) * 10);
    ctx.closePath(); ctx.fill();
    // Name label.
    smallText(ctx, g.name, g.x, y - 20, 10, g.mode === 'chase' ? '#fca5a5' : CREAM, 'center');
    // Suspicion marker.
    if (g.mode === 'chase') {
      text(ctx, '!', g.x + 16, y - 14, 22, '#ef4444', 'center', '900');
    } else if (g.mode === 'investigate') {
      text(ctx, '?', g.x + 16, y - 14, 22, GOLD_BRIGHT, 'center', '900');
    }
    // Speech bubble.
    if (g.bubble && g.bubbleT > 0) {
      const w = ctx.measureText(g.bubble).width + 18;
      ctx.font = '700 11px Arial';
      const bw = ctx.measureText(g.bubble).width + 18;
      void w;
      ctx.fillStyle = 'rgba(245,230,200,0.96)';
      rr(ctx, g.x - bw / 2, y - 52, bw, 20, 6); ctx.fill();
      ctx.fillStyle = INK;
      ctx.font = '700 11px Arial'; ctx.textAlign = 'center';
      ctx.fillText(g.bubble, g.x, y - 38);
      ctx.beginPath();
      ctx.moveTo(g.x - 5, y - 32); ctx.lineTo(g.x + 5, y - 32); ctx.lineTo(g.x, y - 24);
      ctx.closePath(); ctx.fillStyle = 'rgba(245,230,200,0.96)'; ctx.fill();
    }
  }
}

/** ACE, the card-sharp thief: teal suit, gold top hat, a white glove hand. */
export function drawPlayer(ctx, player, time) {
  const y = TOP_BAR + player.y;
  const bob = Math.sin(time * 6) * 1.5;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(player.x, y + 15, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(player.x, y + bob, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = GOLD_BRIGHT; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(player.x, y + bob, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#f5d0a9';
  ctx.beginPath(); ctx.arc(player.x, y - 2 + bob, 6.5, 0, Math.PI * 2); ctx.fill();
  // Top hat.
  ctx.fillStyle = INK;
  ctx.fillRect(player.x - 7, y - 14 + bob, 14, 9);
  ctx.fillRect(player.x - 10, y - 6 + bob, 20, 3);
  ctx.fillStyle = GOLD_BRIGHT; ctx.fillRect(player.x - 7, y - 8 + bob, 14, 2.5);
  // Facing: a gold card in hand.
  const fx = Math.cos(player.facing), fy = Math.sin(player.facing);
  ctx.fillStyle = CREAM;
  ctx.save();
  ctx.translate(player.x + fx * 15, y + fy * 15 + bob);
  ctx.rotate(player.facing);
  ctx.fillRect(-4, -6, 8, 12);
  ctx.fillStyle = CRIMSON; ctx.font = '900 9px Arial'; ctx.textAlign = 'center';
  ctx.fillText('A', 0, 4);
  ctx.restore();
  smallText(ctx, 'ACE', player.x, y - 22, 11, GOLD_BRIGHT, 'center');
}

export function drawEffects(ctx, smoke, coins, time) {
  for (const s of smoke) {
    const a = Math.min(0.85, s.t / s.max + 0.3);
    const g = ctx.createRadialGradient(s.x, TOP_BAR + s.y, 4, s.x, TOP_BAR + s.y, s.r);
    g.addColorStop(0, `rgba(214,211,209,${a})`);
    g.addColorStop(1, 'rgba(214,211,209,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s.x, TOP_BAR + s.y, s.r, 0, Math.PI * 2); ctx.fill();
    smallText(ctx, 'SMOKE — CONES BLIND', s.x, TOP_BAR + s.y - s.r - 6, 10, '#e7e5e4', 'center');
  }
  for (const c of coins) {
    if (c.landed) {
      const r = 12 + c.ring * 60;
      ctx.strokeStyle = `rgba(255,215,106,${1 - c.ring})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(c.x, TOP_BAR + c.y, r, 0, Math.PI * 2); ctx.stroke();
      smallText(ctx, 'NOISE!', c.x, TOP_BAR + c.y - 20, 11, GOLD_BRIGHT, 'center');
    }
    ctx.fillStyle = GOLD_BRIGHT;
    ctx.beginPath(); ctx.arc(c.x, TOP_BAR + c.y - (c.landed ? 0 : 10), 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(c.x, TOP_BAR + c.y - (c.landed ? 0 : 10), 5, 0, Math.PI * 2); ctx.stroke();
  }
  void time;
}

/** Exit marker: the getaway door, glowing green once the objective is taken. */
export function drawExit(ctx, job, objectiveTaken) {
  const e = job.exit;
  const y = TOP_BAR + e.y;
  const g = ctx.createRadialGradient(e.x, y, 4, e.x, y, 44);
  g.addColorStop(0, objectiveTaken ? 'rgba(74,222,128,0.5)' : 'rgba(255,215,106,0.3)');
  g.addColorStop(1, 'rgba(74,222,128,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(e.x, y, 44, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = objectiveTaken ? '#22c55e' : '#78716c';
  rr(ctx, e.x - 16, y - 20, 32, 40, 6); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; rr(ctx, e.x - 16, y - 20, 32, 40, 6); ctx.stroke();
  ctx.fillStyle = '#052e16'; ctx.font = '900 13px Arial'; ctx.textAlign = 'center';
  ctx.fillText('EXIT', e.x, y + 5);
  smallText(ctx, e.name, e.x, y + 34, 10, objectiveTaken ? '#86efac' : CREAM, 'center');
  if (!objectiveTaken) smallText(ctx, 'NEEDS OBJECTIVE', e.x, y + 47, 9, 'rgba(245,230,200,0.6)', 'center');
}

// ---------------------------------------------------------------- top bar

export function drawTopBar(ctx, job, run, time) {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, CANVAS_W, TOP_BAR);
  ctx.fillStyle = GOLD; ctx.fillRect(0, TOP_BAR - 3, CANVAS_W, 3);
  text(ctx, '♠ GILDED ACE', 16, 29, 22, GOLD_BRIGHT, 'left', '900');
  text(ctx, '— A CASINO HEIST —', 210, 29, 13, CREAM, 'left', '700');
  const mins = String(Math.floor(run.elapsed / 60)).padStart(2, '0');
  const secs = String(Math.floor(run.elapsed % 60)).padStart(2, '0');
  smallText(ctx, `TIME ${mins}:${secs}`, 470, 28, 14, CREAM, 'left');
  smallText(ctx, `SCORE ${run.score}`, 600, 28, 14, GOLD_BRIGHT, 'left');
  smallText(ctx, job.name, 760, 28, 14, '#7fe3c8', 'left');
  // Mini alarm meter in the top bar.
  const band = alarmBand(run.alarm);
  const col = band === 'ALARM' ? '#ef4444' : band === 'SUSPICIOUS' ? '#fbbf24' : '#4ade80';
  smallText(ctx, 'ALARM', 1010, 28, 12, col, 'left');
  ctx.fillStyle = '#292524'; rr(ctx, 1075, 14, 130, 16, 4); ctx.fill();
  ctx.fillStyle = col; rr(ctx, 1075, 14, 130 * (run.alarm / 100), 16, 4); ctx.fill();
  smallText(ctx, `${Math.round(run.alarm)}`, 1215, 28, 13, col, 'left');
  void time;
}

// ---------------------------------------------------------------- side HUD

function hudSection(ctx, y, label) {
  smallText(ctx, label, HUD_X + 18, y, 11, GOLD, 'left');
  ctx.fillStyle = 'rgba(212,175,55,0.5)';
  ctx.fillRect(HUD_X + 18, y + 5, HUD_W - 36, 1);
  return y + 20;
}

function meter(ctx, y, label, value, max, color, textValue) {
  smallText(ctx, label, HUD_X + 18, y, 11, CREAM, 'left');
  smallText(ctx, textValue, HUD_X + HUD_W - 18, y, 11, color, 'right');
  ctx.fillStyle = '#292524'; rr(ctx, HUD_X + 18, y + 6, HUD_W - 36, 12, 4); ctx.fill();
  ctx.fillStyle = color; rr(ctx, HUD_X + 18, y + 6, (HUD_W - 36) * Math.min(1, value / max), 12, 4); ctx.fill();
  return y + 25;
}

export function drawHud(ctx, job, state, run, inv, player, jobs, currentJob) {
  ctx.fillStyle = '#171310';
  ctx.fillRect(HUD_X, TOP_BAR, HUD_W, PLAY_H);
  ctx.fillStyle = GOLD; ctx.fillRect(HUD_X, TOP_BAR, 3, PLAY_H);
  let y = TOP_BAR + 22;

  // Job + objective.
  text(ctx, job.name, HUD_X + 18, y, 16, GOLD_BRIGHT, 'left', '900'); y += 17;
  smallText(ctx, job.tagline, HUD_X + 18, y, 10, 'rgba(245,230,200,0.75)', 'left'); y += 8;
  y = hudSection(ctx, y + 4, '◆ OBJECTIVE');
  const obj = state.loot.find((l) => l.objective);
  smallText(ctx, obj.taken ? '✓ STOLEN: ' + obj.name : 'STEAL ' + obj.name.toUpperCase(), HUD_X + 18, y, 12, obj.taken ? '#4ade80' : GOLD_BRIGHT, 'left'); y += 17;
  smallText(ctx, obj.taken ? '→ Reach the EXIT to escape' : '→ Then reach the EXIT', HUD_X + 18, y, 11, CREAM, 'left'); y += 6;

  // Detection system.
  y = hudSection(ctx, y + 6, '◆ DETECTION');
  const band = alarmBand(run.alarm);
  const bandCol = band === 'ALARM' ? '#ef4444' : band === 'SUSPICIOUS' ? '#fbbf24' : '#4ade80';
  smallText(ctx, 'STATE', HUD_X + 18, y, 11, CREAM, 'left');
  smallText(ctx, band, HUD_X + HUD_W - 18, y, 13, bandCol, 'right'); y += 18;
  y = meter(ctx, y, 'ALARM', run.alarm, 100, bandCol, `${Math.round(run.alarm)} / 100`);
  smallText(ctx, 'VISIBILITY', HUD_X + 18, y, 11, CREAM, 'left');
  const shadowed = inShadow(player.x, player.y, job);
  smallText(ctx, run.visibility, HUD_X + HUD_W - 18, y, 11, shadowed ? '#7fe3c8' : '#fbbf24', 'right'); y += 16;
  y = meter(ctx, y, 'NOISE', run.noise, 100, '#fb923c', run.noise > 60 ? 'LOUD' : run.noise > 20 ? 'HEARD' : 'QUIET');
  smallText(ctx, 'SPOTTED', HUD_X + 18, y, 11, CREAM, 'left');
  smallText(ctx, `${run.spotted}×` + (run.lastSpotter ? ` — LAST: ${run.lastSpotter}` : ''), HUD_X + HUD_W - 18, y, 11, run.spotted ? '#fca5a5' : CREAM, 'right'); y += 4;

  // Loot.
  y = hudSection(ctx, y + 10, '◆ LOOT');
  const taken = state.loot.filter((l) => l.taken).length;
  y = meter(ctx, y, 'TREASURES', taken, state.loot.length, GOLD_BRIGHT, `${taken} / ${state.loot.length}`);
  smallText(ctx, 'GOAL: steal the objective, then escape', HUD_X + 18, y, 10, 'rgba(245,230,200,0.7)', 'left'); y += 6;

  // Gadgets with counts and costs.
  y = hudSection(ctx, y + 8, '◆ GADGETS  (points buy silence)');
  for (const g of inv) {
    smallText(ctx, `[${g.key}] ${g.name}`, HUD_X + 18, y, 12, g.left > 0 ? CREAM : '#78716c', 'left');
    smallText(ctx, `×${g.left}  — ${g.cost} pts`, HUD_X + HUD_W - 18, y, 12, g.left > 0 ? GOLD_BRIGHT : '#78716c', 'right'); y += 15;
    smallText(ctx, g.desc, HUD_X + 34, y, 10, 'rgba(245,230,200,0.6)', 'left'); y += 13;
  }

  // Campaign progress.
  y = hudSection(ctx, y + 2, '◆ CAMPAIGN — 5 JOBS (keys 1–5)');
  jobs.forEach((j, i) => {
    const done = run.completedJobs.includes(i);
    const cur = i === currentJob;
    smallText(ctx, `${cur ? '▶ ' : '   '}${j.name}`, HUD_X + 18, y, 11, done ? '#4ade80' : cur ? GOLD_BRIGHT : CREAM, 'left');
    smallText(ctx, done ? 'DONE ✓' : cur ? 'NOW' : '', HUD_X + HUD_W - 18, y, 11, done ? '#4ade80' : GOLD_BRIGHT, 'right');
    y += 13;
  });

  // Minimap with the three routes.
  y = hudSection(ctx, y + 2, '◆ FLOOR PLAN — 3 ROUTES');
  const mw = HUD_W - 36, mh = 64;
  const mx = HUD_X + 18, my = y;
  ctx.fillStyle = '#0d2f2b'; rr(ctx, mx, my, mw, mh, 6); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; rr(ctx, mx, my, mw, mh, 6); ctx.stroke();
  const sx = mw / PLAY_W, sy = mh / PLAY_H;
  ctx.save();
  ctx.beginPath(); rr(ctx, mx, my, mw, mh, 6); ctx.clip();
  for (const w of job.walls) { ctx.fillStyle = '#3a2c14'; ctx.fillRect(mx + w.x * sx, my + w.y * sy, Math.max(2, w.w * sx), Math.max(2, w.h * sy)); }
  job.routes.forEach((pts, i) => {
    ctx.strokeStyle = ROUTE_DEFS[i].color; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath();
    pts.forEach(([px, py], k) => { if (k === 0) ctx.moveTo(mx + px * sx, my + py * sy); else ctx.lineTo(mx + px * sx, my + py * sy); });
    ctx.stroke(); ctx.setLineDash([]);
  });
  for (const l of state.loot) {
    if (l.taken) continue;
    ctx.fillStyle = l.objective ? GOLD_BRIGHT : '#7fe3c8';
    ctx.beginPath(); ctx.arc(mx + l.x * sx, my + l.y * sy, l.objective ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
  }
  for (const g of state.guards) {
    ctx.fillStyle = g.mode === 'chase' ? '#ef4444' : '#fca5a5';
    ctx.beginPath(); ctx.arc(mx + g.x * sx, my + g.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(mx + player.x * sx, my + player.y * sy, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  y += mh + 6;
  ROUTE_DEFS.forEach((r, i) => {
    ctx.fillStyle = r.color; ctx.fillRect(HUD_X + 18 + (i % 3) * 118, y, 10, 10);
    smallText(ctx, r.name, HUD_X + 32 + (i % 3) * 118, y + 9, 9, CREAM, 'left');
  });
  y += 19;

  // Legend + controls.
  y = hudSection(ctx, y + 4, '◆ LEGEND & CONTROLS');
  smallText(ctx, 'Gold cone = guard sight   Red cone = camera / chase', HUD_X + 18, y, 10, CREAM, 'left'); y += 13;
  smallText(ctx, '◆ gold gem = objective    ◆ teal gem = treasure', HUD_X + 18, y, 10, CREAM, 'left'); y += 13;
  smallText(ctx, 'WASD / arrows move · C coin · X smoke · E lockpick', HUD_X + 18, y, 10, CREAM, 'left'); y += 13;
  smallText(ctx, 'J job board · 1–5 switch job · M mute · R restart job', HUD_X + 18, y, 10, CREAM, 'left');
}

// ---------------------------------------------------------------- banners

export function drawBanner(ctx, run) {
  const band = alarmBand(run.alarm);
  if (band === 'CALM' || run.phase !== 'play') return;
  const alarm = band === 'ALARM';
  const w = 560, h = 44, x = (PLAY_W - w) / 2, y = TOP_BAR + 12;
  ctx.fillStyle = alarm ? 'rgba(127,29,29,0.92)' : 'rgba(120,83,9,0.92)';
  rr(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = alarm ? '#ef4444' : GOLD_BRIGHT; ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 8); ctx.stroke();
  const label = alarm
    ? `⚠ FULL ALARM — SPOTTED BY ${run.lastSpotter || 'SECURITY'}`
    : '⚠ A GUARD IS SUSPICIOUS — BREAK LINE OF SIGHT';
  text(ctx, label, PLAY_W / 2, y + 29, 16, alarm ? '#fecaca' : '#fef3c7', 'center', '900');
}

/** Caught screen: the fair caught moment, with the guard who got you named. */
export function drawCaught(ctx, run) {
  ctx.fillStyle = 'rgba(10,5,5,0.82)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  text(ctx, 'CAUGHT!', CANVAS_W / 2, 240, 64, '#ef4444', 'center', '900');
  text(ctx, `${run.caughtBy} grabbed ACE by the collar.`, CANVAS_W / 2, 300, 22, CREAM, 'center', '700');
  text(ctx, 'The house always wins... this time. The plan was good — the timing was not.',
    CANVAS_W / 2, 336, 16, 'rgba(245,230,200,0.8)', 'center', '400');
  text(ctx, `Loot kept: ${run.lootTaken} treasures · Time: ${Math.floor(run.elapsed)}s · Spotted ${run.spotted}×`,
    CANVAS_W / 2, 380, 15, GOLD_BRIGHT, 'center', '700');
  text(ctx, 'Press R to retry the job — the guards reset, the plan is yours.',
    CANVAS_W / 2, 440, 18, '#7fe3c8', 'center', '700');
}

// ---------------------------------------------------------------- results / getaway

/** The getaway screen: route replay on the floor plan, stats, medals, GHOST rating. */
export function drawResults(ctx, job, run, trail) {
  ctx.fillStyle = '#0b1f1d';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Gold art-deco frame.
  ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
  rr(ctx, 18, 18, CANVAS_W - 36, CANVAS_H - 36, 14); ctx.stroke();
  ctx.strokeStyle = 'rgba(212,175,55,0.4)'; ctx.lineWidth = 1;
  rr(ctx, 28, 28, CANVAS_W - 56, CANVAS_H - 56, 10); ctx.stroke();

  text(ctx, '★ GETAWAY ★', CANVAS_W / 2, 86, 44, GOLD_BRIGHT, 'center', '900');
  text(ctx, `${job.name} — CLEAN ESCAPE`, CANVAS_W / 2, 122, 20, '#7fe3c8', 'center', '700');
  text(ctx, 'The vault door clicks shut behind you. The casino never knew ACE was there.',
    CANVAS_W / 2, 148, 14, 'rgba(245,230,200,0.8)', 'center', '400');

  // Route replay map (left).
  const mapX = 60, mapY = 180, mapW = 560, mapH = 380;
  ctx.fillStyle = '#0d2f2b'; rr(ctx, mapX, mapY, mapW, mapH, 10); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2; rr(ctx, mapX, mapY, mapW, mapH, 10); ctx.stroke();
  text(ctx, 'ROUTE REPLAY — YOUR PATH THROUGH THE CASINO', mapX + 16, mapY + 24, 13, GOLD_BRIGHT, 'left', '900');
  const sx = (mapW - 32) / PLAY_W, sy = (mapH - 48) / PLAY_H;
  const ox = mapX + 16, oy = mapY + 36;
  for (const w of job.walls) { ctx.fillStyle = '#3a2c14'; ctx.fillRect(ox + w.x * sx, oy + w.y * sy, Math.max(2, w.w * sx), Math.max(2, w.h * sy)); }
  for (const p of job.props) {
    if (p.type === 'roulette' || p.type === 'table') {
      ctx.fillStyle = '#14532d';
      ctx.fillRect(ox + p.x * sx, oy + p.y * sy, Math.max(4, p.w * sx), Math.max(4, p.h * sy));
    }
  }
  // The player's trail, gold, with dots where loot was taken.
  if (trail.length > 1) {
    ctx.strokeStyle = GOLD_BRIGHT; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath();
    trail.forEach((pt, i) => { if (i === 0) ctx.moveTo(ox + pt.x * sx, oy + pt.y * sy); else ctx.lineTo(ox + pt.x * sx, oy + pt.y * sy); });
    ctx.stroke();
    const start = trail[0], end = trail[trail.length - 1];
    ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(ox + start.x * sx, oy + start.y * sy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(ox + end.x * sx, oy + end.y * sy, 7, 0, Math.PI * 2); ctx.fill();
    smallText(ctx, 'IN', ox + start.x * sx, oy + start.y * sy - 12, 10, '#86efac', 'center');
    smallText(ctx, 'OUT', ox + end.x * sx, oy + end.y * sy - 12, 10, '#fca5a5', 'center');
  }
  for (const pt of run.lootPoints) {
    ctx.fillStyle = GOLD_BRIGHT;
    ctx.beginPath(); ctx.arc(ox + pt.x * sx, oy + pt.y * sy, 5, 0, Math.PI * 2); ctx.fill();
  }
  smallText(ctx, '— gold line: your route · ◆ dots: treasures taken', mapX + 16, mapY + mapH - 12, 11, 'rgba(245,230,200,0.7)', 'left');

  // Stats + medals (right).
  const rx = 680;
  text(ctx, 'THE TAKE', rx, 210, 22, GOLD_BRIGHT, 'left', '900');
  const stats = [
    ['TIME', `${Math.floor(run.elapsed)}s ${run.elapsed < 75 ? '(under 75s!)' : ''}`],
    ['TREASURES', `${run.lootTaken} / ${run.lootTotal}`],
    ['TIMES SPOTTED', `${run.spotted}×`],
    ['CLOSE CALLS', `${run.closeCalls}`],
    ['GADGETS USED', `${run.gadgetsUsed}`],
    ['LASER TRIPS', `${run.laserTrips}`],
    ['SCORE', `${run.score} pts`],
  ];
  let sy2 = 244;
  for (const [k, v] of stats) {
    smallText(ctx, k, rx, sy2, 13, CREAM, 'left');
    smallText(ctx, v, 1220, sy2, 13, GOLD_BRIGHT, 'right');
    ctx.fillStyle = 'rgba(212,175,55,0.25)'; ctx.fillRect(rx, sy2 + 6, 1220 - rx, 1);
    sy2 += 28;
  }
  const medals = [
    ['NEVER SPOTTED', run.spotted === 0],
    ['EVERY VALUABLE', run.lootTaken === run.lootTotal],
    ['UNDER 75 SECONDS', run.elapsed < 75],
  ];
  text(ctx, 'MEDALS', rx, sy2 + 18, 22, GOLD_BRIGHT, 'left', '900');
  sy2 += 50;
  for (const [name, won] of medals) {
    ctx.fillStyle = won ? GOLD_BRIGHT : '#44403c';
    ctx.beginPath(); ctx.arc(rx + 12, sy2 - 5, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = won ? '#14100a' : '#a8a29e';
    ctx.font = '900 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText(won ? '★' : '—', rx + 12, sy2 - 1);
    smallText(ctx, name, rx + 32, sy2, 14, won ? GOLD_BRIGHT : '#a8a29e', 'left');
    smallText(ctx, won ? 'EARNED' : 'MISSED', 1220, sy2, 12, won ? '#4ade80' : '#78716c', 'right');
    sy2 += 30;
  }
  // GHOST rating.
  const ghost = run.spotted === 0;
  const rating = ghost ? 'GHOST' : run.spotted <= 1 ? 'SHADOW' : run.spotted <= 3 ? 'PROFESSIONAL' : 'LOUD';
  text(ctx, `RATING: ${rating}`, rx, sy2 + 26, 30, ghost ? '#7fe3c8' : GOLD_BRIGHT, 'left', '900');
  text(ctx, ghost ? '“Nobody will ever know you were there.”' : '“The house felt something — but the take is yours.”',
    rx, sy2 + 54, 14, CREAM, 'left', '400');
  text(ctx, 'Press N for the next job · R to replay · 1–5 to pick a job',
    CANVAS_W / 2, CANVAS_H - 52, 15, '#7fe3c8', 'center', '700');
}

// ---------------------------------------------------------------- job board overlay

export function drawJobBoard(ctx, jobs, currentJob, completed) {
  ctx.fillStyle = 'rgba(8,12,11,0.9)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  text(ctx, '♠ THE JOB BOARD ♠', CANVAS_W / 2, 110, 40, GOLD_BRIGHT, 'center', '900');
  text(ctx, 'Five jobs. One casino. Pick your heist — keys 1–5, or click a card. J to close.',
    CANVAS_W / 2, 146, 15, CREAM, 'center', '400');
  const cw = 200, ch = 300, gap = 20;
  const total = jobs.length * cw + (jobs.length - 1) * gap;
  let x = (CANVAS_W - total) / 2;
  const y = 190;
  jobs.forEach((job, i) => {
    const done = completed.includes(i);
    const cur = i === currentJob;
    ctx.fillStyle = cur ? '#1e3a34' : '#171310';
    rr(ctx, x, y, cw, ch, 12); ctx.fill();
    ctx.strokeStyle = done ? '#4ade80' : cur ? GOLD_BRIGHT : GOLD;
    ctx.lineWidth = cur ? 3 : 2;
    rr(ctx, x, y, cw, ch, 12); ctx.stroke();
    text(ctx, `JOB ${i + 1}`, x + cw / 2, y + 40, 22, GOLD_BRIGHT, 'center', '900');
    text(ctx, job.room, x + cw / 2, y + 70, 14, '#7fe3c8', 'center', '700');
    ctx.fillStyle = 'rgba(245,230,200,0.8)';
    ctx.font = '12px Georgia'; ctx.textAlign = 'center';
    const words = job.tagline.split(' ');
    let line = '', ly = y + 100;
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 26) { ctx.fillText(line.trim(), x + cw / 2, ly); ly += 17; line = w; }
      else line += ' ' + w;
    }
    ctx.fillText(line.trim(), x + cw / 2, ly);
    smallText(ctx, `${job.guards.length} GUARDS · ${job.cameras.length} CAMERAS`, x + cw / 2, y + 190, 11, CREAM, 'center');
    smallText(ctx, `${job.loot.length} TREASURES · ${job.lasers.length} LASERS`, x + cw / 2, y + 210, 11, CREAM, 'center');
    smallText(ctx, `TARGET: ${job.loot[0].name}`, x + cw / 2, y + 240, 11, GOLD_BRIGHT, 'center');
    text(ctx, done ? '✓ DONE' : cur ? '▶ PLAYING' : 'PRESS ' + (i + 1), x + cw / 2, y + 275, 14, done ? '#4ade80' : GOLD_BRIGHT, 'center', '900');
    x += cw + gap;
  });
}

// ---------------------------------------------------------------- screenshot annotations

/** Callout labels for staged screenshots: a leader line + a gold tag. */
export function callout(ctx, x, y, tx, ty, label) {
  ctx.strokeStyle = GOLD_BRIGHT; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.fillStyle = GOLD_BRIGHT;
  ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  ctx.font = '700 12px Arial';
  const w = ctx.measureText(label).width + 16;
  const bx = tx - w / 2, by = ty - 24;
  ctx.fillStyle = 'rgba(20,16,10,0.92)';
  rr(ctx, bx, by, w, 22, 5); ctx.fill();
  ctx.strokeStyle = GOLD_BRIGHT; ctx.lineWidth = 1.5; rr(ctx, bx, by, w, 22, 5); ctx.stroke();
  ctx.fillStyle = GOLD_BRIGHT; ctx.textAlign = 'center';
  ctx.fillText(label, tx, ty - 9);
}
