// marbles.js — Billes dans les tubes
// 3 tubes : T1 (3 emplacements) | T2 (2 emplacements) | T3 (3 emplacements)
// Billes numérotées et colorées, empilées de bas en haut.
// Présente état initial et état cible ; trouver le minimum de mouvements.
// Mode interactif : déplacer soi-même les billes d'un tube à l'autre.

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Tube capacities T1, T2, T3
const CAPS = [3, 2, 3];

// Each marble: its background color (marble 0 → color 0, etc.)
const MARBLE_BG = ['#dc2626', '#2563eb', '#ca8a04', '#16a34a', '#9333ea'];

// ── State helpers ────────────────────────────────────────────────────────────

// tubes = [[marbleIds bottom→top], [tube2], [tube3]]
// marbleId = integer 0..numMarbles-1
function serializeState(tubes) {
  return tubes.map(t => t.join(',')).join('|');
}

// BFS: find min moves and solution path from start → target
// Returns { moves: int, path: [{from,to,marble}] } or { moves:-1 } if unreachable
function bfs(start, target) {
  const startKey = serializeState(start);
  const targetKey = serializeState(target);
  if (startKey === targetKey) return { moves: 0, path: [] };

  const queue = [{ tubes: start.map(t => [...t]), path: [] }];
  const visited = new Set([startKey]);

  while (queue.length) {
    const { tubes, path } = queue.shift();
    if (path.length >= 14) continue; // safety depth cap

    for (let from = 0; from < 3; from++) {
      if (!tubes[from].length) continue;
      for (let to = 0; to < 3; to++) {
        if (from === to || tubes[to].length >= CAPS[to]) continue;
        const next = tubes.map(t => [...t]);
        const marble = next[from].pop();
        next[to].push(marble);
        const key = serializeState(next);
        const newPath = [...path, { from, to, marble }];
        if (key === targetKey) return { moves: newPath.length, path: newPath };
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ tubes: next, path: newPath });
        }
      }
    }
  }
  return { moves: -1, path: [] };
}

// Random valid distribution of numMarbles distinct marbles across 3 tubes
function randomDistribution(numMarbles) {
  const ids = shuffle(Array.from({ length: numMarbles }, (_, i) => i));
  const tubes = [[], [], []];
  let idx = 0;
  // Give each tube at least a chance at marbles, then fill overflow
  for (let t = 0; t < 3 && idx < numMarbles; t++) {
    const remaining = numMarbles - idx;
    const maxHere = Math.min(CAPS[t], remaining);
    // Don't dump everything in tube 0
    const n = (t < 2) ? rand(0, maxHere) : maxHere;
    tubes[t] = ids.slice(idx, idx + n);
    idx += n;
  }
  // Place any remaining marbles
  while (idx < numMarbles) {
    for (let t = 0; t < 3 && idx < numMarbles; t++) {
      if (tubes[t].length < CAPS[t]) tubes[t].push(ids[idx++]);
    }
  }
  return tubes;
}

// Apply n random valid moves to tubes (in-place copy)
function applyRandomMoves(tubes, n) {
  const t = tubes.map(x => [...x]);
  for (let i = 0; i < n; i++) {
    const moves = [];
    for (let f = 0; f < 3; f++) {
      if (!t[f].length) continue;
      for (let to = 0; to < 3; to++) {
        if (f !== to && t[to].length < CAPS[to]) moves.push([f, to]);
      }
    }
    if (!moves.length) break;
    const [f, to] = pick(moves);
    t[to].push(t[f].pop());
  }
  return t;
}

// ── Rendering helpers ────────────────────────────────────────────────────────

// Build a marble element (circle with number)
function makeBallEl(marbleId, size) {
  const el = document.createElement('div');
  el.className = 'mrb-ball';
  el.style.width = el.style.height = size + 'px';
  el.style.background = MARBLE_BG[marbleId];
  el.style.fontSize = Math.round(size * 0.42) + 'px';
  el.textContent = marbleId + 1;
  return el;
}

// Render a static (non-interactive) view of 3 tubes
function buildStaticTubes(tubes, slotSize) {
  const row = document.createElement('div');
  row.className = 'mrb-tube-row';
  tubes.forEach((tube, ti) => {
    const col = document.createElement('div');
    col.className = 'mrb-tube-col';

    const lbl = document.createElement('div');
    lbl.className = 'mrb-tube-lbl';
    lbl.textContent = `T${ti + 1}`;
    col.appendChild(lbl);

    const tubeEl = document.createElement('div');
    tubeEl.className = 'mrb-tube';
    tubeEl.style.setProperty('--slot-size', slotSize + 'px');

    // Slots top→bottom visually: slot at index cap-1 is top
    for (let slot = CAPS[ti] - 1; slot >= 0; slot--) {
      const slotEl = document.createElement('div');
      slotEl.className = 'mrb-slot';
      const marbleId = tube[slot];
      if (marbleId !== undefined) slotEl.appendChild(makeBallEl(marbleId, slotSize - 6));
      tubeEl.appendChild(slotEl);
    }
    col.appendChild(tubeEl);
    row.appendChild(col);
  });
  return row;
}

// ── Interactive sandbox ──────────────────────────────────────────────────────

function buildSandbox(container, startTubes, targetTubes) {
  container.innerHTML = '';

  const tubes = startTubes.map(t => [...t]);
  let selected = -1;
  let moveCount = 0;
  const targetKey = serializeState(targetTubes);
  const slotSize = 42;

  // Status line
  const statusEl = document.createElement('div');
  statusEl.className = 'mrb-sandbox-status';
  container.appendChild(statusEl);

  // Tube rows
  const tubeRowEl = document.createElement('div');
  tubeRowEl.className = 'mrb-tube-row mrb-tube-row--sandbox';
  container.appendChild(tubeRowEl);

  // Move counter + reset
  const footEl = document.createElement('div');
  footEl.className = 'mrb-sandbox-foot';
  footEl.innerHTML = `
    <span id="mrb-moves" class="mrb-move-count">0 mouvement</span>
    <button class="mrb-ctrl-btn" id="mrb-reset-btn">🔄 Réinitialiser</button>
  `;
  container.appendChild(footEl);

  document.getElementById('mrb-reset-btn').addEventListener('click', () => {
    tubes[0] = [...startTubes[0]];
    tubes[1] = [...startTubes[1]];
    tubes[2] = [...startTubes[2]];
    selected = -1;
    moveCount = 0;
    statusEl.textContent = '';
    statusEl.className = 'mrb-sandbox-status';
    redraw();
  });

  const redraw = () => {
    tubeRowEl.innerHTML = '';
    const movesEl = document.getElementById('mrb-moves');
    if (movesEl) movesEl.textContent = `${moveCount} mouvement${moveCount !== 1 ? 's' : ''}`;

    tubes.forEach((tube, ti) => {
      const col = document.createElement('div');
      col.className = 'mrb-tube-col';

      const lbl = document.createElement('div');
      lbl.className = 'mrb-tube-lbl';
      lbl.textContent = `T${ti + 1}`;
      col.appendChild(lbl);

      const tubeEl = document.createElement('div');
      tubeEl.className = 'mrb-tube mrb-tube--interactive';
      tubeEl.style.setProperty('--slot-size', slotSize + 'px');

      if (selected === ti) tubeEl.classList.add('mrb-tube--selected');
      else if (selected !== -1 && tubes[selected].length > 0 && tube.length < CAPS[ti]) {
        tubeEl.classList.add('mrb-tube--valid');
      }

      for (let slot = CAPS[ti] - 1; slot >= 0; slot--) {
        const slotEl = document.createElement('div');
        slotEl.className = 'mrb-slot';
        const marbleId = tube[slot];
        if (marbleId !== undefined) {
          const ball = makeBallEl(marbleId, slotSize - 6);
          // Top marble of selected tube floats up
          if (slot === tube.length - 1 && selected === ti) ball.classList.add('mrb-ball--lifted');
          slotEl.appendChild(ball);
        }
        tubeEl.appendChild(slotEl);
      }

      tubeEl.addEventListener('click', () => handleClick(ti));
      col.appendChild(tubeEl);
      tubeRowEl.appendChild(col);
    });
  };

  const handleClick = (ti) => {
    if (selected === -1) {
      // Select tube if it has marbles
      if (tubes[ti].length > 0) { selected = ti; redraw(); }
    } else if (selected === ti) {
      // Deselect
      selected = -1; redraw();
    } else {
      // Try to move marble
      if (tubes[ti].length >= CAPS[ti]) {
        statusEl.textContent = '⛔ Tube T' + (ti + 1) + ' est plein !';
        statusEl.className = 'mrb-sandbox-status mrb-sandbox-status--err';
        const prev = selected; selected = -1; redraw(); selected = prev;
        setTimeout(() => { statusEl.textContent = ''; redraw(); }, 900);
        return;
      }
      tubes[ti].push(tubes[selected].pop());
      moveCount++;
      selected = -1;
      redraw();

      if (serializeState(tubes) === targetKey) {
        statusEl.textContent = `🎉 Résolu en ${moveCount} mouvement${moveCount !== 1 ? 's' : ''} !`;
        statusEl.className = 'mrb-sandbox-status mrb-sandbox-status--ok';
      } else {
        statusEl.textContent = '';
        statusEl.className = 'mrb-sandbox-status';
      }
    }
  };

  redraw();
}

// ── Exercise export ──────────────────────────────────────────────────────────

export default {
  id: 'marbles',
  name: 'Billes dans les tubes',
  category: 'logique',
  icon: '🔮',
  isSequential: false,
  requiresSpecialInput: false,
  numpadExtras: [],

  getInputType() { return 'numeric'; },

  generate(difficulty) {
    const numMarbles = difficulty <= 2 ? 4 : 5;
    const targetMoves = [1, 2, 3, 4, 5][difficulty - 1] || 3;

    for (let attempt = 0; attempt < 250; attempt++) {
      const startTubes = randomDistribution(numMarbles);
      const rawMoves = targetMoves + rand(0, Math.min(2, numMarbles - 2));
      const targetTubes = applyRandomMoves(startTubes, rawMoves);

      if (serializeState(startTubes) === serializeState(targetTubes)) continue;

      const { moves: minMoves, path } = bfs(startTubes, targetTubes);
      if (minMoves >= targetMoves - 1 && minMoves <= targetMoves + 1 && minMoves > 0) {
        return {
          question: 'Combien de mouvements minimum pour passer de l\'état initial à l\'état cible ?',
          answer: String(minMoves),
          extraData: { startTubes, targetTubes, minMoves, numMarbles, path },
        };
      }
    }

    // Guaranteed 1-move fallback
    const s = [[0, 1], [2, 3], []];
    const t = [[0], [2, 3], [1]];
    return {
      question: 'Combien de mouvements minimum ?',
      answer: '1',
      extraData: { startTubes: s, targetTubes: t, minMoves: 1, numMarbles: 4, path: [{ from: 0, to: 2, marble: 1 }] },
    };
  },

  validate(userAnswer, correctAnswer) {
    return { correct: String(userAnswer).trim() === String(correctAnswer).trim() };
  },

  renderQuestion(container, item) {
    const { startTubes, targetTubes } = item.extraData;
    container.innerHTML = '';

    // ── Static display: initial ──▶ target ─────────────────────────────────
    const stateRow = document.createElement('div');
    stateRow.className = 'mrb-state-row';

    const buildStatePanel = (tubes, label) => {
      const panel = document.createElement('div');
      panel.className = 'mrb-state-panel';
      const lbl = document.createElement('div');
      lbl.className = 'mrb-state-lbl';
      lbl.textContent = label;
      panel.appendChild(lbl);
      panel.appendChild(buildStaticTubes(tubes, 30));
      return panel;
    };

    stateRow.appendChild(buildStatePanel(startTubes, 'État initial'));

    const arrow = document.createElement('div');
    arrow.className = 'mrb-arrow';
    arrow.textContent = '→';
    stateRow.appendChild(arrow);

    stateRow.appendChild(buildStatePanel(targetTubes, 'État cible'));
    container.appendChild(stateRow);

    // ── Question label ──────────────────────────────────────────────────────
    const qLbl = document.createElement('div');
    qLbl.className = 'mrb-q-label';
    qLbl.textContent = 'Nombre minimum de mouvements ?';
    container.appendChild(qLbl);

    // ── Interactive sandbox ─────────────────────────────────────────────────
    const sandboxSection = document.createElement('div');
    sandboxSection.className = 'mrb-sandbox-section';

    const sandboxTitle = document.createElement('div');
    sandboxTitle.className = 'mrb-sandbox-title';
    sandboxTitle.textContent = 'Essayez vous-même';
    sandboxSection.appendChild(sandboxTitle);

    const sandboxBody = document.createElement('div');
    sandboxSection.appendChild(sandboxBody);
    buildSandbox(sandboxBody, startTubes, targetTubes);

    container.appendChild(sandboxSection);
  },

  getHint(item) {
    const { minMoves, path } = item.extraData;
    if (!path || !path.length) return `La réponse est ${minMoves} mouvement${minMoves > 1 ? 's' : ''}.`;
    const steps = path.map((s, i) => `${i + 1}. T${s.from + 1}→T${s.to + 1}`).join(' · ');
    return `Minimum : ${minMoves} mouvement${minMoves > 1 ? 's' : ''}. Solution optimale : ${steps}`;
  },

  keyHandler(e, submitFn) {
    if (/^[1-9]$/.test(e.key)) submitFn(e.key);
  },
};
