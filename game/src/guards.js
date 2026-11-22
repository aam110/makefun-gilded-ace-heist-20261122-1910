// guards.js — patrol routes, vision cones, cameras, lasers and the detection system.
// Detection is a real system: cones with line-of-sight, suspicion that builds, guards that
// investigate noise and chase a spotted thief. Nothing here is decorative.

export const CONE_HALF_ANGLE = 0.58; // radians either side of facing (~66 deg cone)
export const CONE_RANGE = 195;
export const CATCH_RADIUS = 26;
export const SHADOW_FACTOR = 0.35; // detection builds 65% slower in shadow

/** Segment vs axis-aligned rect intersection (for line-of-sight through walls). */
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1, dy = y2 - y1;
  let tmin = 0, tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let ta = (r.x - x1) / dx, tb = (r.x + r.w - x1) / dx;
    if (ta > tb) { const t = ta; ta = tb; tb = t; }
    tmin = Math.max(tmin, ta); tmax = Math.min(tmax, tb);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let ta = (r.y - y1) / dy, tb = (r.y + r.h - y1) / dy;
    if (ta > tb) { const t = ta; ta = tb; tb = t; }
    tmin = Math.max(tmin, ta); tmax = Math.min(tmax, tb);
    if (tmin > tmax) return false;
  }
  return true;
}

/** True when no wall (and no closed locked door) blocks the view from (x1,y1) to (x2,y2). */
export function hasLineOfSight(x1, y1, x2, y2, job, state) {
  for (const w of job.walls) if (segmentHitsRect(x1, y1, x2, y2, w)) return false;
  if (!state.doorOpen && segmentHitsRect(x1, y1, x2, y2, job.lockedDoor)) return false;
  return true;
}

/** Is the thief inside this guard's vision cone (range + angle + line of sight)? */
export function inVisionCone(px, py, gx, gy, facing, job, state) {
  const dx = px - gx, dy = py - gy;
  const dist = Math.hypot(dx, dy);
  if (dist > CONE_RANGE) return false;
  const ang = Math.atan2(dy, dx);
  let diff = ang - facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > CONE_HALF_ANGLE) return false;
  return hasLineOfSight(gx, gy, px, py, job, state);
}

/** Is the thief standing in shadow (far from every chandelier light pool)? */
export function inShadow(px, py, job) {
  for (const p of job.props) {
    if (p.type !== 'chandelier') continue;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    if (Math.hypot(px - cx, py - cy) < 95) return false;
  }
  return true;
}

/** Distance from a point to a line segment (for laser crossing checks). */
export function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Move one guard along its patrol, or toward its investigate/chase target. */
export function stepGuard(g, dt, job, state, player, api) {
  const speed = g.mode === 'chase' ? g.speed * 1.9 : g.speed;
  let tx, ty;
  if (g.mode === 'chase') { tx = player.x; ty = player.y; }
  else if (g.mode === 'investigate') { tx = g.targetX; ty = g.targetY; }
  else {
    if (g.wait > 0) { g.wait -= dt; return; }
    const wp = g.waypoints[g.wp];
    tx = wp[0]; ty = wp[1];
  }
  const dx = tx - g.x, dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;
  if (dist <= step + 0.5) {
    g.x = tx; g.y = ty;
    if (g.mode === 'patrol') {
      g.wp = (g.wp + 1) % g.waypoints.length;
      g.wait = 1.2;
      const next = g.waypoints[g.wp];
      g.facing = Math.atan2(next[1] - g.y, next[0] - g.x);
    } else if (g.mode === 'investigate') {
      g.mode = 'patrol';
      g.suspect = Math.max(0, g.suspect - 0.4);
      g.bubble = 'Nothing here...'; g.bubbleT = 2.2;
    }
    return;
  }
  g.x += (dx / dist) * step;
  g.y += (dy / dist) * step;
  g.facing = Math.atan2(dy, dx);
  void api;
}

/**
 * Run one detection tick for every guard and camera.
 * Mutates `run` (alarm, spotted count, caught flag) and guard modes/bubbles.
 * Returns the strongest detection label this tick: 'seen' | 'glimpsed' | 'none'.
 */
export function detectionTick(job, state, player, run, dt, smoke, api) {
  let strongest = 'none';
  const shadowed = inShadow(player.x, player.y, job);
  const blinded = smoke.some((s) => s.t > 0);

  for (const g of state.guards) {
    if (g.bubbleT > 0) g.bubbleT -= dt;
    if (g.mode === 'blinded') {
      if (!blinded) { g.mode = 'patrol'; g.bubble = ''; }
      continue;
    }
    const seen = !blinded && inVisionCone(player.x, player.y, g.x, g.y, g.facing, job, state);
    if (seen) {
      const rate = shadowed ? SHADOW_FACTOR : 1;
      g.suspect = Math.min(1, g.suspect + dt * 1.4 * rate);
      run.alarm = Math.min(100, run.alarm + dt * (shadowed ? 14 : 34));
      strongest = g.suspect >= 0.85 ? 'seen' : 'glimpsed';
      if (g.suspect >= 0.85 && g.mode !== 'chase') {
        g.mode = 'chase';
        g.bubble = 'Thief! There!'; g.bubbleT = 2.5;
        run.spotted++;
        run.lastSpotter = g.name;
        api.onSpotted(g.name);
      } else if (g.suspect >= 0.4 && g.mode === 'patrol') {
        g.mode = 'investigate';
        g.targetX = player.x; g.targetY = player.y;
        g.bubble = 'What was that?'; g.bubbleT = 2.5;
        api.onSuspicious(g.name);
      }
    } else if (g.mode === 'chase') {
      // A chasing guard who loses sight keeps hunting briefly, then gives up
      // and returns to patrol — the chase ends on lost sight, never on the
      // global alarm level (a guard who sees the thief always chases).
      g.suspect = Math.max(0, g.suspect - dt * 0.2);
      if (g.suspect <= 0.15) {
        g.mode = 'investigate';
        g.targetX = player.x; g.targetY = player.y;
        g.bubble = 'Where did they go?'; g.bubbleT = 2.2;
      }
    } else if (g.mode === 'patrol') {
      g.suspect = Math.max(0, g.suspect - dt * 0.25);
    }
    if (g.mode === 'chase') {
      const d = Math.hypot(player.x - g.x, player.y - g.y);
      if (d < CATCH_RADIUS) { run.caught = true; run.caughtBy = g.name; }
    }
    stepGuard(g, dt, job, state, player, api);
  }

  // Cameras sweep and spot the thief too.
  for (const c of state.cameras) {
    c.phase += dt * 0.55;
    const facing = c.baseAngle + Math.sin(c.phase) * c.sweep;
    const seen = !blinded && inVisionCone(player.x, player.y, c.x, c.y, facing, job, state);
    if (seen) {
      run.alarm = Math.min(100, run.alarm + dt * (shadowed ? 10 : 26));
      if (strongest === 'none') strongest = 'glimpsed';
      if (run.alarm >= 70) {
        for (const g of state.guards) {
          if (g.mode === 'patrol') { g.mode = 'investigate'; g.targetX = player.x; g.targetY = player.y; g.bubble = 'Camera saw something!'; g.bubbleT = 2; }
        }
      }
    }
  }

  // Laser grids trip the alarm on contact.
  for (const l of job.lasers) {
    if (distToSegment(player.x, player.y, l.x1, l.y1, l.x2, l.y2) < 12) {
      run.alarm = Math.min(100, run.alarm + dt * 60);
      run.laserTrips++;
      if (strongest === 'none') strongest = 'glimpsed';
    }
  }

  // Alarm decays slowly when nobody sees the thief.
  if (strongest === 'none') run.alarm = Math.max(0, run.alarm - dt * 2.2);
  run.visibility = shadowed ? 'IN SHADOW' : 'IN THE LIGHT';
  return strongest;
}

/** Alarm band label for the HUD. */
export function alarmBand(alarm) {
  if (alarm >= 70) return 'ALARM';
  if (alarm >= 30) return 'SUSPICIOUS';
  return 'CALM';
}

/** Lure every guard within earshot toward a noise point. */
export function lureGuardsTo(state, x, y, radius) {
  let lured = 0;
  for (const g of state.guards) {
    if (g.mode === 'chase') continue;
    if (Math.hypot(g.x - x, g.y - y) < radius) {
      g.mode = 'investigate'; g.targetX = x; g.targetY = y;
      g.bubble = 'Did you hear that?'; g.bubbleT = 2.2;
      lured++;
    }
  }
  return lured;
}

/** Blind every guard whose cone overlaps a smoke cloud. */
export function blindGuardsIn(state, x, y, radius) {
  let blinded = 0;
  for (const g of state.guards) {
    if (Math.hypot(g.x - x, g.y - y) < radius + 60) {
      if (g.mode !== 'blinded') { g.mode = 'blinded'; g.bubble = 'I can\'t see!'; g.bubbleT = 3; blinded++; }
    }
  }
  return blinded;
}
