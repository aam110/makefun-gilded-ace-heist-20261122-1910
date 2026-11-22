# ♠ GILDED ACE — A Casino Heist

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/aam110/makefun-gilded-ace-heist-20261122-1910/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/aam110/makefun-gilded-ace-heist-20261122-1910/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

**5 casino heists, 16 guards, 30 treasures.** You are ACE, a card-sharp in a teal
suit, working the Gilded Ace casino at midnight — past pit bosses, sweeping
cameras and laser grids, to the vault crown and out again.

## The campaign

| Job | Room | Target |
|-----|------|--------|
| 1 | THE LOBBY | the Gilded Ace Chip |
| 2 | THE ROULETTE FLOOR | the Star Diamond |
| 3 | THE HIGH-ROLLER SUITE | the Crimson Tiara |
| 4 | THE COUNTING ROOM | the Counting Key |
| 5 | THE VAULT | the Ace Vault Crown |

Every job has three routes in — the **MAIN FLOOR**, the **SERVICE CORRIDOR** and
the **VENT SHAFT** — drawn on the floor plan in the side HUD.

## Detection is a system, not a switch

- **Vision cones** with real line-of-sight: walls and locked doors block them.
- **Alarm meter 0–100**: CALM → SUSPICIOUS → ALARM. Guards investigate noises,
  chase a spotted thief, and call it in on camera.
- **Visibility**: IN SHADOW vs IN THE LIGHT — chandelier pools are beautiful and
  dangerous. **Noise meter**: running loud draws attention.
- **Cameras** sweep the floor, **laser grids** guard the vault, and every guard
  has a name, a patrol route and a voice ("What was that?", "Thief! There!").

## Gadgets — every tool costs points

- **SMOKE BOMB ×3** (50 pts) — blinds every cone for 6 seconds.
- **LOCKPICK ×2** (75 pts) — opens a locked door silently.
- **COIN DECOY ×4** (25 pts) — throw it (or click) to lure a guard to the noise.

## The getaway

Escape with the objective and the results screen replays your route through the
casino, scores your take, and awards three medals — **Never Spotted**,
**Every Valuable**, **Under 75 Seconds** — plus a rating. Spotless runs earn
**GHOST**: *"Nobody will ever know you were there."*

## How to play

WASD / arrows move · C throw a coin · X smoke bomb · E lockpick a door ·
J job board · 1–5 switch job · R restart job · M mute.

## Tech

Static HTML5 + Canvas 2D, zero network: all art is procedural, all sound is
WebAudio oscillators. Deterministic seeded RNG. Source is split by job:

- `game/src/world.js` — the five jobs: rooms, guards, loot, routes
- `game/src/guards.js` — patrols, vision cones, cameras, lasers, detection
- `game/src/gadgets.js` — smoke, lockpick, coin decoy, the sound synth
- `game/src/render.js` — the casino floor, HUD, banners, getaway screen
- `game/src/main.js` — game loop, input, win/lose, screenshot staging

## Entry

Built for the [best heist game bounty](https://make.fun/bounty/best-heist-game-20261122-0559)
on make.fun. License: MIT (see `LICENSE`).
