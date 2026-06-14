# 🛡️ Tank Battle

A fast, top-down arena tank game that runs entirely in the browser — no build
step, no dependencies. Just open `index.html`.

![HTML5](https://img.shields.io/badge/HTML5-Canvas-orange) ![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

## ▶️ Play

Open `index.html` in any modern browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## 🎮 Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` / Arrows | Move the tank |
| Mouse | Aim the turret |
| Left Click / `Space` | Fire |
| `P` | Pause / resume |

Touch is supported too: drag to aim/move, tap-hold to fire.

## 🎯 Gameplay

- Clear every enemy tank to advance to the next level.
- Enemies get faster, tougher, and more numerous each level.
- Destroyed tanks sometimes drop a green health pack.
- You have **3 lives** and your health regenerates a little between levels.
- Score **+100** per kill — survive as long as you can.

## 🧱 Tech

- Single HTML5 `<canvas>`, plain JavaScript (`game.js`), and CSS.
- Features: simple enemy AI (chase + keep-distance + aimed fire), wall
  collisions, bullet wall-bounce, particle explosions, pickups, and a HUD.

## 📁 Files

```
index.html   # markup + HUD + start overlay
style.css    # styling
game.js      # game engine and logic
```

Enjoy the battle! 🔥
