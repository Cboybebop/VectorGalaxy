// Vector Galaxy - Balatro Roguelike Arcade Shooter Engine

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

// UI Elements
const titleScreen = $('titleScreen');
const gameView = $('gameView');
const scoreEl = $('score');
const anteInfoEl = $('anteInfo');
const blindNameEl = $('blindName');
const livesEl = $('lives');
const cashEl = $('cash');
const bestScoreEl = $('bestScore');
const diffBadge = $('diffBadge');
const gamepadBadge = $('gamepadBadge');
const passivesBar = $('passivesBar');
const bossBanner = $('bossBanner');
const comboFill = $('comboFill');
const comboLabel = $('comboLabel');
const controlStatusHint = $('controlStatusHint');
const shopOverlay = $('shopOverlay');
const shopGrid = $('shopGrid');
const shopCash = $('shopCash');
const shopSubtext = $('shopSubtext');
const overlay = $('overlay');
const runSummary = $('runSummary');
const unlockBanner = $('unlockBanner');

// Logical Virtual Resolution
const VIRTUAL_WIDTH = 800;
const VIRTUAL_HEIGHT = 1000;
let scaleFactorX = 1;
let scaleFactorY = 1;

// RESPONSIVE RESOLUTION HANDLING
function resizeCanvas() {
  const container = $('gameWrap');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // Scale virtual coordinates (800x1000) to fill container full width & height
  scaleFactorX = rect.width / VIRTUAL_WIDTH;
  scaleFactorY = rect.height / VIRTUAL_HEIGHT;

  ctx.imageSmoothingEnabled = true;
}

window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 50);

const ENEMY_TYPES = {
  scout: { color: '#62ffb3', hp: 1, value: 70, fireRate: 0.0012, speed: 1.2 },
  gunner: { color: '#66d9ff', hp: 1, value: 100, fireRate: 0.0035, speed: 0.9 },
  tank: { color: '#a682ff', hp: 3, value: 220, fireRate: 0.0015, speed: 0.7 },
  support: { color: '#ffcf66', hp: 2, value: 180, fireRate: 0.0008, speed: 0.8 }
};

const FORMATIONS = ['grid', 'vee', 'columns', 'diamond'];

// DIFFICULTY CONFIGURATIONS
const DIFFICULTIES = {
  easy: { name: 'Easy', lives: 4, scoreMult: 0.75, diveSpeedMult: 0.7, enemyFireMult: 0.35, diveDelay: 3.5, startCash: 10, badgeClass: 'badge-easy' },
  normal: { name: 'Normal', lives: 3, scoreMult: 1.0, diveSpeedMult: 0.9, enemyFireMult: 0.65, diveDelay: 2.5, startCash: 0, badgeClass: 'badge-normal' },
  hard: { name: 'Hard', lives: 2, scoreMult: 1.5, diveSpeedMult: 1.2, enemyFireMult: 1.0, diveDelay: 1.8, startCash: 0, badgeClass: 'badge-hard' }
};

// BALATRO BOSS MODIFIERS
const BOSS_MODIFIERS = [
  { id: 'the_wall', name: 'The Wall', text: '+100% Boss Health' },
  { id: 'the_needle', name: 'The Needle', text: 'Single Life restriction for boss round' },
  { id: 'the_eye', name: 'The Eye', text: 'Autofire disabled during boss fight' },
  { id: 'the_arm', name: 'The Arm', text: 'Weapon fire rate reduced by 30%' },
  { id: 'the_serpent', name: 'The Serpent', text: 'Double enemy dive attacks' },
  { id: 'the_pillar', name: 'The Pillar', text: 'Formation enemies gain +1 shield' },
  { id: 'the_flint', name: 'The Flint', text: 'Piercing & multi-shot passives disabled' }
];

// PASSIVE JOKERS / MODIFIERS
const PASSIVE_JOKERS = [
  { id: 'neon_catalyst', name: 'Neon Catalyst', text: 'Combo multiplier score boost +50%', cost: 7, apply: p => p.comboBoost = (p.comboBoost || 1) + 0.5 },
  { id: 'overcharge', name: 'Overcharge Reactor', text: '+20% Speed & +1 Damage', cost: 8, apply: p => { p.speedMult *= 1.2; p.damage += 1; } },
  { id: 'shield_matrix', name: 'Shield Matrix', text: '+1 Shield regenerated per round', cost: 6, apply: p => p.regenShield += 1 },
  { id: 'bounty_hunter', name: 'Bounty Hunter', text: '+$5 Bonus cash per defeated Boss', cost: 5, apply: p => p.bountyCash = (p.bountyCash || 0) + 5 },
  { id: 'ricochet_core', name: 'Ricochet Core', text: 'Shots bounce off side screen walls', cost: 7, apply: p => p.ricochet = true },
  { id: 'siphon_module', name: 'Siphon Module', text: 'Restore 1 life upon clearing a boss blind', cost: 9, apply: p => p.siphon = true },
  { id: 'glass_cannon', name: 'Glass Cannon', text: '2x Damage, but hits deal 2 damage', cost: 6, apply: p => { p.damage *= 2; p.doubleSelfDamage = true; } },
  { id: 'twin_pulse', name: 'Twin Pulse', text: 'Fire dual parallel shots', cost: 7, apply: p => p.twin = true },
  { id: 'piercing_core', name: 'Piercing Core', text: 'Shots pierce 1 extra enemy', cost: 6, apply: p => p.pierce += 1 },
  { id: 'rapid_reactor', name: 'Rapid Reactor', text: '+35% Firing speed', cost: 7, apply: p => p.fireDelay *= 0.65 }
];

// CONSUMABLE REPAIRS / SINGLE-ROUND ITEMS
const SHOP_ITEMS = [
  { id: 'repair_kit', name: 'Hull Repair Kit', text: '+1 Life', cost: 6, type: 'repair', buy: () => { lives++; syncHud(); } },
  { id: 'shield_charge', name: 'Phase Shield Charge', text: '+1 Shield for next round', cost: 4, type: 'shield', buy: () => { playerStats.shields++; syncHud(); } },
  { id: 'double_stake', name: 'Double Stake', text: '2x Score multiplier for next round', cost: 5, type: 'stake', buy: () => { playerStats.tempDoubleScore = true; } }
];

// STATE VARIABLES
let currentDifficulty = 'normal';
let gameState = 'TITLE'; // TITLE, PLAYING, SHOP, GAMEOVER, PAUSED
let score = 0, lives = 3, cash = 0, ante = 1, round = 1, combo = 0, comboTime = 0, autoFire = true;
let keys = new Set();
let stars = [], bullets = [], enemyBullets = [], enemies = [], particles = [], player = null, boss = null;
let formationOffset = 0, formationDirection = 1, diveClock = 1.5, lastShot = 0, lastTime = 0, pointerHeld = false;
let bestScore = Number(localStorage.getItem(`vector-galaxy-best-${currentDifficulty}`) || 0);
let activeBossModifier = null;
let equippedPassives = [];
let unlocks = JSON.parse(localStorage.getItem('vector-galaxy-unlocks') || '[]');

let playerStats = {
  damage: 1,
  fireDelay: 180,
  speedMult: 1.0,
  twin: false,
  pierce: 0,
  shields: 0,
  regenShield: 0,
  comboBoost: 1.0,
  bountyCash: 0,
  ricochet: false,
  siphon: false,
  doubleSelfDamage: false,
  tempDoubleScore: false
};

let runStats = {
  kills: 0,
  maxCombo: 0,
  bossesDefeated: 0,
  totalCashEarned: 0,
  blindsCleared: 0
};



// UNLOCK MANAGEMENT
function checkUnlocks() {
  const newUnlocks = [];
  if (ante >= 2 && !unlocks.includes('Sector Pilot')) {
    unlocks.push('Sector Pilot');
    newUnlocks.push('Sector Pilot (Cleared Ante 1!)');
  }
  if (runStats.maxCombo >= 15 && !unlocks.includes('Combo Master')) {
    unlocks.push('Combo Master');
    newUnlocks.push('Combo Master (15x Combo achieved!)');
  }
  if (currentDifficulty === 'hard' && ante >= 2 && !unlocks.includes('Hardcore Ace')) {
    unlocks.push('Hardcore Ace');
    newUnlocks.push('Hardcore Ace (Cleared Ante 1 on Hard!)');
  }
  localStorage.setItem('vector-galaxy-unlocks', JSON.stringify(unlocks));
  return newUnlocks;
}

// GAME STARTS & INITIALIZATION
function setDifficulty(diff) {
  currentDifficulty = diff;
  document.querySelectorAll('.diff-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.diff === diff);
  });
  diffBadge.textContent = DIFFICULTIES[diff].name;
  diffBadge.className = `badge ${DIFFICULTIES[diff].badgeClass}`;
  bestScore = Number(localStorage.getItem(`vector-galaxy-best-${currentDifficulty}`) || 0);
  bestScoreEl.textContent = bestScore;
}

document.querySelectorAll('.diff-card').forEach(card => {
  card.addEventListener('click', () => setDifficulty(card.dataset.diff));
});

function resetPlayerStats() {
  const diffCfg = DIFFICULTIES[currentDifficulty];
  lives = diffCfg.lives;
  cash = diffCfg.startCash;
  equippedPassives = [];
  playerStats = {
    damage: 1,
    fireDelay: 180,
    speedMult: 1.0,
    twin: false,
    pierce: 0,
    shields: 0,
    regenShield: 0,
    comboBoost: 1.0,
    bountyCash: 0,
    ricochet: false,
    siphon: false,
    doubleSelfDamage: false,
    tempDoubleScore: false
  };
  renderPassivesBar();
}

function startRun() {
  score = 0;
  ante = 1;
  round = 1; // 1 = Small Blind, 2 = Big Blind, 3 = Boss Blind
  combo = 0;
  comboTime = 0;
  autoFire = true;
  keys = new Set();
  bullets = [];
  enemyBullets = [];
  particles = [];
  pointerHeld = false;
  
  runStats = { kills: 0, maxCombo: 0, bossesDefeated: 0, totalCashEarned: 0, blindsCleared: 0 };
  resetPlayerStats();
  
  titleScreen.classList.add('hidden');
  gameView.classList.remove('hidden');
  shopOverlay.classList.remove('show');
  overlay.classList.remove('show');
  gameState = 'PLAYING';
  
  resizeCanvas();
  createPlayer();
  setupBlind();
  resetStars();
  syncHud();
}

function setupBlind() {
  bullets = [];
  enemyBullets = [];
  boss = null;
  activeBossModifier = null;
  bossBanner.classList.remove('show');
  
  // Regenerate shields from passive
  if (playerStats.regenShield > 0) {
    playerStats.shields += playerStats.regenShield;
  }

  if (round === 3) {
    // Boss Blind
    activeBossModifier = BOSS_MODIFIERS[Math.floor(Math.random() * BOSS_MODIFIERS.length)];
    bossBanner.textContent = `⚠️ BOSS BLIND: ${activeBossModifier.name.toUpperCase()} (${activeBossModifier.text})`;
    bossBanner.classList.add('show');

    let bossHp = 35 + ante * 15;
    if (activeBossModifier.id === 'the_wall') bossHp *= 2;

    boss = {
      x: VIRTUAL_WIDTH / 2,
      y: 130,
      hp: bossHp,
      maxHp: bossHp,
      vx: 90,
      cooldown: 0.8,
      phase: 1
    };
    blindNameEl.textContent = `Boss: ${activeBossModifier.name}`;
  } else {
    blindNameEl.textContent = round === 1 ? 'Small Blind' : 'Big Blind';
    createFormation();
  }

  syncHud();
}

function resetStars() {
  stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * VIRTUAL_WIDTH,
    y: Math.random() * VIRTUAL_HEIGHT,
    speed: 20 + Math.random() * 80,
    size: 0.6 + Math.random() * 2.2,
    alpha: 0.1 + Math.random() * 0.8
  }));
}

function createPlayer() {
  player = { x: VIRTUAL_WIDTH / 2, y: VIRTUAL_HEIGHT - 80, flash: 0 };
}

function positionFor(i, count, pattern) {
  const row = Math.floor(i / 7), col = i % 7;
  if (pattern === 'vee') return { x: 120 + col * 90, y: 110 + Math.abs(col - 3) * 40 + row * 60 };
  if (pattern === 'columns') return { x: 160 + (col % 4) * 140, y: 100 + Math.floor(i / 4) * 65 };
  if (pattern === 'diamond') {
    const angle = (i / count) * Math.PI * 2, ring = i % 3;
    return { x: VIRTUAL_WIDTH / 2 + Math.cos(angle) * (120 + ring * 50), y: 220 + Math.sin(angle) * (80 + ring * 35) };
  }
  return { x: 120 + col * 90, y: 120 + row * 65 };
}

function createFormation() {
  enemies = [];
  formationOffset = 0;
  formationDirection = 1;
  const diffCfg = DIFFICULTIES[currentDifficulty];
  diveClock = diffCfg.diveDelay;
  const pattern = FORMATIONS[(ante + round) % FORMATIONS.length];
  const count = 24;

  const hasPillar = activeBossModifier && activeBossModifier.id === 'the_pillar';

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / 7);
    let type = row === 0 ? 'support' : row === 1 ? 'gunner' : row === 2 ? 'tank' : 'scout';
    if (ante === 1 && type === 'tank') type = 'scout';
    const pos = positionFor(i, count, pattern), data = ENEMY_TYPES[type];
    const hp = data.hp + (hasPillar ? 1 : 0);
    enemies.push({
      ...pos,
      baseX: pos.x,
      baseY: pos.y,
      row,
      col: i % 7,
      type,
      hp,
      maxHp: hp,
      alive: true,
      diving: false,
      vx: 0,
      vy: 0,
      angle: 0,
      value: data.value,
      cooldown: 1.0 + Math.random() * 2.5
    });
  }
}

function syncHud() {
  scoreEl.textContent = Math.floor(score);
  anteInfoEl.textContent = `${ante}-${round}`;
  livesEl.textContent = lives;
  cashEl.textContent = `$${cash}`;
  bestScoreEl.textContent = bestScore;
  comboLabel.textContent = combo > 1 ? `Combo x${combo} (${playerStats.comboBoost}x mult)` : 'Chain shots for multiplier';
  comboFill.style.width = `${Math.max(0, Math.min(100, (comboTime / 2) * 100))}%`;
}

function renderPassivesBar() {
  passivesBar.innerHTML = `<span style="font-size:0.6rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; flex-shrink:0;">Passives (${equippedPassives.length}/5):</span>`;
  for (let i = 0; i < 5; i++) {
    const slot = document.createElement('div');
    if (i < equippedPassives.length) {
      const p = equippedPassives[i];
      slot.className = 'passive-slot filled';
      slot.textContent = p.name;
      slot.title = p.text;
    } else {
      slot.className = 'passive-slot';
      slot.textContent = 'Empty';
    }
    passivesBar.appendChild(slot);
  }
}

// BULLET & FIRE LOGIC
function fireBullet() {
  const now = performance.now();
  let delay = playerStats.fireDelay;

  if (activeBossModifier) {
    if (activeBossModifier.id === 'the_eye' && autoFire) return; // Must manual tap
    if (activeBossModifier.id === 'the_arm') delay /= 0.7; // Rate reduced
  }

  if (now - lastShot < delay || gameState !== 'PLAYING') return;
  lastShot = now;

  const isFlint = activeBossModifier && activeBossModifier.id === 'the_flint';
  const shots = (playerStats.twin && !isFlint) ? [-12, 12] : [0];
  const pierceVal = isFlint ? 0 : playerStats.pierce;

  shots.forEach(dx => {
    bullets.push({
      x: player.x + dx,
      y: player.y - 22,
      vy: -750,
      vx: 0,
      damage: playerStats.damage,
      pierce: pierceVal
    });
  });
  burst(player.x, player.y - 15, '#66d9ff', 4);
}

function enemyFire(enemy, spread = false) {
  const dx = player.x - enemy.x, dy = player.y - enemy.y, length = Math.hypot(dx, dy) || 1;
  const angles = spread ? [-0.15, 0.15] : [0];
  angles.forEach(a => {
    const vx = (dx / length) * 260, vy = Math.abs((dy / length) * 260);
    enemyBullets.push({ x: enemy.x, y: enemy.y + 16, vx: vx + vy * a, vy });
  });
}

// MULTI-INPUT GAMEPAD POLLING & KEYBOARD/MOUSE/TOUCH
function pollGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gpConnected = false;

  for (const gp of gamepads) {
    if (!gp) continue;
    gpConnected = true;

    // Movement: Left stick (axis 0) or D-Pad (buttons 14, 15)
    const axisX = gp.axes[0];
    if (Math.abs(axisX) > 0.15) {
      player.x += axisX * 450 * playerStats.speedMult * (1 / 60);
    }
    if (gp.buttons[14] && gp.buttons[14].pressed) player.x -= 400 * playerStats.speedMult * (1 / 60);
    if (gp.buttons[15] && gp.buttons[15].pressed) player.x += 400 * playerStats.speedMult * (1 / 60);

    // Fire button: A (0), R1 (5), RT (7)
    if (gp.buttons[0]?.pressed || gp.buttons[5]?.pressed || gp.buttons[7]?.pressed) {
      fireBullet();
    }
  }

  gamepadBadge.style.display = gpConnected ? 'inline-flex' : 'none';
}

function updatePlayer(dt) {
  let moveDir = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) moveDir -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) moveDir += 1;

  player.x += moveDir * 450 * playerStats.speedMult * dt;
  player.x = Math.max(30, Math.min(VIRTUAL_WIDTH - 30, player.x));

  if ((keys.has('Space') || keys.has('KeyZ') || pointerHeld) && autoFire) {
    fireBullet();
  }

  player.flash = Math.max(0, player.flash - dt * 2.2);
}

function updateFormation(dt) {
  if (boss) return updateBoss(dt);

  const diffCfg = DIFFICULTIES[currentDifficulty];
  let diveMult = diffCfg.diveSpeedMult;
  if (activeBossModifier && activeBossModifier.id === 'the_serpent') diveMult *= 2.0;

  formationOffset += formationDirection * dt * (35 + ante * 4);
  if (Math.abs(formationOffset) > 60) formationDirection *= -1;

  const maxEnemyBullets = 4 + ante * 2;

  for (const e of enemies) {
    if (!e.alive) continue;
    e.cooldown = Math.max(0, (e.cooldown || 0) - dt);
    const data = ENEMY_TYPES[e.type];

    if (!e.diving) {
      e.x = e.baseX + formationOffset;
      e.y = e.baseY + Math.sin(e.col + performance.now() * 0.0015) * 5;
    } else {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.angle += dt * 7;
      if (e.y > VIRTUAL_HEIGHT + 30) {
        Object.assign(e, { diving: false, x: e.baseX + formationOffset, y: e.baseY, vx: 0, vy: 0, angle: 0 });
      }
    }

    if (e.cooldown <= 0 && enemyBullets.length < maxEnemyBullets) {
      const chance = data.fireRate * dt * 60 * diffCfg.enemyFireMult * (1 + ante * 0.08);
      if (Math.random() < chance) {
        enemyFire(e, e.type === 'gunner' && (currentDifficulty === 'hard' || ante >= 2));
        e.cooldown = 3.0 + Math.random() * 2.5;
      }
    }
  }

  diveClock -= dt * diveMult;
  if (diveClock <= 0) {
    sendDiver();
    diveClock = Math.max(0.6, diffCfg.diveDelay - ante * 0.1);
  }
}

function updateBoss(dt) {
  boss.x += boss.vx * dt;
  if (boss.x < 110 || boss.x > VIRTUAL_WIDTH - 110) boss.vx *= -1;

  boss.phase = boss.hp < boss.maxHp * 0.35 ? 3 : boss.hp < boss.maxHp * 0.7 ? 2 : 1;
  boss.cooldown -= dt;
  if (boss.cooldown <= 0) {
    enemyFire(boss, boss.phase >= 2);
    if (boss.phase === 3) enemyFire({ x: boss.x - 70, y: boss.y + 20 }, true);
    boss.cooldown = 0.9 - boss.phase * 0.15;
  }
}

function sendDiver() {
  const candidates = enemies.filter(e => e.alive && !e.diving && e.type !== 'tank');
  if (!candidates.length) return;
  const e = candidates[Math.floor(Math.random() * candidates.length)], data = ENEMY_TYPES[e.type];
  e.diving = true;
  e.vx = (player.x - e.x) * 0.6 * data.speed;
  e.vy = (240 + ante * 18) * data.speed;
}

function updateProjectiles(dt) {
  bullets.forEach(b => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (playerStats.ricochet) {
      if (b.x < 20 || b.x > VIRTUAL_WIDTH - 20) {
        b.vx *= -1;
        b.x = Math.max(20, Math.min(VIRTUAL_WIDTH - 20, b.x));
      }
    }
  });

  enemyBullets.forEach(b => {
    b.x += (b.vx || 0) * dt;
    b.y += b.vy * dt;
  });

  bullets = bullets.filter(b => b.y > -30 && b.y < VIRTUAL_HEIGHT + 30);
  enemyBullets = enemyBullets.filter(b => b.y < VIRTUAL_HEIGHT + 30 && b.x > -30 && b.x < VIRTUAL_WIDTH + 30);
}

function burst(x, y, color, radius = 10) {
  particles.push({ x, y, life: 0.4, color, radius });
}

function registerKill(e) {
  e.alive = false;
  const diffCfg = DIFFICULTIES[currentDifficulty];
  const baseVal = e.value * diffCfg.scoreMult;
  const comboBonus = 1 + Math.min(combo, 25) * 0.1 * playerStats.comboBoost;
  let pts = Math.floor(baseVal * comboBonus);

  if (playerStats.tempDoubleScore) pts *= 2;

  score += pts;
  burst(e.x, e.y, ENEMY_TYPES[e.type].color, 14);
}

function collide() {
  for (const b of bullets) {
    if (boss && Math.abs(b.x - boss.x) < 70 && Math.abs(b.y - boss.y) < 45) {
      b.y = -100;
      boss.hp -= b.damage;
      burst(b.x, b.y, '#ffcf66', 8);
      if (boss.hp <= 0) {
        let bossPts = (4000 + ante * 500) * DIFFICULTIES[currentDifficulty].scoreMult;
        if (playerStats.tempDoubleScore) bossPts *= 2;
        score += bossPts;
        runStats.bossesDefeated++;

        if (playerStats.siphon && lives < DIFFICULTIES[currentDifficulty].lives + 2) {
          lives++;
        }
        if (playerStats.bountyCash > 0) {
          cash += playerStats.bountyCash;
        }

        boss = null;
        completeBlind();
      }
      continue;
    }

    for (const e of enemies) {
      if (e.alive && Math.abs(b.x - e.x) < 24 && Math.abs(b.y - e.y) < 24) {
        e.hp -= b.damage;
        burst(b.x, b.y, ENEMY_TYPES[e.type].color, 7);
        if (e.hp <= 0) registerKill(e);
        if (b.pierce-- <= 0) b.y = -100;
        break;
      }
    }
  }

  for (const b of enemyBullets) {
    if (Math.abs(b.x - player.x) < 20 && Math.abs(b.y - player.y) < 20) {
      b.y = VIRTUAL_HEIGHT + 60;
      loseLife();
      break;
    }
  }

  for (const e of enemies) {
    if (e.alive && Math.abs(e.x - player.x) < 26 && Math.abs(e.y - player.y) < 26) {
      registerKill(e);
      loseLife();
      break;
    }
  }

  if (!boss && enemies.length && enemies.every(e => !e.alive)) {
    completeBlind();
  }
}

function loseLife() {
  if (playerStats.shields > 0) {
    playerStats.shields--;
    burst(player.x, player.y, '#ffcf66', 22);
    syncHud();
    return;
  }

  const lossCount = playerStats.doubleSelfDamage ? 2 : 1;
  lives -= lossCount;
  combo = 0;
  comboTime = 0;
  player.flash = 1;
  burst(player.x, player.y, '#ff7f9d', 20);
  syncHud();

  if (lives <= 0) endGame();
}

function completeBlind() {
  runStats.blindsCleared++;
  playerStats.tempDoubleScore = false;

  // Award Cash
  const blindPayout = round === 1 ? 4 : round === 2 ? 6 : 10;
  const interest = Math.min(5, Math.floor(cash / 5));
  const totalEarned = blindPayout + lives + interest;
  cash += totalEarned;
  runStats.totalCashEarned += totalEarned;

  openShop();
}

// SHOP & INTERMISSION SYSTEM
function openShop() {
  gameState = 'SHOP';
  shopCash.textContent = `$${cash}`;
  shopSubtext.textContent = `Blind ${ante}-${round} Cleared! Earned $${round === 1 ? 4 : round === 2 ? 6 : 10} payout + bonus interest.`;
  
  shopGrid.innerHTML = '';

  // Select 3 random Jokers + 2 consumables
  const availablePassives = PASSIVE_JOKERS.filter(j => !equippedPassives.some(p => p.id === j.id));
  const shuffledJokers = [...availablePassives].sort(() => Math.random() - 0.5).slice(0, 3);
  const shuffledItems = [...SHOP_ITEMS].sort(() => Math.random() - 0.5).slice(0, 2);

  shuffledJokers.forEach(j => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div>
        <strong style="color:var(--primary);">${j.name}</strong>
        <p>${j.text}</p>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
        <span class="cost">$${j.cost}</span>
        <button type="button" ${cash < j.cost || equippedPassives.length >= 5 ? 'disabled' : ''}>BUY PASSIVE</button>
      </div>
    `;
    const buyBtn = card.querySelector('button');
    buyBtn.onclick = () => {
      if (cash >= j.cost && equippedPassives.length < 5) {
        cash -= j.cost;
        equippedPassives.push(j);
        j.apply(playerStats);
        renderPassivesBar();
        openShop(); // Refresh shop display
      }
    };
    shopGrid.appendChild(card);
  });

  shuffledItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div>
        <strong style="color:var(--gold);">${item.name}</strong>
        <p>${item.text}</p>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
        <span class="cost">$${item.cost}</span>
        <button type="button" ${cash < item.cost ? 'disabled' : ''}>BUY ITEM</button>
      </div>
    `;
    const buyBtn = card.querySelector('button');
    buyBtn.onclick = () => {
      if (cash >= item.cost) {
        cash -= item.cost;
        item.buy();
        openShop(); // Refresh
      }
    };
    shopGrid.appendChild(card);
  });

  shopOverlay.classList.add('show');
}

$('nextBlindBtn').onclick = () => {
  shopOverlay.classList.remove('show');
  gameState = 'PLAYING';

  round++;
  if (round > 3) {
    round = 1;
    ante++;
  }
  setupBlind();
};

// GAME OVER & LEADERBOARD
function endGame() {
  gameState = 'GAMEOVER';
  overlay.classList.add('show');

  const newUnlocks = checkUnlocks();

  $('overlayTitle').textContent = runStats.maxCombo >= 15 ? 'Ace Pilot' : 'Fleet Lost';
  $('overlayText').textContent = `Reached Ante ${ante}-${round} · ${Math.floor(score)} points`;
  
  runSummary.innerHTML = `
    <span>Enemies Eliminated</span><span>${runStats.kills}</span>
    <span>Best Combo</span><span>x${runStats.maxCombo}</span>
    <span>Bosses Defeated</span><span>${runStats.bossesDefeated}</span>
    <span>Total Cash Earned</span><span>$${runStats.totalCashEarned}</span>
    <span>Difficulty</span><span>${DIFFICULTIES[currentDifficulty].name}</span>
  `;

  if (newUnlocks.length > 0) {
    unlockBanner.style.display = 'block';
    unlockBanner.innerHTML = `<strong>NEW UNLOCKS ACHIEVED!</strong><br>${newUnlocks.join('<br>')}`;
  } else {
    unlockBanner.style.display = 'none';
  }

  submitScore();
}

async function submitScore() {
  const currentBest = Number(localStorage.getItem(`vector-galaxy-best-${currentDifficulty}`) || 0);
  if (score > currentBest) {
    bestScore = Math.floor(score);
    localStorage.setItem(`vector-galaxy-best-${currentDifficulty}`, bestScore);
    syncHud();
  }

  try {
    await fetch('/api/highscores', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Pilot', score: Math.floor(score), wave: ante * 3 + round, difficulty: currentDifficulty })
    });
  } catch (err) {
    // Graceful offline fallback
  }
}

// PARTICLES & STARS UPDATES
function updateParticles(dt) {
  particles.forEach(p => {
    p.life -= dt;
    p.radius += dt * 25;
  });
  particles = particles.filter(p => p.life > 0);
}

function updateStars(dt) {
  stars.forEach(s => {
    s.y += s.speed * dt;
    if (s.y > VIRTUAL_HEIGHT) {
      s.y = -6;
      s.x = Math.random() * VIRTUAL_WIDTH;
    }
  });
}

// CANVAS DRAWING ROUTINES (FULL-WIDTH & RESPONSIVE SCALING)
function drawShip(x, y, color) {
  ctx.save();
  ctx.translate(x * scaleFactorX, y * scaleFactorY);
  ctx.strokeStyle = color;
  const sMin = Math.min(scaleFactorX, scaleFactorY);
  ctx.lineWidth = 2.8 * sMin;
  ctx.shadowBlur = 16 * sMin;
  ctx.shadowColor = color;
  const sX = scaleFactorX, sY = scaleFactorY;

  ctx.beginPath();
  ctx.moveTo(0, -18 * sY);
  ctx.lineTo(14 * sX, 12 * sY);
  ctx.lineTo(6 * sX, 12 * sY);
  ctx.lineTo(0, 3 * sY);
  ctx.lineTo(-6 * sX, 12 * sY);
  ctx.lineTo(-14 * sX, 12 * sY);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawEnemy(e) {
  const d = ENEMY_TYPES[e.type];
  ctx.save();
  ctx.translate(e.x * scaleFactorX, e.y * scaleFactorY);
  if (e.diving) ctx.rotate(Math.sin(e.angle) * 0.35);

  ctx.strokeStyle = d.color;
  const sMin = Math.min(scaleFactorX, scaleFactorY);
  ctx.lineWidth = (e.type === 'tank' ? 3.5 : 2.5) * sMin;
  ctx.shadowBlur = 12 * sMin;
  ctx.shadowColor = d.color;
  const sX = scaleFactorX, sY = scaleFactorY;

  ctx.beginPath();
  ctx.moveTo(-15 * sX, 12 * sY);
  ctx.lineTo(-7 * sX, -8 * sY);
  ctx.lineTo(0, -14 * sY);
  ctx.lineTo(7 * sX, -8 * sY);
  ctx.lineTo(15 * sX, 12 * sY);
  ctx.lineTo(0, 6 * sY);
  ctx.closePath();
  ctx.stroke();

  if (e.hp < e.maxHp) {
    ctx.fillStyle = d.color;
    ctx.fillRect(-12 * sX, 18 * sY, (24 * e.hp / e.maxHp) * sX, 3 * sY);
  }
  ctx.restore();
}

function drawBoss() {
  ctx.save();
  ctx.translate(boss.x * scaleFactorX, boss.y * scaleFactorY);
  ctx.strokeStyle = '#ffcf66';
  ctx.shadowColor = '#ffcf66';
  const sMin = Math.min(scaleFactorX, scaleFactorY);
  ctx.shadowBlur = 24 * sMin;
  ctx.lineWidth = 3.5 * sMin;
  const sX = scaleFactorX, sY = scaleFactorY;

  ctx.strokeRect(-65 * sX, -35 * sY, 130 * sX, 70 * sY);
  ctx.beginPath();
  ctx.moveTo(-90 * sX, 0);
  ctx.lineTo(-50 * sX, -25 * sY);
  ctx.moveTo(90 * sX, 0);
  ctx.lineTo(50 * sX, -25 * sY);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.fillRect(-90 * sX, 50 * sY, 180 * sX, 8 * sY);
  ctx.fillStyle = '#ffcf66';
  ctx.fillRect(-90 * sX, 50 * sY, (180 * boss.hp / boss.maxHp) * sX, 8 * sY);
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const sMin = Math.min(scaleFactorX, scaleFactorY);

  // Draw Starfield (full canvas width and height)
  if (stars) stars.forEach(s => {
    ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
    ctx.fillRect(s.x * scaleFactorX, s.y * scaleFactorY, s.size * sMin, s.size * sMin);
  });

  // Background Grid Lines
  ctx.strokeStyle = 'rgba(102,217,255,.06)';
  ctx.lineWidth = 1 * sMin;
  for (let y = 60; y < VIRTUAL_HEIGHT; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y * scaleFactorY);
    ctx.lineTo(canvas.width, y * scaleFactorY);
    ctx.stroke();
  }

  // Draw Player Bullets
  if (bullets) bullets.forEach(b => {
    ctx.strokeStyle = '#66d9ff';
    ctx.lineWidth = 2.5 * sMin;
    ctx.beginPath();
    ctx.moveTo(b.x * scaleFactorX, (b.y + 12) * scaleFactorY);
    ctx.lineTo(b.x * scaleFactorX, (b.y - 12) * scaleFactorY);
    ctx.stroke();
  });

  // Draw Enemy Bullets
  if (enemyBullets) enemyBullets.forEach(b => {
    ctx.strokeStyle = '#ff7f9d';
    ctx.lineWidth = 2.5 * sMin;
    ctx.beginPath();
    ctx.moveTo(b.x * scaleFactorX, (b.y - 10) * scaleFactorY);
    ctx.lineTo(b.x * scaleFactorX, (b.y + 10) * scaleFactorY);
    ctx.stroke();
  });

  // Draw Enemies & Boss
  if (enemies) enemies.forEach(e => e.alive && drawEnemy(e));
  if (boss) drawBoss();

  // Draw Player Ship
  if (player) drawShip(player.x, player.y, player.flash ? '#ff7f9d' : '#66d9ff');

  // Draw Particles
  if (particles) particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x * scaleFactorX, p.y * scaleFactorY, p.radius * sMin, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

// MAIN ANIMATION LOOP
function frame(time) {
  if (!lastTime) lastTime = time;
  const dt = Math.min(0.033, (time - lastTime) / 1000);
  lastTime = time;

  pollGamepad();

  if (gameState === 'PLAYING') {
    updateStars(dt);
    updatePlayer(dt);
    updateFormation(dt);
    updateProjectiles(dt);
    updateParticles(dt);

    if (comboTime > 0) {
      comboTime -= dt;
      if (comboTime <= 0) combo = 0;
    }

    collide();
    syncHud();
  }

  render();
  requestAnimationFrame(frame);
}

// EVENT LISTENERS & INPUT HANDLERS
function handleCanvasPointer(e) {
  const rect = canvas.getBoundingClientRect();
  const relX = (e.clientX - rect.left) / rect.width;
  player.x = Math.max(30, Math.min(VIRTUAL_WIDTH - 30, relX * VIRTUAL_WIDTH));
}

canvas.addEventListener('pointerdown', e => {
  if (gameState !== 'PLAYING') return;
  pointerHeld = true;
  handleCanvasPointer(e);
  fireBullet();
});

canvas.addEventListener('pointermove', e => {
  if (gameState === 'PLAYING') {
    handleCanvasPointer(e);
  }
});

window.addEventListener('pointerup', () => pointerHeld = false);

document.addEventListener('keydown', e => {
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (gameState === 'PLAYING') gameState = 'PAUSED';
    else if (gameState === 'PAUSED') gameState = 'PLAYING';
    return;
  }
  keys.add(e.code);
  if (e.code === 'Space' || e.code === 'KeyZ' || e.code === 'Enter') {
    if (gameState === 'PLAYING') {
      e.preventDefault();
      fireBullet();
    }
  }
});

document.addEventListener('keyup', e => keys.delete(e.code));

// MENU & BUTTON ACTIONS
$('startRunBtn').onclick = startRun;
$('overlayRestart').onclick = startRun;
$('overlayMenu').onclick = $('menuButton').onclick = () => {
  gameState = 'TITLE';
  titleScreen.classList.remove('hidden');
  gameView.classList.add('hidden');
};

$('pauseButton').onclick = () => {
  if (gameState === 'PLAYING') {
    gameState = 'PAUSED';
    $('pauseButton').textContent = 'Resume';
  } else if (gameState === 'PAUSED') {
    gameState = 'PLAYING';
    $('pauseButton').textContent = 'Pause';
  }
};

$('autofireButton').onclick = () => {
  autoFire = !autoFire;
  $('autofireButton').textContent = `Autofire: ${autoFire ? 'On' : 'Off'}`;
};

// THEME TOGGLE
(function themeToggle() {
  const btns = document.querySelectorAll('[data-theme-toggle]'), root = document.documentElement;
  let mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  function applyTheme() {
    root.dataset.theme = mode;
    btns.forEach(btn => {
      btn.setAttribute('aria-label', `Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`);
      btn.innerHTML = mode === 'dark'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    });
  }
  applyTheme();
  btns.forEach(btn => {
    btn.onclick = () => {
      mode = mode === 'dark' ? 'light' : 'dark';
      applyTheme();
    };
  });
})();

// INIT
setDifficulty('normal');
resetStars();
createPlayer();
requestAnimationFrame(frame);

