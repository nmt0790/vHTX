// World Cup 2026 winner predictor — Monte Carlo group + knockout simulation.

const NUM_GROUPS = 12;
const TEAMS_PER_GROUP = 4;
const DRAW_PROBABILITY = 0.24; // group-stage draws only; knockout always has a winner

function eloWinProb(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 16));
}

function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Seeded draw: sort by rating into 4 pots, snake-draft one team per group from each pot.
function drawGroups(teams) {
  const sorted = teams.slice().sort((a, b) => b.rating - a.rating);
  const pots = [[], [], [], []];
  for (let i = 0; i < sorted.length; i++) {
    pots[Math.floor(i / NUM_GROUPS)].push(sorted[i]);
  }
  pots.forEach((pot) => pot.sort(() => Math.random() - 0.5));

  const groups = Array.from({ length: NUM_GROUPS }, () => []);
  pots.forEach((pot) => {
    pot.forEach((team, idx) => groups[idx % NUM_GROUPS].push(team));
  });
  return groups;
}

function playMatch(teamA, teamB) {
  const pWinA = eloWinProb(teamA.rating, teamB.rating);
  const r = Math.random();
  if (r < DRAW_PROBABILITY) return null; // draw
  // rescale remaining probability mass between A and B
  const adjusted = (r - DRAW_PROBABILITY) / (1 - DRAW_PROBABILITY);
  return adjusted < pWinA ? teamA : teamB;
}

function playKnockoutMatch(teamA, teamB) {
  const pWinA = eloWinProb(teamA.rating, teamB.rating);
  return Math.random() < pWinA ? teamA : teamB;
}

function simulateGroup(group) {
  const stats = new Map(group.map((t) => [t.name, { team: t, pts: 0, gd: 0 }]));
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const winner = playMatch(group[i], group[j]);
      const margin = 1 + Math.floor(Math.random() * 2);
      if (winner === null) {
        stats.get(group[i].name).pts += 1;
        stats.get(group[j].name).pts += 1;
      } else {
        const loser = winner === group[i] ? group[j] : group[i];
        stats.get(winner.name).pts += 3;
        stats.get(winner.name).gd += margin;
        stats.get(loser.name).gd -= margin;
      }
    }
  }
  const ranked = Array.from(stats.values()).sort((a, b) => b.pts - a.pts || b.gd - a.gd || Math.random() - 0.5);
  return ranked; // [1st, 2nd, 3rd, 4th]
}

function runSingleSimulation(teams) {
  const groups = drawGroups(teams);
  const firsts = [];
  const seconds = [];
  const thirds = [];

  groups.forEach((group) => {
    const ranked = simulateGroup(group);
    firsts.push(ranked[0].team);
    seconds.push(ranked[1].team);
    thirds.push(ranked[2].team);
  });

  // Best 8 of the 12 third-placed teams advance alongside the 24 group winners/runners-up.
  thirds.sort((a, b) => b.rating - a.rating);
  const bestThirds = thirds.slice(0, 8);

  let bracket = shuffle([...firsts, ...seconds, ...bestThirds]);
  // bracket now has 32 teams for Round of 32.

  let round = bracket;
  while (round.length > 1) {
    const next = [];
    for (let i = 0; i < round.length; i += 2) {
      next.push(playKnockoutMatch(round[i], round[i + 1]));
    }
    round = next;
  }
  return round[0]; // champion
}

function runMonteCarlo(teams, iterations, onProgress) {
  const counts = new Map(teams.map((t) => [t.name, 0]));
  const chunkSize = 200;
  let done = 0;

  return new Promise((resolve) => {
    function step() {
      const end = Math.min(done + chunkSize, iterations);
      for (; done < end; done++) {
        const champion = runSingleSimulation(teams);
        counts.set(champion.name, counts.get(champion.name) + 1);
      }
      if (onProgress) onProgress(done, iterations);
      if (done < iterations) {
        setTimeout(step, 0);
      } else {
        resolve(counts);
      }
    }
    step();
  });
}

// ---- UI wiring ----

const runBtn = document.getElementById("run-btn");
const iterationsInput = document.getElementById("iterations");
const progressEl = document.getElementById("progress");
const resultsEl = document.getElementById("results");
const bracketBtn = document.getElementById("bracket-btn");
const bracketEl = document.getElementById("bracket-result");

function renderResults(counts, iterations) {
  const rows = Array.from(counts.entries())
    .map(([name, count]) => ({
      team: TEAMS.find((t) => t.name === name),
      count,
      pct: (count / iterations) * 100,
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  resultsEl.innerHTML = rows
    .map(
      (r, i) => `
      <div class="result-row${i === 0 ? " top" : ""}">
        <span class="rank">${i + 1}</span>
        <span class="flag">${r.team.flag}</span>
        <span class="name">${r.team.name}</span>
        <div class="bar-track"><div class="bar" style="width:${Math.max(r.pct, 1)}%"></div></div>
        <span class="pct">${r.pct.toFixed(1)}%</span>
      </div>`
    )
    .join("");
}

runBtn.addEventListener("click", async () => {
  const iterations = Math.min(Math.max(parseInt(iterationsInput.value, 10) || 1000, 100), 20000);
  runBtn.disabled = true;
  runBtn.textContent = "Simulating...";
  progressEl.textContent = "";

  const counts = await runMonteCarlo(TEAMS, iterations, (done, total) => {
    progressEl.textContent = `${done.toLocaleString()} / ${total.toLocaleString()} tournaments simulated`;
  });

  renderResults(counts, iterations);
  runBtn.disabled = false;
  runBtn.textContent = "Run Simulation";
  progressEl.textContent = `Done — ${iterations.toLocaleString()} tournaments simulated.`;
});

bracketBtn.addEventListener("click", () => {
  const champion = runSingleSimulation(TEAMS);
  bracketEl.innerHTML = `🏆 <strong>${champion.flag} ${champion.name}</strong> wins the World Cup 2026! (single simulated run)`;
});
