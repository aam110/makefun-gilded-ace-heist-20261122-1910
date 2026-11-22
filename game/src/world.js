// world.js — GILDED ACE casino: the five heist jobs, their rooms, guards, loot and routes.
// Every job is data: walls, props, patrols, cameras, lasers, treasures and three named routes.
// No code from any other build is reused here; this casino was laid out fresh for this entry.

export const PLAY_W = 904; // play-field width (the HUD panel takes the rest of the 1280 canvas)
export const PLAY_H = 674; // play-field height (below the 46px top bar)
export const TOP_BAR = 46;

/** Deterministic seeded RNG (mulberry32) so staged frames and replays never vary. */
export function seededRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The sixteen named guards of the Gilded Ace, in job order. */
export const GUARD_NAMES = [
  'FLOOR BOSS RIKO', 'DEALER VEX',
  'PIT BOSS MARA', 'CROUPIER JIN', 'SECURITY ONA',
  'HOST ELENA', 'Bouncer KATO', 'DEALER SABLE',
  'CAGE CHIEF IVAN', 'AUDITOR NIA', 'GUARD PETROV', 'GUARD LUMEN',
  'VAULT KEEPER DRAKE', 'SENTRY YARA', 'SENTRY COLE', 'THE HOUSE EYE',
];

/** The thirty named treasures, six per job. Index 0 of each job is that job's objective. */
export const LOOT_NAMES = [
  ['the Gilded Ace Chip', 'Gold Chip Stack', 'Ruby Cufflinks', 'Emerald Deck', 'Platinum Watch', 'Velvet Chip Purse'],
  ['the Star Diamond', 'Sapphire Roulette Ball', 'Gold Chip Tower', 'Ivory Dice Pair', 'Jade Card Case', 'Silver Cigar Box'],
  ['the Crimson Tiara', 'Diamond Poker Chip', 'Pearl Necklace', 'Gold Baccarat Shoe', 'Onyx Cufflinks', 'Champagne Voucher'],
  ['the Counting Key', 'Cash Brick Bundle', 'Gold Bar 12oz', 'Vault Ledger', 'Platinum Coin Roll', 'Security Master Key'],
  ['the Ace Vault Crown', 'Diamond Vault Seal', 'Gold Ingot Stack', 'Emerald Vault Gem', 'The House Deed', 'Midnight Safe Key'],
];

/** Gadget catalogue: name, key, count, point cost, and what it does. */
export const GADGETS = [
  { id: 'smoke', name: 'SMOKE BOMB', key: 'X', count: 3, cost: 50, desc: 'Blinds every vision cone for 6s' },
  { id: 'lockpick', name: 'LOCKPICK', key: 'E', count: 2, cost: 75, desc: 'Opens a locked door silently' },
  { id: 'coin', name: 'COIN DECOY', key: 'C', count: 4, cost: 25, desc: 'Thrown coin lures a guard to the noise' },
];

/** Route flavour: three ways through every job. */
export const ROUTE_DEFS = [
  { id: 'main', name: 'MAIN FLOOR', color: '#ffd76a', desc: 'Straight through the crowd — fast, exposed' },
  { id: 'service', name: 'SERVICE CORRIDOR', color: '#7fe3c8', desc: 'Staff halls behind the tables — quiet, long' },
  { id: 'vent', name: 'VENT SHAFT', color: '#ff8a7a', desc: 'Overhead vents — unseen, one way only' },
];

function wall(x, y, w, h) { return { x, y, w, h }; }
function prop(type, x, y, w, h, label) { return { type, x, y, w, h, label: label || '' }; }
function lootAt(job, i, x, y) {
  return { x, y, name: LOOT_NAMES[job][i], objective: i === 0, taken: false, value: 100 + i * 40 + job * 25 };
}
function guardAt(name, waypoints, speed) {
  return { name, waypoints, speed: speed || 46, wait: 1.4 };
}
function cameraAt(x, y, baseAngle, sweep, range, name) {
  return { x, y, baseAngle, sweep, range: range || 200, name };
}
function laserAt(x1, y1, x2, y2, name) { return { x1, y1, x2, y2, name }; }
function routePoly(points) { return points; }

/**
 * The five jobs. Coordinates live in the 904x674 play field.
 * Each job: name, room, flavour line, walls, props, guards, cameras, lasers,
 * loot (6), one locked door, spawn, exit, and three route polylines.
 */
export const JOBS = [
  {
    id: 0, name: 'JOB 1 — THE LOBBY', room: 'THE LOBBY', tagline: 'Walk in like you own the place. Leave with the chip.',
    walls: [wall(300, 0, 18, 180), wall(300, 300, 18, 200), wall(600, 140, 18, 260), wall(0, 470, 220, 18), wall(430, 470, 474, 18)],
    props: [
      prop('chandelier', 150, 110, 90, 90, 'Chandelier'), prop('chandelier', 750, 120, 90, 90, 'Chandelier'),
      prop('roulette', 120, 260, 130, 90, 'Roulette'), prop('slot', 660, 40, 60, 80, 'Slots'),
      prop('slot', 730, 40, 60, 80, 'Slots'), prop('plant', 40, 520, 44, 54, 'Palm'),
      prop('plant', 830, 520, 44, 54, 'Palm'), prop('bar', 430, 60, 150, 60, 'Champagne Bar'),
      prop('rope', 340, 520, 120, 26, 'Velvet Rope'), prop('table', 660, 300, 120, 80, 'Card Table'),
      prop('pillar', 330, 540, 26, 26, ''), prop('pillar', 560, 540, 26, 26, ''),
    ],
    guards: [
      guardAt(GUARD_NAMES[0], [[180, 200], [180, 420], [430, 420], [430, 200]], 44),
      guardAt(GUARD_NAMES[1], [[700, 200], [700, 420], [520, 420], [520, 200]], 48),
    ],
    cameras: [cameraAt(452, 12, Math.PI / 2, 0.9, 210, 'CAM 01 — LOBBY')],
    lasers: [],
    loot: [lootAt(0, 0, 505, 105), lootAt(0, 1, 185, 305), lootAt(0, 2, 690, 340), lootAt(0, 3, 80, 620), lootAt(0, 4, 770, 600), lootAt(0, 5, 360, 610)],
    lockedDoor: { x: 600, y: 400, w: 18, h: 70, name: 'SERVICE DOOR', open: false },
    spawn: { x: 60, y: 620 }, exit: { x: 850, y: 620, name: 'LOBBY EXIT' },
    routes: [
      routePoly([[60, 620], [250, 620], [452, 500], [452, 300], [505, 150], [700, 200], [850, 620]]),
      routePoly([[60, 620], [60, 500], [260, 500], [340, 420], [340, 240], [505, 150], [560, 420], [850, 620]]),
      routePoly([[60, 620], [120, 560], [120, 120], [300, 120], [505, 150], [700, 120], [850, 620]]),
    ],
  },
  {
    id: 1, name: 'JOB 2 — THE ROULETTE FLOOR', room: 'THE ROULETTE FLOOR', tagline: 'The Star Diamond sits under the big wheel. The floor never sleeps.',
    walls: [wall(240, 0, 18, 150), wall(240, 300, 18, 220), wall(640, 120, 18, 240), wall(640, 470, 18, 204), wall(0, 540, 180, 18), wall(420, 540, 484, 18)],
    props: [
      prop('chandelier', 452, 90, 120, 120, 'Grand Chandelier'), prop('chandelier', 130, 400, 90, 90, 'Chandelier'),
      prop('chandelier', 770, 400, 90, 90, 'Chandelier'),
      prop('roulette', 380, 200, 150, 100, 'Grand Roulette'), prop('roulette', 90, 200, 130, 90, 'Roulette'),
      prop('roulette', 690, 200, 130, 90, 'Roulette'),
      prop('slot', 40, 40, 60, 80, 'Slots'), prop('slot', 110, 40, 60, 80, 'Slots'),
      prop('slot', 800, 40, 60, 80, 'Slots'), prop('slot', 730, 40, 60, 80, 'Slots'),
      prop('table', 90, 430, 120, 80, 'Blackjack'), prop('table', 700, 430, 120, 80, 'Baccarat'),
      prop('bar', 380, 580, 150, 60, 'Roulette Bar'), prop('plant', 450, 330, 44, 54, 'Palm'),
      prop('rope', 560, 330, 120, 26, 'Velvet Rope'), prop('pillar', 270, 560, 26, 26, ''),
      prop('pillar', 610, 560, 26, 26, ''), prop('vent', 850, 300, 40, 30, 'Vent'),
    ],
    guards: [
      guardAt(GUARD_NAMES[2], [[180, 160], [180, 470], [360, 470], [360, 160]], 46),
      guardAt(GUARD_NAMES[3], [[560, 160], [560, 470], [760, 470], [760, 160]], 50),
      guardAt(GUARD_NAMES[4], [[452, 380], [452, 620], [300, 620], [600, 620]], 42),
    ],
    cameras: [
      cameraAt(120, 12, Math.PI / 2, 1.0, 210, 'CAM 02 — WHEEL'),
      cameraAt(784, 12, Math.PI / 2, 1.0, 210, 'CAM 03 — PITS'),
    ],
    lasers: [],
    loot: [lootAt(1, 0, 452, 250), lootAt(1, 1, 155, 245), lootAt(1, 2, 755, 245), lootAt(1, 3, 150, 470), lootAt(1, 4, 760, 470), lootAt(1, 5, 452, 610)],
    lockedDoor: { x: 640, y: 360, w: 18, h: 110, name: 'PIT DOOR', open: false },
    spawn: { x: 60, y: 620 }, exit: { x: 850, y: 620, name: 'FLOOR EXIT' },
    routes: [
      routePoly([[60, 620], [300, 620], [452, 560], [452, 380], [452, 250], [700, 200], [850, 620]]),
      routePoly([[60, 620], [60, 500], [200, 500], [200, 200], [380, 200], [452, 250], [600, 420], [850, 620]]),
      routePoly([[60, 620], [120, 560], [120, 120], [300, 120], [452, 250], [700, 120], [850, 620]]),
    ],
  },
  {
    id: 2, name: 'JOB 3 — THE HIGH-ROLLER SUITE', room: 'THE HIGH-ROLLER SUITE', tagline: 'Private tables, private guards, one very public tiara.',
    walls: [wall(300, 0, 18, 200), wall(300, 330, 18, 180), wall(580, 0, 18, 140), wall(580, 260, 18, 240), wall(0, 500, 240, 18), wall(470, 500, 434, 18)],
    props: [
      prop('chandelier', 452, 100, 110, 110, 'Crystal Chandelier'), prop('chandelier', 150, 420, 90, 90, 'Chandelier'),
      prop('chandelier', 760, 420, 90, 90, 'Chandelier'),
      prop('table', 380, 200, 150, 100, 'Private Baccarat'), prop('table', 90, 200, 130, 90, 'Poker'),
      prop('table', 690, 200, 130, 90, 'Poker'),
      prop('bar', 380, 580, 150, 60, 'Suite Bar'), prop('plant', 40, 60, 44, 54, 'Palm'),
      prop('plant', 820, 60, 44, 54, 'Palm'), prop('plant', 450, 350, 44, 54, 'Palm'),
      prop('slot', 40, 560, 60, 80, 'Slots'), prop('slot', 800, 560, 60, 80, 'Slots'),
      prop('rope', 340, 350, 120, 26, 'Velvet Rope'), prop('rope', 560, 560, 120, 26, 'Velvet Rope'),
      prop('pillar', 330, 540, 26, 26, ''), prop('pillar', 560, 540, 26, 26, ''),
      prop('vent', 850, 300, 40, 30, 'Vent'),
    ],
    guards: [
      guardAt(GUARD_NAMES[5], [[150, 160], [150, 440], [260, 440], [260, 160]], 44),
      guardAt(GUARD_NAMES[6], [[640, 160], [640, 440], [760, 440], [760, 160]], 52),
      guardAt(GUARD_NAMES[7], [[452, 320], [452, 470], [340, 470], [560, 470]], 46),
    ],
    cameras: [
      cameraAt(452, 12, Math.PI / 2, 1.1, 220, 'CAM 04 — SUITE'),
      cameraAt(880, 300, Math.PI, 0.8, 200, 'CAM 05 — HALL'),
    ],
    lasers: [],
    loot: [lootAt(2, 0, 452, 250), lootAt(2, 1, 155, 245), lootAt(2, 2, 755, 245), lootAt(2, 3, 120, 600), lootAt(2, 4, 790, 600), lootAt(2, 5, 452, 610)],
    lockedDoor: { x: 580, y: 140, w: 18, h: 120, name: 'SUITE DOOR', open: false },
    spawn: { x: 60, y: 620 }, exit: { x: 850, y: 620, name: 'SUITE EXIT' },
    routes: [
      routePoly([[60, 620], [300, 620], [452, 560], [452, 380], [452, 250], [700, 200], [850, 620]]),
      routePoly([[60, 620], [60, 500], [260, 500], [260, 240], [380, 240], [452, 250], [600, 420], [850, 620]]),
      routePoly([[60, 620], [120, 560], [120, 120], [300, 120], [452, 250], [700, 120], [850, 620]]),
    ],
  },
  {
    id: 3, name: 'JOB 4 — THE COUNTING ROOM', room: 'THE COUNTING ROOM', tagline: 'Where the house counts its winnings. Count yours faster.',
    walls: [wall(220, 0, 18, 180), wall(220, 320, 18, 200), wall(460, 120, 18, 240), wall(700, 0, 18, 160), wall(700, 300, 18, 200), wall(0, 540, 200, 18), wall(420, 540, 484, 18)],
    props: [
      prop('chandelier', 340, 100, 100, 100, 'Chandelier'), prop('chandelier', 580, 100, 100, 100, 'Chandelier'),
      prop('chandelier', 452, 420, 100, 100, 'Chandelier'),
      prop('safe', 90, 200, 90, 90, 'Counting Safe'), prop('safe', 730, 200, 90, 90, 'Counting Safe'),
      prop('table', 340, 230, 130, 90, 'Counting Table'), prop('table', 500, 230, 130, 90, 'Counting Table'),
      prop('slot', 40, 40, 60, 80, 'Slots'), prop('slot', 800, 560, 60, 80, 'Slots'),
      prop('bar', 380, 580, 150, 60, 'Staff Bar'), prop('plant', 450, 350, 44, 54, 'Palm'),
      prop('rope', 560, 350, 120, 26, 'Velvet Rope'), prop('pillar', 250, 560, 26, 26, ''),
      prop('pillar', 630, 560, 26, 26, ''), prop('vent', 850, 300, 40, 30, 'Vent'),
      prop('table', 90, 430, 120, 80, 'Ledger Desk'), prop('table', 700, 430, 120, 80, 'Ledger Desk'),
    ],
    guards: [
      guardAt(GUARD_NAMES[8], [[120, 160], [120, 460], [200, 460], [200, 160]], 46),
      guardAt(GUARD_NAMES[9], [[340, 160], [340, 460], [440, 460], [440, 160]], 48),
      guardAt(GUARD_NAMES[10], [[560, 160], [560, 460], [660, 460], [660, 160]], 50),
      guardAt(GUARD_NAMES[11], [[760, 160], [760, 460], [820, 460], [820, 160]], 44),
    ],
    cameras: [
      cameraAt(340, 12, Math.PI / 2, 1.0, 210, 'CAM 06 — CAGES'),
      cameraAt(660, 12, Math.PI / 2, 1.0, 210, 'CAM 07 — VAULT HALL'),
    ],
    lasers: [],
    loot: [lootAt(3, 0, 452, 275), lootAt(3, 1, 135, 245), lootAt(3, 2, 775, 245), lootAt(3, 3, 150, 470), lootAt(3, 4, 760, 470), lootAt(3, 5, 452, 610)],
    lockedDoor: { x: 460, y: 360, w: 18, h: 110, name: 'CAGE DOOR', open: false },
    spawn: { x: 60, y: 620 }, exit: { x: 850, y: 620, name: 'CAGE EXIT' },
    routes: [
      routePoly([[60, 620], [300, 620], [452, 560], [452, 400], [452, 275], [700, 200], [850, 620]]),
      routePoly([[60, 620], [60, 500], [180, 500], [180, 200], [340, 200], [452, 275], [600, 420], [850, 620]]),
      routePoly([[60, 620], [120, 560], [120, 120], [300, 120], [452, 275], [700, 120], [850, 620]]),
    ],
  },
  {
    id: 4, name: 'JOB 5 — THE VAULT', room: 'THE VAULT', tagline: 'Laser grids, four sentries, one crown. The house always wins — except tonight.',
    walls: [wall(220, 0, 18, 180), wall(220, 320, 18, 200), wall(460, 0, 18, 120), wall(460, 240, 18, 240), wall(700, 0, 18, 180), wall(700, 320, 18, 200), wall(0, 540, 200, 18), wall(420, 540, 484, 18)],
    props: [
      prop('chandelier', 340, 100, 100, 100, 'Chandelier'), prop('chandelier', 580, 100, 100, 100, 'Chandelier'),
      prop('chandelier', 452, 420, 100, 100, 'Chandelier'),
      prop('safe', 340, 200, 110, 100, 'VAULT DOOR'), prop('safe', 460, 200, 110, 100, 'VAULT DOOR'),
      prop('table', 90, 200, 130, 90, 'Gold Table'), prop('table', 690, 200, 130, 90, 'Gold Table'),
      prop('table', 90, 430, 120, 80, 'Ledger Desk'), prop('table', 700, 430, 120, 80, 'Ledger Desk'),
      prop('slot', 40, 40, 60, 80, 'Slots'), prop('slot', 800, 40, 60, 80, 'Slots'),
      prop('plant', 450, 350, 44, 54, 'Palm'), prop('rope', 560, 350, 120, 26, 'Velvet Rope'),
      prop('pillar', 250, 560, 26, 26, ''), prop('pillar', 630, 560, 26, 26, ''),
      prop('vent', 850, 300, 40, 30, 'Vent'), prop('bar', 380, 580, 150, 60, 'Vault Bar'),
    ],
    guards: [
      guardAt(GUARD_NAMES[12], [[120, 160], [120, 460], [200, 460], [200, 160]], 48),
      guardAt(GUARD_NAMES[13], [[340, 160], [340, 460], [440, 460], [440, 160]], 50),
      guardAt(GUARD_NAMES[14], [[560, 160], [560, 460], [660, 460], [660, 160]], 52),
      guardAt(GUARD_NAMES[15], [[760, 160], [760, 460], [820, 460], [820, 160]], 46),
    ],
    cameras: [
      cameraAt(120, 12, Math.PI / 2, 1.0, 210, 'CAM 08 — VAULT W'),
      cameraAt(452, 12, Math.PI / 2, 1.1, 220, 'CAM 09 — VAULT C'),
      cameraAt(784, 12, Math.PI / 2, 1.0, 210, 'CAM 10 — VAULT E'),
    ],
    lasers: [
      laserAt(238, 520, 686, 520, 'LASER GRID A'),
      laserAt(452, 140, 452, 480, 'LASER GRID B'),
    ],
    loot: [lootAt(4, 0, 452, 250), lootAt(4, 1, 155, 245), lootAt(4, 2, 755, 245), lootAt(4, 3, 150, 470), lootAt(4, 4, 760, 470), lootAt(4, 5, 452, 610)],
    lockedDoor: { x: 460, y: 120, w: 18, h: 120, name: 'VAULT DOOR', open: false },
    spawn: { x: 60, y: 620 }, exit: { x: 850, y: 620, name: 'VAULT EXIT' },
    routes: [
      routePoly([[60, 620], [300, 620], [452, 560], [452, 400], [452, 250], [700, 200], [850, 620]]),
      routePoly([[60, 620], [60, 500], [180, 500], [180, 200], [340, 200], [452, 250], [600, 420], [850, 620]]),
      routePoly([[60, 620], [120, 560], [120, 120], [300, 120], [452, 250], [700, 120], [850, 620]]),
    ],
  },
];

/** Total scope counters, used by the HUD and the title. */
export const SCOPE = {
  jobs: JOBS.length,
  guards: JOBS.reduce((n, j) => n + j.guards.length, 0),
  treasures: JOBS.reduce((n, j) => n + j.loot.length, 0),
  gadgets: GADGETS.length,
};

/** Deep-clone one job's mutable runtime state (loot taken flags, door, guard instances). */
export function freshJobState(job) {
  return {
    loot: job.loot.map((l) => ({ ...l })),
    doorOpen: false,
    guards: job.guards.map((g) => ({
      name: g.name,
      waypoints: g.waypoints.map((p) => [...p]),
      speed: g.speed,
      x: g.waypoints[0][0],
      y: g.waypoints[0][1],
      wp: 1,
      wait: 0,
      facing: Math.atan2(g.waypoints[1][1] - g.waypoints[0][1], g.waypoints[1][0] - g.waypoints[0][0]),
      mode: 'patrol', // patrol | suspicious | investigate | chase | blinded
      suspect: 0, // 0..1 suspicion for this guard
      targetX: 0, targetY: 0,
      bubble: '', bubbleT: 0,
    })),
    cameras: job.cameras.map((c) => ({ ...c, phase: 0 })),
  };
}
