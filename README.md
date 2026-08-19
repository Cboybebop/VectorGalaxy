# VectorGalaxy - Balatro Roguelike Arcade Shooter

VectorGalaxy is a neon arcade space shooter built with HTML5 Canvas, featuring Balatro-inspired roguelike mechanics, full-width responsive displays, multi-input controller support, 3 difficulty levels, and persistent unlocks.

## Features & Mechanics

### 1. Full-Width Responsive Screen Resolution
- **Adaptive Canvas Engine**: Dynamic resolution scaling supports mobile phones, tablets, 1080p desktop screens, and ultrawide displays with high DPI (`devicePixelRatio`) crisp rendering.
- **Virtual Coordinate Mapping**: Entity physics and rendering scale fluidly without blurring or stretching.

### 2. Title Screen & Game Over Screens
- **Title Screen**: Choose your difficulty mode, view controls, inspect high score records, and launch your run.
- **Game Over Screen**: Detailed breakdown of Ante reached, total score, enemies destroyed, bosses eliminated, total cash earned, difficulty badge, and unlock achievements.

### 3. Multi-Input Control System
- **Controller / Gamepad**: Plug-and-play USB & wireless gamepads (Xbox, PlayStation, etc.). Left Stick / D-Pad X axis controls player movement; `A` / `Cross` / `RT` / `RB` triggers weapon firing; automatic HUD gamepad indicator.
- **Keyboard**: WASD or Left/Right Arrow keys for movement; `Space`, `Z`, or `Enter` to fire; `Escape` / `P` to pause.
- **Mouse**: Direct pointer tracking across the full canvas width; left click or hold to fire.
- **Touchscreen**: Smooth touch drag on mobile displays and tap to fire.

### 4. Three Game Difficulty Levels
- **Easy**: 4 Lives, 0.75x Score multiplier, relaxed dive attacks, +$10 starter cash.
- **Normal**: 3 Lives, 1.0x Score multiplier, standard sector dive pressure.
- **Hard**: 2 Lives, 1.5x Score multiplier, aggressive dive attack frequency and boss behavior (original balance baseline).
- High scores tracked independently per difficulty setting in local storage and global Vercel KV leaderboards.

### 5. Balatro-Inspired Roguelike Progression
- **Antes & Blinds**: Each sector (Ante) consists of 3 rounds:
  1. **Small Blind**: Sector formation warmup.
  2. **Big Blind**: Heavier enemy waves and dive frequency.
  3. **Boss Blind**: Multi-phase command ship with a randomized **Boss Modifier**.
- **Boss Modifiers**:
  - *The Wall*: +100% Boss HP
  - *The Needle*: 1 Life restriction for the boss fight
  - *The Eye*: Manual firing only (Autofire disabled)
  - *The Arm*: Weapon fire rate reduced by 30%
  - *The Serpent*: Double enemy dive frequency
  - *The Pillar*: Enemies spawn with extra energy shield
  - *The Flint*: Piercing and multi-shot passives disabled during boss
- **Shop & Passive Modifiers ("Jokers")**:
  - Earn cash ($) after each blind based on payout, remaining lives, and interest.
  - Equip up to 5 Passive Jokers (e.g. *Neon Catalyst*, *Overcharge Reactor*, *Ricochet Core*, *Bounty Hunter*, *Glass Cannon*, *Siphon Module*, *Shield Matrix*).
  - Purchase single-round consumables (Hull Repairs, Shield Charges, Double Stake score multipliers).
- **Persistent Unlocks**:
  - Earn new title badges and shop pool items by clearing Ante milestones, achieving high combos, or conquering Hard mode.

## Vercel-Optimized Setup

- Root entry point is `index.html` for reliable static hosting.
- Serverless leaderboard API at `api/highscores.js`.
- Optional Vercel KV-backed global high scores.
- Open Graph and Twitter tags included for social previews.
- SVG favicon and OG image at `/favicon.svg` and `/og-image.svg`.

## Deploy on Vercel

1. Import this repository into Vercel.
2. Deploy once so the project is created.

## Create the High Score Database (Vercel KV)

1. In Vercel, open your project dashboard.
2. Go to **Storage** → **Create Database**.
3. Choose **KV** (not Blob / Postgres), pick a name (for example `vector-galaxy-kv`), then create it.
4. Connect the database to your Vercel project environment.
5. Confirm environment variables: `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `vercil_KV_REST_API_URL` fallback).

If KV is not configured, local high scores persist in `localStorage`.

## Local Run

Open `index.html` directly in any web browser, or launch a static server.

