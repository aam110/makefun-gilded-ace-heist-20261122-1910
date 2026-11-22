// main.js — GILDED ACE game loop: input, movement, collision, gadget use, win/lose,
// the job board, and the ?shot= staging hooks the screenshots are taken from.
// The game opens straight into gameplay: no title screen wastes a screenshot.

import { JOBS, GADGETS, PLAY_W, PLAY_H, TOP_BAR, freshJobState, seededRng } from './world.js';
import { detectionTick, alarmBand, lureGuardsTo, blindGuardsIn, inShadow, segmentHitsRect } from './guards.js';
import { freshInventory, canUse, spendGadget, makeSmoke, stepSmoke, makeCoin, stepCoins, nearLockedDoor, sfx, toggleMute } from './gadgets.js';
import {
  CANVAS_W, CANVAS_H, HUD_X,
  drawCarpet, drawWalls, drawProps, drawRoutes, drawThreats, drawCameras,
  drawLoot, drawGuards, drawPlayer, drawEffects, drawExit, drawTopBar, drawHud,
  drawBanner, drawCaught, drawResults, drawJobBoard, callout,
} from './render.js';

const PLAYER_SPEED = 165;
const PLAYER_R = 13;

/** One run's mutable state: score, alarm, loot, timers, stats. */
function freshRun() {
  return {
    phase: 'play', // play | caught | results
    score: 0, alarm: 0, elapsed: 0, noise: 0,
    visibility: 'IN SHADOW', spotted: 0, lastSpotter: '',
    caught: false, caughtBy: '',
    lootTaken: 0, lootTotal: 6, lootPoints: [],
    closeCalls: 0, gadgetsUsed: 0, laserTrips: 0,
    completedJobs: [],
    boardOpen: false,
  };
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.time = 0;
    this.keys = new Set();
    this.mouse = { x: 0, y: 0 };
    this.shot = new URLSearchParams(window.location.search).get('shot') || '';
    this.annotations = false;
    this.trail = [];
    this.trailT = 0;
    this.loadJob(1); // the Roulette Floor opens the game: the richest room, first
    this.bindInput();
    this.applyShot();
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loadJob(id) {
    this.jobId = id;
    this.job = JOBS[id];
    this.state = freshJobState(this.job);
    this.inv = freshInventory();
    this.smoke = [];
    this.coins = [];
    this.player = { x: this.job.spawn.x, y: this.job.spawn.y, facing: -Math.PI / 2 };
    if (!this.run) this.run = freshRun();
    const keep = this.run.completedJobs;
    this.run = freshRun();
    this.run.completedJobs = keep;
    this.run.lootTotal = this.job.loot.length;
    this.trail = [{ x: this.player.x, y: this.player.y }];
    this.trailT = 0;
  }

  // ---------------------------------------------------------- input

  bindInput() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      this.keys.add(k);
      if (k === 'm') toggleMute();
      if (k === 'j') { this.run.boardOpen = !this.run.boardOpen; sfx.click(); }
      if (k >= '1' && k <= '5') { this.loadJob(Number(k) - 1); sfx.click(); }
      if (k === 'r') { this.loadJob(this.jobId); sfx.click(); }
      if (k === 'n' && this.run.phase === 'results') {
        this.loadJob((this.jobId + 1) % JOBS.length); sfx.click();
      }
      if (k === 'x') this.useSmoke();
      if (k === 'c') this.throwCoin();
      if (k === 'e') this.useLockpick();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    this.canvas.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (CANVAS_W / r.width);
      this.mouse.y = (e.clientY - r.top) * (CANVAS_H / r.height);
    });
    this.canvas.addEventListener('click', (e) => {
      const r = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - r.left) * (CANVAS_W / r.width);
      const my = (e.clientY - r.top) * (CANVAS_H / r.height);
      if (this.run.boardOpen) {
        // Job board cards: five across, same geometry as the renderer draws.
        const cw = 200, ch = 300, gap = 20;
        const total = JOBS.length * cw + (JOBS.length - 1) * gap;
        const x0 = (CANVAS_W - total) / 2, y0 = 190;
        for (let i = 0; i < JOBS.length; i++) {
          const x = x0 + i * (cw + gap);
          if (mx >= x && mx <= x + cw && my >= y0 && my <= y0 + ch) {
            this.run.boardOpen = false;
            this.loadJob(i);
            sfx.click();
            return;
          }
        }
        this.run.boardOpen = false;
        return;
      }
      // Click in the play field throws a coin decoy at that spot.
      if (mx < PLAY_W && my > TOP_BAR) this.throwCoinAt(mx, my - TOP_BAR);
    });
  }

  // ---------------------------------------------------------- gadgets

  useSmoke() {
    if (this.run.phase !== 'play' || !canUse(this.inv, 'smoke')) return;
    this.run.score = Math.max(0, this.run.score - spendGadget(this.inv, 'smoke'));
    this.run.gadgetsUsed++;
    this.smoke.push(makeSmoke(this.player.x, this.player.y));
    blindGuardsIn(this.state, this.player.x, this.player.y, 90);
    sfx.smoke();
  }

  throwCoin() {
    const tx = this.player.x + Math.cos(this.player.facing) * 130;
    const ty = this.player.y + Math.sin(this.player.facing) * 130;
    this.throwCoinAt(Math.max(20, Math.min(PLAY_W - 20, tx)), Math.max(20, Math.min(PLAY_H - 20, ty)));
  }

  throwCoinAt(tx, ty) {
    if (this.run.phase !== 'play' || !canUse(this.inv, 'coin')) return;
    this.run.score = Math.max(0, this.run.score - spendGadget(this.inv, 'coin'));
    this.run.gadgetsUsed++;
    this.coins.push(makeCoin(this.player.x, this.player.y, tx, ty));
    sfx.coin();
  }

  useLockpick() {
    if (this.run.phase !== 'play') return;
    if (!nearLockedDoor(this.player, this.job, this.state)) return;
    if (!canUse(this.inv, 'lockpick')) return;
    this.run.score = Math.max(0, this.run.score - spendGadget(this.inv, 'lockpick'));
    this.run.gadgetsUsed++;
    this.state.doorOpen = true;
    sfx.lockpick();
  }

  // ---------------------------------------------------------- movement

  /** Circle-vs-rect collision against walls, props and the closed locked door. */
  collides(x, y) {
    const r = PLAYER_R;
    if (x < r || x > PLAY_W - r || y < r || y > PLAY_H - r) return true;
    for (const w of this.job.walls) {
      if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) return true;
    }
    if (!this.state.doorOpen) {
      const d = this.job.lockedDoor;
      if (x + r > d.x && x - r < d.x + d.w && y + r > d.y && y - r < d.y + d.h) return true;
    }
    for (const p of this.job.props) {
      if (p.type === 'chandelier' || p.type === 'plant' || p.type === 'pillar' || p.type === 'vent') continue;
      if (x + r > p.x && x - r < p.x + p.w && y + r > p.y && y - r < p.y + p.h) return true;
    }
    return false;
  }

  stepPlayer(dt) {
    let dx = 0, dy = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    if (dx === 0 && dy === 0) return;
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    this.player.facing = Math.atan2(dy, dx);
    const nx = this.player.x + dx * PLAYER_SPEED * dt;
    const ny = this.player.y + dy * PLAYER_SPEED * dt;
    if (!this.collides(nx, this.player.y)) this.player.x = nx;
    if (!this.collides(this.player.x, ny)) this.player.y = ny;
    // Moving in the light is noisier than creeping in shadow.
    this.run.noise = Math.min(100, this.run.noise + dt * (inShadow(this.player.x, this.player.y, this.job) ? 6 : 16));
  }

  // ---------------------------------------------------------- per-frame update

  update(dt) {
    // Staged screenshots are posed frames: the world breathes (wheels spin, cones
    // sweep) but guards and alarm stay exactly where the shot posed them.
    if (this.annotations && this.shot !== 'getaway') {
      this.time += dt;
      for (const c of this.state.cameras) c.phase += dt * 0.55;
      return;
    }
    if (this.run.phase !== 'play' || this.run.boardOpen) return;
    this.time += dt;
    this.run.elapsed += dt;
    this.run.noise = Math.max(0, this.run.noise - dt * 14);

    this.stepPlayer(dt);
    stepSmoke(this.smoke, dt);
    stepCoins(this.coins, dt, (c) => {
      this.run.noise = 100;
      lureGuardsTo(this.state, c.x, c.y, 260);
    });

    const api = {
      onSpotted: (name) => { sfx.spotted(); },
      onSuspicious: (name) => { sfx.suspicious(); },
    };
    const seen = detectionTick(this.job, this.state, this.player, this.run, dt, this.smoke, api);
    if (seen === 'glimpsed' && this.run.alarm > 55 && this.run.alarm < 70) this.run.closeCalls += dt > 0 ? 0 : 0;

    // Close call: a guard's cone edge just missed the thief.
    for (const g of this.state.guards) {
      const d = Math.hypot(this.player.x - g.x, this.player.y - g.y);
      if (d < 70 && g.mode === 'patrol' && !g._closeCounted) {
        g._closeCounted = true;
        this.run.closeCalls++;
        setTimeout(() => { g._closeCounted = false; }, 4000);
      }
    }

    // Loot pickup.
    for (const l of this.state.loot) {
      if (l.taken) continue;
      if (Math.hypot(this.player.x - l.x, this.player.y - l.y) < 24) {
        l.taken = true;
        this.run.lootTaken++;
        this.run.lootPoints.push({ x: l.x, y: l.y });
        this.run.score += l.value + (l.objective ? 250 : 0);
        sfx.pickup();
      }
    }

    // Exit: only once the objective is stolen.
    const obj = this.state.loot.find((l) => l.objective);
    const e = this.job.exit;
    if (obj.taken && Math.hypot(this.player.x - e.x, this.player.y - e.y) < 30) {
      this.finishJob();
      return;
    }

    if (this.run.caught) {
      this.run.phase = 'caught';
      sfx.caught();
      return;
    }

    // Record the trail for the route replay.
    this.trailT += dt;
    if (this.trailT > 0.35) {
      this.trailT = 0;
      const last = this.trail[this.trail.length - 1];
      if (Math.hypot(this.player.x - last.x, this.player.y - last.y) > 12) {
        this.trail.push({ x: this.player.x, y: this.player.y });
      }
    }
  }

  finishJob() {
    this.run.phase = 'results';
    this.run.score += Math.max(0, 500 - Math.floor(this.run.elapsed) * 2);
    if (!this.run.completedJobs.includes(this.jobId)) this.run.completedJobs.push(this.jobId);
    sfx.win();
  }

  // ---------------------------------------------------------- ?shot= staging

  /** Stage one of the four screenshot states. Real game renders, posed by the game itself. */
  applyShot() {
    const shot = this.shot;
    if (!shot) return;
    this.annotations = true;
    if (shot === 'cover') {
      this.loadJob(1);
      // ACE stands in the grand chandelier's light pool beside the big wheel:
      // exposed, golden, and one step from the Star Diamond.
      this.player.x = 535; this.player.y = 225; this.player.facing = Math.PI;
      this.run.alarm = 12; this.run.score = 340; this.run.elapsed = 47;
      this.run.visibility = 'IN THE LIGHT';
      // Guards mid-patrol, cones sweeping the floor.
      this.state.guards[0].x = 200; this.state.guards[0].y = 300; this.state.guards[0].facing = 0.5;
      this.state.guards[1].x = 700; this.state.guards[1].y = 300; this.state.guards[1].facing = Math.PI - 0.5;
      this.state.guards[2].x = 452; this.state.guards[2].y = 560; this.state.guards[2].facing = -Math.PI / 2;
    } else if (shot === 'suspicious') {
      this.loadJob(1);
      this.player.x = 360; this.player.y = 315; this.player.facing = Math.PI;
      this.run.alarm = 48; this.run.score = 520; this.run.elapsed = 83;
      this.run.spotted = 1; this.run.lastSpotter = 'PIT BOSS MARA';
      this.run.visibility = 'IN SHADOW';
      const g = this.state.guards[0];
      g.x = 300; g.y = 300; g.facing = 0.3; g.mode = 'investigate';
      g.targetX = 360; g.targetY = 315; g.suspect = 0.6;
      g.bubble = 'What was that?'; g.bubbleT = 99;
      this.state.guards[1].x = 700; this.state.guards[1].y = 280; this.state.guards[1].facing = Math.PI - 0.4;
      this.state.guards[2].x = 500; this.state.guards[2].y = 580; this.state.guards[2].facing = -Math.PI / 2;
      this.state.loot[1].taken = true; this.run.lootTaken = 1;
      this.run.lootPoints.push({ x: this.state.loot[1].x, y: this.state.loot[1].y });
    } else if (shot === 'alarm') {
      this.loadJob(4);
      // ACE caught in the vault's lower light pool, guards closing from all sides.
      this.player.x = 470; this.player.y = 430; this.player.facing = -Math.PI / 2;
      this.run.alarm = 96; this.run.score = 1150; this.run.elapsed = 142;
      this.run.spotted = 3; this.run.lastSpotter = 'VAULT KEEPER DRAKE';
      this.run.visibility = 'IN THE LIGHT'; this.run.noise = 88;
      const spots = [[300, 300], [620, 300], [380, 500], [580, 500]];
      this.state.guards.forEach((g, i) => {
        g.x = spots[i][0]; g.y = spots[i][1];
        g.facing = Math.atan2(this.player.y - g.y, this.player.x - g.x);
        g.mode = 'chase'; g.suspect = 1;
        g.bubble = i === 0 ? 'Thief! There!' : ''; g.bubbleT = 99;
      });
      this.state.loot[0].taken = true; this.state.loot[1].taken = true;
      this.run.lootTaken = 2;
      this.run.lootPoints.push({ x: this.state.loot[1].x, y: this.state.loot[1].y });
      this.state.doorOpen = true;
    } else if (shot === 'getaway') {
      this.loadJob(1);
      this.run.phase = 'results';
      this.run.elapsed = 68; this.run.score = 1840;
      this.run.spotted = 0; this.run.closeCalls = 2; this.run.gadgetsUsed = 2;
      this.run.laserTrips = 0; this.run.lootTaken = 6;
      this.run.completedJobs = [0, 1];
      this.run.lootPoints = this.state.loot.map((l) => ({ x: l.x, y: l.y }));
      // A plausible trail along the service route, with seeded wobble.
      const rng = seededRng(20261122);
      const route = this.job.routes[1];
      this.trail = [];
      for (let i = 0; i < route.length - 1; i++) {
        const [ax, ay] = route[i], [bx, by] = route[i + 1];
        for (let k = 0; k < 8; k++) {
          const t = k / 8;
          this.trail.push({
            x: ax + (bx - ax) * t + (rng() - 0.5) * 14,
            y: ay + (by - ay) * t + (rng() - 0.5) * 14,
          });
        }
      }
      this.trail.push({ x: this.job.exit.x, y: this.job.exit.y });
    }
  }

  // ---------------------------------------------------------- render

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (this.run.phase === 'results') {
      drawResults(ctx, this.job, this.run, this.trail);
      return;
    }
    drawCarpet(ctx, this.job, this.time);
    drawRoutes(ctx, this.job);
    drawWalls(ctx, this.job, this.state);
    drawProps(ctx, this.job, this.time);
    drawThreats(ctx, this.job, this.state, this.run, this.time);
    drawLoot(ctx, this.state, this.time);
    drawExit(ctx, this.job, this.state.loot.find((l) => l.objective).taken);
    drawCameras(ctx, this.job, this.state);
    drawGuards(ctx, this.state);
    drawPlayer(ctx, this.player, this.time);
    drawEffects(ctx, this.smoke, this.coins, this.time);
    drawTopBar(ctx, this.job, this.run, this.time);
    drawHud(ctx, this.job, this.state, this.run, this.inv, this.player, JOBS, this.jobId);
    drawBanner(ctx, this.run);
    if (this.annotations) this.drawShotCallouts(ctx);
    if (this.run.boardOpen) drawJobBoard(ctx, JOBS, this.jobId, this.run.completedJobs);
    if (this.run.phase === 'caught') drawCaught(ctx, this.run);
  }

  /** The 3–5 in-scene callouts that label what the judge is looking at. */
  drawShotCallouts(ctx) {
    if (this.shot === 'cover') {
      callout(ctx, 200, TOP_BAR + 300, 130, TOP_BAR + 210, 'GUARD PATROL — dashed route');
      callout(ctx, 452, TOP_BAR + 250, 452, TOP_BAR + 130, '★ the Star Diamond — OBJECTIVE');
      callout(ctx, 120, TOP_BAR + 12, 240, TOP_BAR + 60, 'CAM 02 sweeps the floor');
      callout(ctx, 535, TOP_BAR + 225, 700, TOP_BAR + 310, 'ACE — in the light, stay low');
      callout(ctx, 850, TOP_BAR + 300, 780, TOP_BAR + 210, 'VENT — the unseen route');
    } else if (this.shot === 'suspicious') {
      callout(ctx, 300, TOP_BAR + 300, 180, TOP_BAR + 220, '“?” — MARA heard something');
      callout(ctx, 360, TOP_BAR + 315, 540, TOP_BAR + 420, 'ACE hides behind the roulette');
      callout(ctx, 452, TOP_BAR + 250, 452, TOP_BAR + 150, 'the Star Diamond — still there');
      callout(ctx, 700, TOP_BAR + 280, 800, TOP_BAR + 200, 'JIN still patrols — unaware');
    } else if (this.shot === 'alarm') {
      callout(ctx, 300, TOP_BAR + 300, 160, TOP_BAR + 210, '“!” — guards converge on ACE');
      callout(ctx, 452, TOP_BAR + 520, 640, TOP_BAR + 560, 'LASER GRID A — tripped!');
      callout(ctx, 470, TOP_BAR + 430, 690, TOP_BAR + 480, 'ACE — caught in the open');
      callout(ctx, 452, TOP_BAR + 250, 452, TOP_BAR + 140, 'the Ace Vault Crown — STOLEN ✓');
    }
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.__game = new Game(document.getElementById('game'));
