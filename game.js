const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const scoreEl = $('score');
const livesEl = $('lives');
const waveEl = $('wave');
const bestScoreEl = $('bestScore');
const modeLabel = $('modeLabel');
const bonusLabel = $('bonusLabel');
const comboFill = $('comboFill');
const overlay = $('overlay');
const choiceOverlay = $('choiceOverlay');
const upgradeGrid = $('upgradeGrid');

const ENEMY_TYPES = {
  scout: { color: '#62ffb3', hp: 1, value: 70, fireRate: 0.008, speed: 1.35 },
  gunner: { color: '#66d9ff', hp: 1, value: 100, fireRate: 0.022, speed: 0.9 },
  tank: { color: '#a682ff', hp: 3, value: 220, fireRate: 0.007, speed: 0.7 },
  support: { color: '#ffcf66', hp: 2, value: 180, fireRate: 0.005, speed: 0.8 }
};
const FORMATIONS = ['grid', 'vee', 'columns', 'diamond'];
const UPGRADES = [
  { id: 'twin', name: 'Twin Pulse', text: 'Fire two parallel shots.', apply: u => u.twin = true },
  { id: 'rapid', name: 'Overdrive', text: 'Fire 25% faster.', apply: u => u.fireDelay *= 0.75 },
  { id: 'pierce', name: 'Piercing Core', text: 'Shots pierce one extra target.', apply: u => u.pierce += 1 },
  { id: 'shield', name: 'Phase Shield', text: 'Block one hit each wave.', apply: u => u.shieldMax += 1 },
  { id: 'thruster', name: 'Vector Thrusters', text: 'Move 20% faster.', apply: u => u.speed *= 1.2 },
  { id: 'power', name: 'Heavy Pulse', text: 'Shots deal one extra damage.', apply: u => u.damage += 1 }
];

let score, lives, wave, combo, comboTime, autoFire, gameOver, paused, keys;
let stars, bullets, enemyBullets, enemies, particles, player, boss;
let formationOffset, formationDirection, diveClock, lastShot, lastTime, pointerHeld;
let bestScore = Number(localStorage.getItem('vector-galaxy-best') || 0);
let stats, upgrades, wavePerfect;

function resetStars() {
  stars = Array.from({ length: 90 }, () => ({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, speed: 20+Math.random()*80, size: .4+Math.random()*1.8, alpha: .1+Math.random()*.8 }));
}
function createPlayer() {
  player = { x: canvas.width/2, y: canvas.height-64, flash: 0 };
}
function positionFor(i, count, pattern) {
  const row = Math.floor(i / 7), col = i % 7;
  if (pattern === 'vee') return { x: 72+col*56, y: 82+Math.abs(col-3)*27+row*40 };
  if (pattern === 'columns') return { x: 100+(col%4)*94, y: 72+Math.floor(i/4)*43 };
  if (pattern === 'diamond') { const angle=(i/count)*Math.PI*2, ring=i%3; return { x:240+Math.cos(angle)*(70+ring*34), y:150+Math.sin(angle)*(48+ring*20) }; }
  return { x:72+col*56, y:88+row*44 };
}
function createFormation() {
  enemies=[]; boss=null; formationOffset=0; formationDirection=1; diveClock=1.5; wavePerfect=true;
  upgrades.shield = upgrades.shieldMax;
  if (wave % 5 === 0) {
    boss={ x:240, y:120, hp:30+wave*3, maxHp:30+wave*3, vx:75, cooldown:.8, phase:1 };
    modeLabel.textContent='Boss sector'; return;
  }
  const pattern=FORMATIONS[(wave-1)%FORMATIONS.length];
  const count=24;
  for(let i=0;i<count;i++) {
    const row=Math.floor(i/7);
    let type=row===0?'support':row===1?'gunner':row===2?'tank':'scout';
    if(wave<3 && type==='tank') type='scout';
    const pos=positionFor(i,count,pattern), data=ENEMY_TYPES[type];
    enemies.push({ ...pos, baseX:pos.x, baseY:pos.y, row, col:i%7, type, hp:data.hp, maxHp:data.hp, alive:true, diving:false, vx:0, vy:0, angle:0, value:data.value });
  }
  modeLabel.textContent=`${pattern[0].toUpperCase()+pattern.slice(1)} sector`;
}
function resetGame() {
  score=0; lives=3; wave=1; combo=0; comboTime=0; autoFire=true; gameOver=false; paused=false; keys=new Set();
  bullets=[]; enemyBullets=[]; particles=[]; pointerHeld=false;
  stats={ kills:0, maxCombo:0, perfectWaves:0, bosses:0 };
  upgrades={ twin:false, fireDelay:180, pierce:0, shieldMax:0, shield:0, speed:310, damage:1 };
  overlay.classList.remove('show'); choiceOverlay.classList.remove('show');
  $('autofireButton').textContent='Autofire: On';
  createPlayer(); createFormation(); resetStars(); syncHud();
}
function syncHud() {
  scoreEl.textContent=score; livesEl.textContent=lives; waveEl.textContent=wave; bestScoreEl.textContent=bestScore;
  bonusLabel.textContent=combo>1?`Combo x${combo}${upgrades.shield?' · Shielded':''}`:'Chain kills before the meter fades';
  comboFill.style.width=`${Math.max(0, Math.min(100, comboTime/2*100))}%`;
}
function fireBullet() {
  const now=performance.now();
  if(now-lastShot<upgrades.fireDelay || gameOver || paused) return;
  lastShot=now; stats.shots=(stats.shots||0)+1;
  const shots=upgrades.twin?[-7,7]:[0];
  shots.forEach(dx=>bullets.push({x:player.x+dx,y:player.y-18,vy:-520,damage:upgrades.damage,pierce:upgrades.pierce}));
  burst(player.x,player.y-12,'#66d9ff',4);
}
function enemyFire(enemy, spread=false) {
  const dx=player.x-enemy.x, dy=player.y-enemy.y, length=Math.hypot(dx,dy)||1;
  const angles=spread?[-.18,0,.18]:[0];
  angles.forEach(a=>{ const vx=dx/length*230, vy=Math.abs(dy/length*230); enemyBullets.push({x:enemy.x,y:enemy.y+12,vx:vx+vy*a,vy}); });
}
function updatePlayer(dt) {
  if(keys.has('ArrowLeft')||keys.has('KeyA')) player.x-=upgrades.speed*dt;
  if(keys.has('ArrowRight')||keys.has('KeyD')) player.x+=upgrades.speed*dt;
  player.x=Math.max(24,Math.min(canvas.width-24,player.x));
  if((keys.has('Space')||pointerHeld)&&autoFire) fireBullet();
  player.flash=Math.max(0,player.flash-dt*2.2); updateKnobFromPlayer();
}
function updateFormation(dt) {
  if(boss) return updateBoss(dt);
  formationOffset+=formationDirection*dt*(25+wave*3);
  if(Math.abs(formationOffset)>38) formationDirection*=-1;
  for(const e of enemies) {
    if(!e.alive) continue;
    const data=ENEMY_TYPES[e.type];
    if(!e.diving) { e.x=e.baseX+formationOffset; e.y=e.baseY+Math.sin(e.col+performance.now()*.0012)*3; }
    else { e.x+=e.vx*dt; e.y+=e.vy*dt; e.angle+=dt*7; if(e.y>canvas.height+24) Object.assign(e,{diving:false,x:e.baseX+formationOffset,y:e.baseY,vx:0,vy:0,angle:0}); }
    if(Math.random()<data.fireRate*dt*60*(1+wave*.04)) enemyFire(e,e.type==='gunner');
  }
  diveClock-=dt;
  if(diveClock<=0) { sendDiver(); diveClock=Math.max(.55,1.9-wave*.07); }
}
function updateBoss(dt) {
  boss.x+=boss.vx*dt;
  if(boss.x<75||boss.x>405) boss.vx*=-1;
  boss.phase=boss.hp<boss.maxHp*.35?3:boss.hp<boss.maxHp*.7?2:1;
  boss.cooldown-=dt;
  if(boss.cooldown<=0) { enemyFire(boss,boss.phase>=2); if(boss.phase===3) enemyFire({x:boss.x-45,y:boss.y+15},true); boss.cooldown=.95-boss.phase*.16; }
}
function sendDiver() {
  const candidates=enemies.filter(e=>e.alive&&!e.diving&&e.type!=='tank'); if(!candidates.length)return;
  const e=candidates[Math.floor(Math.random()*candidates.length)], data=ENEMY_TYPES[e.type];
  e.diving=true; e.vx=(player.x-e.x)*.6*data.speed; e.vy=(165+wave*13)*data.speed;
}
function updateProjectiles(dt) {
  bullets.forEach(b=>b.y+=b.vy*dt); enemyBullets.forEach(b=>{b.x+=(b.vx||0)*dt;b.y+=b.vy*dt});
  bullets=bullets.filter(b=>b.y>-25); enemyBullets=enemyBullets.filter(b=>b.y<canvas.height+25&&b.x>-25&&b.x<canvas.width+25);
}
function burst(x,y,color,radius=8){ particles.push({x,y,life:.38,color,radius}); }
function registerKill(e) {
  e.alive=false; combo+=1; comboTime=2; stats.kills+=1; stats.maxCombo=Math.max(stats.maxCombo,combo);
  score+=Math.floor(e.value*(1+Math.min(combo,20)*.1)); burst(e.x,e.y,ENEMY_TYPES[e.type].color,10);
}
function collide() {
  for(const b of bullets) {
    if(boss&&Math.abs(b.x-boss.x)<48&&Math.abs(b.y-boss.y)<34){ b.y=-100; boss.hp-=b.damage; burst(b.x,b.y,'#ffcf66',5); if(boss.hp<=0){score+=3000+wave*200;stats.bosses++;boss=null;completeWave();} continue; }
    for(const e of enemies) if(e.alive&&Math.abs(b.x-e.x)<18&&Math.abs(b.y-e.y)<18){ e.hp-=b.damage; burst(b.x,b.y,ENEMY_TYPES[e.type].color,5); if(e.hp<=0)registerKill(e); if(b.pierce--<=0)b.y=-100; break; }
  }
  for(const b of enemyBullets) if(Math.abs(b.x-player.x)<15&&Math.abs(b.y-player.y)<15){b.y=canvas.height+50;loseLife();break;}
  for(const e of enemies) if(e.alive&&Math.abs(e.x-player.x)<20&&Math.abs(e.y-player.y)<20){registerKill(e);loseLife();break;}
  if(!boss&&enemies.length&&enemies.every(e=>!e.alive)) completeWave();
}
function completeWave(){ stats.perfectWaves+=wavePerfect?1:0; score+=wavePerfect?500:150; wave++; bullets=[];enemyBullets=[]; if((wave-1)%2===0)showUpgrade(); else createFormation(); syncHud(); }
function loseLife(){ if(upgrades.shield>0){upgrades.shield--;burst(player.x,player.y,'#ffcf66',16);syncHud();return;} lives--;combo=0;comboTime=0;wavePerfect=false;player.flash=1;burst(player.x,player.y,'#ff7f9d',14);syncHud();if(lives<=0)endGame(); }
function showUpgrade(){ paused=true; choiceOverlay.classList.add('show'); const choices=[...UPGRADES].sort(()=>Math.random()-.5).slice(0,3); upgradeGrid.innerHTML=''; choices.forEach(u=>{const btn=document.createElement('button');btn.className='upgrade-card';btn.innerHTML=`<strong>${u.name}</strong><span>${u.text}</span>`;btn.onclick=()=>{u.apply(upgrades);paused=false;choiceOverlay.classList.remove('show');createFormation();syncHud()};upgradeGrid.appendChild(btn)}); }
function endGame(){gameOver=true;overlay.classList.add('show');$('overlayTitle').textContent=stats.maxCombo>=15?'Ace pilot':'Fleet lost';$('overlayText').textContent=`Wave ${wave} · ${score} points`;$('runSummary').innerHTML=`<span>Enemies</span><span>${stats.kills}</span><span>Best combo</span><span>x${stats.maxCombo}</span><span>Perfect waves</span><span>${stats.perfectWaves}</span><span>Bosses</span><span>${stats.bosses}</span>`;submitScore();}
function updateParticles(dt){particles.forEach(p=>{p.life-=dt;p.radius+=dt*18});particles=particles.filter(p=>p.life>0)}
function updateStars(dt){stars.forEach(s=>{s.y+=s.speed*dt;if(s.y>canvas.height){s.y=-4;s.x=Math.random()*canvas.width}})}
function drawShip(x,y,color){ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.lineWidth=2.2;ctx.shadowBlur=14;ctx.shadowColor=color;ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(10,8);ctx.lineTo(4,8);ctx.lineTo(0,2);ctx.lineTo(-4,8);ctx.lineTo(-10,8);ctx.closePath();ctx.stroke();ctx.restore()}
function drawEnemy(e){const d=ENEMY_TYPES[e.type];ctx.save();ctx.translate(e.x,e.y);if(e.diving)ctx.rotate(Math.sin(e.angle)*.35);ctx.strokeStyle=d.color;ctx.lineWidth=e.type==='tank'?3:2;ctx.shadowBlur=10;ctx.shadowColor=d.color;ctx.beginPath();ctx.moveTo(-11,8);ctx.lineTo(-5,-6);ctx.lineTo(0,-10);ctx.lineTo(5,-6);ctx.lineTo(11,8);ctx.lineTo(0,4);ctx.closePath();ctx.stroke();if(e.hp<e.maxHp){ctx.fillStyle=d.color;ctx.fillRect(-10,13,20*e.hp/e.maxHp,2)}ctx.restore()}
function drawBoss(){ctx.save();ctx.translate(boss.x,boss.y);ctx.strokeStyle='#ffcf66';ctx.shadowColor='#ffcf66';ctx.shadowBlur=20;ctx.lineWidth=3;ctx.strokeRect(-44,-25,88,50);ctx.beginPath();ctx.moveTo(-60,0);ctx.lineTo(-35,-17);ctx.moveTo(60,0);ctx.lineTo(35,-17);ctx.stroke();ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(-60,38,120,6);ctx.fillStyle='#ffcf66';ctx.fillRect(-60,38,120*boss.hp/boss.maxHp,6);ctx.restore()}
function render(){ctx.clearRect(0,0,canvas.width,canvas.height);stars.forEach(s=>{ctx.fillStyle=`rgba(255,255,255,${s.alpha})`;ctx.fillRect(s.x,s.y,s.size,s.size)});ctx.strokeStyle='rgba(102,217,255,.08)';for(let y=40;y<canvas.height;y+=56){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke()}bullets.forEach(b=>{ctx.strokeStyle='#66d9ff';ctx.beginPath();ctx.moveTo(b.x,b.y+8);ctx.lineTo(b.x,b.y-8);ctx.stroke()});enemyBullets.forEach(b=>{ctx.strokeStyle='#ff7f9d';ctx.beginPath();ctx.moveTo(b.x,b.y-6);ctx.lineTo(b.x,b.y+6);ctx.stroke()});enemies.forEach(e=>e.alive&&drawEnemy(e));if(boss)drawBoss();drawShip(player.x,player.y,player.flash?'#ff7f9d':'#66d9ff');particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1})}
function frame(time){if(!lastTime)lastTime=time;const dt=Math.min(.033,(time-lastTime)/1000);lastTime=time;if(!gameOver&&!paused){updateStars(dt);updatePlayer(dt);updateFormation(dt);updateProjectiles(dt);updateParticles(dt);if(comboTime>0){comboTime-=dt;if(comboTime<=0)combo=0}collide();syncHud()}render();requestAnimationFrame(frame)}
function trackPointer(x){const r=$('sliderTrack').getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(x-r.left)/r.width));player.x=24+ratio*(canvas.width-48);updateKnobFromPlayer()}
function updateKnobFromPlayer(){const track=$('sliderTrack'),width=track.getBoundingClientRect().width||track.offsetWidth,ratio=(player.x-24)/(canvas.width-48);$('shipKnob').style.left=`${Math.max(0,Math.min(width-64,ratio*(width-64)))}px`}
async function loadLeaderboard(){try{const r=await fetch('/api/highscores');if(!r.ok)return;const d=await r.json();if(d.scores?.[0]?.score>bestScore){bestScore=d.scores[0].score;localStorage.setItem('vector-galaxy-best',bestScore);syncHud()}}catch{}}
async function submitScore(){bestScore=Math.max(bestScore,score);localStorage.setItem('vector-galaxy-best',bestScore);syncHud();try{await fetch('/api/highscores',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Pilot',score,wave})})}catch{}}
const track=$('sliderTrack');track.addEventListener('pointerdown',e=>{trackPointer(e.clientX);track.setPointerCapture(e.pointerId)});track.addEventListener('pointermove',e=>{if(e.pressure>0||e.buttons>0)trackPointer(e.clientX)});$('fireButton').addEventListener('pointerdown',()=>{pointerHeld=true;fireBullet()});['pointerup','pointerleave'].forEach(n=>$('fireButton').addEventListener(n,()=>pointerHeld=false));document.addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='Space'){e.preventDefault();fireBullet()}});document.addEventListener('keyup',e=>keys.delete(e.code));$('restartButton').onclick=$('overlayRestart').onclick=resetGame;$('autofireButton').onclick=()=>{autoFire=!autoFire;$('autofireButton').textContent=`Autofire: ${autoFire?'On':'Off'}`;syncHud()};
(function themeToggle(){const btn=document.querySelector('[data-theme-toggle]'),root=document.documentElement;let mode=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';function icon(){root.dataset.theme=mode;btn.setAttribute('aria-label',`Switch to ${mode==='dark'?'light':'dark'} mode`);btn.textContent=mode==='dark'?'☀':'☾'}icon();btn.onclick=()=>{mode=mode==='dark'?'light':'dark';icon()}})();
loadLeaderboard();resetGame();requestAnimationFrame(frame);
