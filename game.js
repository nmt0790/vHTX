"use strict";

/* ============================================================
   Tank Battle — a top-down arena tank game on HTML5 canvas.
   Player vs. AI tanks across escalating levels.
   ============================================================ */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const ui = {
  score: document.getElementById("score"),
  level: document.getElementById("level"),
  lives: document.getElementById("lives"),
  health: document.getElementById("health-fill"),
  overlay: document.getElementById("overlay"),
  startBtn: document.getElementById("start-btn"),
  panel: document.querySelector(".panel"),
};

// ---- Utility -------------------------------------------------
const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const TAU = Math.PI * 2;

function angleLerp(a, b, t) {
  let diff = ((b - a + Math.PI) % TAU) - Math.PI;
  if (diff < -Math.PI) diff += TAU;
  return a + diff * t;
}

// ---- Input ---------------------------------------------------
const keys = {};
const mouse = { x: W / 2, y: 0, down: false };

window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === " ") e.preventDefault();
  if (e.key.toLowerCase() === "p") togglePause();
});
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
  return { x: (cx / r.width) * W, y: (cy / r.height) * H };
}
canvas.addEventListener("mousemove", (e) => {
  const p = pointerPos(e);
  mouse.x = p.x;
  mouse.y = p.y;
});
canvas.addEventListener("mousedown", () => (mouse.down = true));
window.addEventListener("mouseup", () => (mouse.down = false));
canvas.addEventListener("touchstart", (e) => {
  const p = pointerPos(e);
  mouse.x = p.x;
  mouse.y = p.y;
  mouse.down = true;
  e.preventDefault();
});
canvas.addEventListener("touchmove", (e) => {
  const p = pointerPos(e);
  mouse.x = p.x;
  mouse.y = p.y;
  e.preventDefault();
});
window.addEventListener("touchend", () => (mouse.down = false));

// ---- Game state ----------------------------------------------
const state = {
  running: false,
  paused: false,
  over: false,
  score: 0,
  level: 1,
  lives: 3,
  walls: [],
  bullets: [],
  enemies: [],
  particles: [],
  pickups: [],
  spawnTimer: 0,
  player: null,
};

// ---- Entities ------------------------------------------------
class Tank {
  constructor(x, y, isPlayer = false) {
    this.x = x;
    this.y = y;
    this.r = 16;
    this.bodyAngle = isPlayer ? -Math.PI / 2 : rand(0, TAU);
    this.turretAngle = this.bodyAngle;
    this.speed = isPlayer ? 2.4 : 1.2;
    this.maxHp = isPlayer ? 100 : 30;
    this.hp = this.maxHp;
    this.isPlayer = isPlayer;
    this.cooldown = 0;
    this.fireRate = isPlayer ? 18 : 70;
    this.color = isPlayer ? "#4ade80" : "#f87171";
    this.dead = false;
    // AI state
    this.aiThink = 0;
    this.moveDir = rand(0, TAU);
  }

  tryMove(dx, dy) {
    const nx = clamp(this.x + dx, this.r, W - this.r);
    const ny = clamp(this.y + dy, this.r, H - this.r);
    if (!this.hitsWall(nx, this.y)) this.x = nx;
    if (!this.hitsWall(this.x, ny)) this.y = ny;
  }

  hitsWall(x, y) {
    for (const wl of state.walls) {
      const cx = clamp(x, wl.x, wl.x + wl.w);
      const cy = clamp(y, wl.y, wl.y + wl.h);
      if (dist(x, y, cx, cy) < this.r) return true;
    }
    return false;
  }

  fire() {
    if (this.cooldown > 0) return;
    this.cooldown = this.fireRate;
    const bx = this.x + Math.cos(this.turretAngle) * (this.r + 6);
    const by = this.y + Math.sin(this.turretAngle) * (this.r + 6);
    state.bullets.push(new Bullet(bx, by, this.turretAngle, this.isPlayer));
    spawnMuzzle(bx, by, this.turretAngle);
  }

  damage(amount) {
    this.hp -= amount;
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      explode(this.x, this.y, this.color);
    }
  }

  update() {
    if (this.cooldown > 0) this.cooldown--;
    if (this.isPlayer) this.updatePlayer();
    else this.updateAI();
  }

  updatePlayer() {
    let dx = 0;
    let dy = 0;
    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      this.tryMove((dx / len) * this.speed, (dy / len) * this.speed);
      this.bodyAngle = angleLerp(this.bodyAngle, Math.atan2(dy, dx), 0.2);
    }
    this.turretAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
    if (mouse.down || keys[" "]) this.fire();
  }

  updateAI() {
    const p = state.player;
    if (!p) return;
    const d = dist(this.x, this.y, p.x, p.y);
    const aimAngle = Math.atan2(p.y - this.y, p.x - this.x);
    this.turretAngle = angleLerp(this.turretAngle, aimAngle, 0.06);

    this.aiThink--;
    if (this.aiThink <= 0) {
      this.aiThink = rand(40, 110);
      // Roughly head toward the player but with wander.
      this.moveDir = aimAngle + rand(-0.9, 0.9);
    }

    // Keep a comfortable combat distance.
    let mv = this.moveDir;
    if (d < 140) mv = aimAngle + Math.PI + rand(-0.5, 0.5);
    const mx = Math.cos(mv) * this.speed;
    const my = Math.sin(mv) * this.speed;
    this.tryMove(mx, my);
    this.bodyAngle = angleLerp(this.bodyAngle, mv, 0.1);

    // Fire when reasonably aimed and in range.
    const aimErr = Math.abs(((aimAngle - this.turretAngle + Math.PI) % TAU) - Math.PI);
    if (d < 360 && aimErr < 0.18) this.fire();
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Body
    ctx.save();
    ctx.rotate(this.bodyAngle);
    // treads
    ctx.fillStyle = "#3a3f4b";
    ctx.fillRect(-this.r, -this.r - 3, this.r * 2, 6);
    ctx.fillRect(-this.r, this.r - 3, this.r * 2, 6);
    // hull
    ctx.fillStyle = this.color;
    roundRect(-this.r + 2, -this.r + 2, this.r * 2 - 4, this.r * 2 - 4, 4);
    ctx.fill();
    ctx.restore();

    // Turret
    ctx.save();
    ctx.rotate(this.turretAngle);
    ctx.fillStyle = "#1f2430";
    ctx.fillRect(0, -3.5, this.r + 12, 7);
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, TAU);
    ctx.fillStyle = shade(this.color, -25);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Health bar (enemies + damaged player)
    if (this.hp < this.maxHp) {
      const bw = 30;
      const pct = clamp(this.hp / this.maxHp, 0, 1);
      ctx.fillStyle = "#000";
      ctx.fillRect(this.x - bw / 2, this.y - this.r - 12, bw, 4);
      ctx.fillStyle = pct > 0.5 ? "#4ade80" : pct > 0.25 ? "#fbbf24" : "#f87171";
      ctx.fillRect(this.x - bw / 2, this.y - this.r - 12, bw * pct, 4);
    }
  }
}

class Bullet {
  constructor(x, y, angle, fromPlayer) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * 6.5;
    this.vy = Math.sin(angle) * 6.5;
    this.r = 4;
    this.fromPlayer = fromPlayer;
    this.dmg = fromPlayer ? 12 : 10;
    this.dead = false;
    this.life = 140;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;

    // Bounce off arena bounds once-ish via reflection, else die.
    if (this.x < this.r || this.x > W - this.r) {
      this.vx *= -1;
      this.x = clamp(this.x, this.r, W - this.r);
      this.life -= 30;
    }
    if (this.y < this.r || this.y > H - this.r) {
      this.vy *= -1;
      this.y = clamp(this.y, this.r, H - this.r);
      this.life -= 30;
    }

    for (const wl of state.walls) {
      if (
        this.x > wl.x - this.r &&
        this.x < wl.x + wl.w + this.r &&
        this.y > wl.y - this.r &&
        this.y < wl.y + wl.h + this.r
      ) {
        this.dead = true;
        spawnHit(this.x, this.y, "#9ca3af");
        break;
      }
    }
    if (this.life <= 0) this.dead = true;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, TAU);
    ctx.fillStyle = this.fromPlayer ? "#bbf7d0" : "#fecaca";
    ctx.shadowColor = this.fromPlayer ? "#4ade80" : "#f87171";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const a = rand(0, TAU);
    const s = rand(0.5, 4);
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s;
    this.life = rand(20, 45);
    this.maxLife = this.life;
    this.color = color;
    this.size = rand(2, 5);
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.92;
    this.vy *= 0.92;
    this.life--;
  }
  draw() {
    ctx.globalAlpha = clamp(this.life / this.maxLife, 0, 1);
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

class Pickup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.r = 11;
    this.type = type; // "health"
    this.life = 600;
    this.dead = false;
  }
  update() {
    this.life--;
    if (this.life <= 0) this.dead = true;
    const p = state.player;
    if (p && dist(this.x, this.y, p.x, p.y) < this.r + p.r) {
      if (this.type === "health") p.hp = clamp(p.hp + 35, 0, p.maxHp);
      spawnHit(this.x, this.y, "#4ade80");
      this.dead = true;
    }
  }
  draw() {
    const pulse = 1 + Math.sin(Date.now() / 200) * 0.12;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#16a34a";
    roundRect(-this.r, -this.r, this.r * 2, this.r * 2, 4);
    ctx.fill();
    ctx.fillStyle = "#bbf7d0";
    ctx.fillRect(-2.5, -7, 5, 14);
    ctx.fillRect(-7, -2.5, 14, 5);
    ctx.restore();
  }
}

// ---- Drawing helpers -----------------------------------------
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt;
  let g = ((n >> 8) & 0xff) + amt;
  let b = (n & 0xff) + amt;
  r = clamp(r, 0, 255);
  g = clamp(g, 0, 255);
  b = clamp(b, 0, 255);
  return `rgb(${r},${g},${b})`;
}

// ---- Effects -------------------------------------------------
function explode(x, y, color) {
  for (let i = 0; i < 26; i++) state.particles.push(new Particle(x, y, color));
  for (let i = 0; i < 12; i++) state.particles.push(new Particle(x, y, "#fbbf24"));
}
function spawnHit(x, y, color) {
  for (let i = 0; i < 7; i++) state.particles.push(new Particle(x, y, color));
}
function spawnMuzzle(x, y, angle) {
  for (let i = 0; i < 4; i++) {
    const p = new Particle(x, y, "#fde68a");
    p.vx = Math.cos(angle) * rand(1, 3) + p.vx * 0.3;
    p.vy = Math.sin(angle) * rand(1, 3) + p.vy * 0.3;
    p.life = 12;
    p.maxLife = 12;
    state.particles.push(p);
  }
}

// ---- Level / spawning ----------------------------------------
function buildWalls() {
  state.walls = [];
  const count = 3 + Math.min(state.level, 6);
  let tries = 0;
  while (state.walls.length < count && tries < 200) {
    tries++;
    const w = rand(60, 160);
    const h = rand(24, 90);
    const x = rand(40, W - 40 - w);
    const y = rand(40, H - 40 - h);
    // Keep the player's spawn area clear.
    if (x < W / 2 + 60 && x + w > W / 2 - 60 && y + h > H - 160) continue;
    state.walls.push({ x, y, w, h });
  }
}

function enemyCountForLevel() {
  return 2 + state.level;
}

function spawnEnemy() {
  let x, y, ok, tries = 0;
  do {
    x = rand(40, W - 40);
    y = rand(40, H - 200);
    ok = dist(x, y, state.player.x, state.player.y) > 220;
    if (ok) {
      const t = new Tank(x, y, false);
      ok = !t.hitsWall(x, y);
    }
    tries++;
  } while (!ok && tries < 60);
  const e = new Tank(x, y, false);
  // Scale enemy strength with level.
  e.maxHp = e.hp = 30 + (state.level - 1) * 8;
  e.speed = clamp(1.2 + state.level * 0.08, 1.2, 2.4);
  e.fireRate = clamp(70 - state.level * 4, 35, 70);
  state.enemies.push(e);
}

function startLevel() {
  buildWalls();
  state.bullets = [];
  state.particles = [];
  state.pickups = [];
  state.enemies = [];
  const total = enemyCountForLevel();
  // Start with a few; the rest trickle in.
  state.toSpawn = total;
  state.spawnTimer = 0;
  const initial = Math.min(3, total);
  for (let i = 0; i < initial; i++) {
    spawnEnemy();
    state.toSpawn--;
  }
}

// ---- Game flow -----------------------------------------------
function resetGame() {
  state.score = 0;
  state.level = 1;
  state.lives = 3;
  state.over = false;
  state.player = new Tank(W / 2, H - 70, true);
  startLevel();
  syncHUD();
}

function nextLevel() {
  state.level++;
  state.player.hp = clamp(state.player.hp + 25, 0, state.player.maxHp);
  startLevel();
  syncHUD();
  flashBanner(`LEVEL ${state.level}`);
}

function playerDied() {
  state.lives--;
  syncHUD();
  if (state.lives <= 0) {
    gameOver();
  } else {
    state.player = new Tank(W / 2, H - 70, true);
    flashBanner("LIFE LOST");
  }
}

function gameOver() {
  state.running = false;
  state.over = true;
  showOverlay(`
    <h1 style="color:#f87171">GAME OVER</h1>
    <p class="tagline">You reached level ${state.level}.</p>
    <p style="font-size:22px;margin-bottom:22px">Final Score: <b style="color:#4ade80">${state.score}</b></p>
    <button id="start-btn">Play Again</button>
  `);
}

let banner = { text: "", time: 0 };
function flashBanner(text) {
  banner = { text, time: 90 };
}

function togglePause() {
  if (!state.running || state.over) return;
  state.paused = !state.paused;
}

function syncHUD() {
  ui.score.textContent = state.score;
  ui.level.textContent = state.level;
  ui.lives.textContent = state.lives;
  const pct = state.player ? clamp(state.player.hp / state.player.maxHp, 0, 1) : 0;
  ui.health.style.width = pct * 100 + "%";
}

function showOverlay(html) {
  ui.overlay.classList.remove("hidden");
  ui.overlay.querySelector(".panel").innerHTML = html;
  const btn = document.getElementById("start-btn");
  if (btn) btn.addEventListener("click", beginGame);
}
function hideOverlay() {
  ui.overlay.classList.add("hidden");
}

function beginGame() {
  hideOverlay();
  resetGame();
  state.running = true;
  state.paused = false;
}

ui.startBtn.addEventListener("click", beginGame);

// ---- Collision resolution ------------------------------------
function handleBullets() {
  for (const b of state.bullets) {
    if (b.dead) continue;
    if (b.fromPlayer) {
      for (const e of state.enemies) {
        if (!e.dead && dist(b.x, b.y, e.x, e.y) < e.r + b.r) {
          e.damage(b.dmg);
          b.dead = true;
          spawnHit(b.x, b.y, "#fecaca");
          break;
        }
      }
    } else {
      const p = state.player;
      if (p && dist(b.x, b.y, p.x, p.y) < p.r + b.r) {
        p.damage(b.dmg);
        b.dead = true;
        spawnHit(b.x, b.y, "#fecaca");
        syncHUD();
      }
    }
  }
}

// ---- Main loop -----------------------------------------------
function update() {
  if (!state.running || state.paused) return;

  state.player.update();

  // Drip-feed remaining enemies into the arena.
  if (state.toSpawn > 0) {
    state.spawnTimer--;
    if (state.spawnTimer <= 0 && state.enemies.length < 5) {
      spawnEnemy();
      state.toSpawn--;
      state.spawnTimer = 120;
    }
  }

  for (const e of state.enemies) e.update();
  for (const b of state.bullets) b.update();
  for (const pt of state.particles) pt.update();
  for (const pk of state.pickups) pk.update();

  handleBullets();

  // Remove dead enemies, award score, maybe drop health.
  for (const e of state.enemies) {
    if (e.dead) {
      state.score += 100;
      if (Math.random() < 0.25) state.pickups.push(new Pickup(e.x, e.y, "health"));
    }
  }
  state.enemies = state.enemies.filter((e) => !e.dead);
  state.bullets = state.bullets.filter((b) => !b.dead);
  state.particles = state.particles.filter((p) => p.life > 0);
  state.pickups = state.pickups.filter((p) => !p.dead);

  syncHUD();

  // Player death
  if (state.player.dead) {
    playerDied();
    return;
  }

  // Level cleared
  if (state.enemies.length === 0 && state.toSpawn === 0) {
    nextLevel();
  }

  if (banner.time > 0) banner.time--;
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 45) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 45) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function drawWalls() {
  for (const wl of state.walls) {
    ctx.fillStyle = "#2b3140";
    roundRect(wl.x, wl.y, wl.w, wl.h, 5);
    ctx.fill();
    ctx.fillStyle = "#363d4f";
    roundRect(wl.x + 3, wl.y + 3, wl.w - 6, wl.h - 6, 4);
    ctx.fill();
  }
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  drawWalls();

  for (const pk of state.pickups) pk.draw();
  for (const pt of state.particles) pt.draw();
  for (const e of state.enemies) e.draw();
  if (state.player && !state.player.dead) state.player.draw();
  for (const b of state.bullets) b.draw();

  if (banner.time > 0) {
    ctx.globalAlpha = clamp(banner.time / 90, 0, 1);
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 46px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(banner.text, W / 2, H / 2);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  if (state.paused) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 40px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", W / 2, H / 2);
    ctx.font = "16px Segoe UI, sans-serif";
    ctx.fillText("Press P to resume", W / 2, H / 2 + 34);
    ctx.textAlign = "left";
  }
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

loop();
