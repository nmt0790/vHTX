# World Cup 2026 Predictor

A static web app that predicts the most likely World Cup 2026 champion using a Monte Carlo simulation.

## How it works

- `data.js` — 48 teams with an estimated strength rating.
- `app.js` — for each simulated tournament:
  1. Draws 12 groups of 4 (seeded by pot, like the real draw).
  2. Plays a round-robin group stage (win/draw/loss probabilities derived from an Elo-style formula).
  3. Advances the 24 group winners/runners-up plus the best 8 third-placed teams to a 32-team knockout bracket.
  4. Simulates the knockout rounds down to a champion.
- Running thousands of simulations produces a championship-probability ranking.

## Usage

Open `index.html` in a browser (or serve the folder with any static file server):

```bash
cd wc2026-predictor
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

- **Run Simulation** — runs N full tournaments (default 2000) and shows win-probability rankings.
- **Simulate One Tournament** — plays out a single random tournament and reveals the champion.

Ratings are rough estimates for entertainment purposes, not an official forecast.
