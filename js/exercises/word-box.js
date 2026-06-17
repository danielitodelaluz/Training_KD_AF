// word-box.js — Boîte à mots : trouvez le mot caché dans la grille

import { buildChoiceButtons } from '../ui.js';

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

// Realistic French letter distribution for filler
const FILLER = 'EEEEEEEAAAAIIIIOOOOUUURRRRNNNSSSSTTTTLLLLMMCCCDDPPPFVBGHJQ';

const WORDS_4 = ['CHAT', 'LUNE', 'VENT', 'PAIN', 'ROSE', 'BOIS', 'NUIT', 'MIEL', 'PIED', 'DENT',
  'LION', 'OURS', 'BASE', 'DAME', 'FOND', 'BRUN', 'MOTO', 'LAIT', 'TOIT', 'SAGE',
  'TOUR', 'PORT', 'PONT', 'RANG', 'PEUR', 'MORT', 'NOIX', 'FLAN', 'DRAP', 'CLOU'];

const WORDS_5 = ['AVION', 'RADAR', 'NUAGE', 'PLUME', 'CARTE', 'CRANE', 'FRONT', 'OLIVE',
  'GLOBE', 'CIBLE', 'FLEUR', 'VERRE', 'TABLE', 'CHAMP', 'FORET', 'ECLAT',
  'PALME', 'TIGRE', 'CABLE', 'DELTA', 'PISTE', 'ARBRE', 'BRISE', 'ORAGE',
  'CARPE', 'BLANC', 'BERGE', 'ETANG', 'LANCE', 'TRAME'];

const WORDS_6 = ['PILOTE', 'RAPIDE', 'ORANGE', 'JARDIN', 'DESERT', 'CERISE', 'GIRAFE', 'MARCHE',
  'TOMATE', 'BALCON', 'RACINE', 'RADEAU', 'BROCHE', 'VERGER', 'CHEMIN', 'BARQUE',
  'CLOCHE', 'TRUITE', 'SOLEIL', 'FUSEAU'];

const WORDS_7 = ['MACHINE', 'COURAGE', 'JOURNAL', 'SERPENT', 'FROMAGE', 'MOUETTE', 'CABINET',
  'SILENCE', 'SPIRALE', 'PARFAIT', 'REVOLTE', 'COLOMBE', 'BARRAGE', 'PLATEAU',
  'TORNADE', 'BROUSSE', 'CIRCUIT', 'NACELLE', 'ROULEAU', 'COULEUR', 'LECTURE'];

// Direction vectors: [dr, dc]
const DIR_H  = [0, 1];
const DIR_V  = [1, 0];
const DIR_DR = [1, 1];
const DIR_DL = [1, -1];
const DIR_HL = [0, -1];
const DIR_VU = [-1, 0];
const DIR_UR = [-1, 1];
const DIR_UL = [-1, -1];

const DIR_NAMES = {
  '0,1': 'horizontalement →', '1,0': 'verticalement ↓',
  '1,1': 'diagonale ↘', '1,-1': 'diagonale ↙',
  '0,-1': 'horizontalement ←', '-1,0': 'verticalement ↑',
  '-1,1': 'diagonale ↗', '-1,-1': 'diagonale ↖',
};

const CONFIGS = {
  1: { rows: 5, cols: 5, pool: WORDS_4, directions: [DIR_H], cellSize: 40 },
  2: { rows: 6, cols: 6, pool: [...WORDS_4, ...WORDS_5], directions: [DIR_H, DIR_V], cellSize: 36 },
  3: { rows: 7, cols: 7, pool: [...WORDS_5, ...WORDS_6], directions: [DIR_H, DIR_V, DIR_DR, DIR_DL], cellSize: 30 },
  4: { rows: 7, cols: 7, pool: WORDS_6, directions: [DIR_H, DIR_V, DIR_DR, DIR_DL, DIR_HL, DIR_VU], cellSize: 30 },
  5: { rows: 8, cols: 7, pool: WORDS_7, directions: [DIR_H, DIR_V, DIR_DR, DIR_DL, DIR_HL, DIR_VU, DIR_UR, DIR_UL], cellSize: 28 },
};

function createGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(''));
}

function placeWord(grid, word, direction) {
  const rows = grid.length, cols = grid[0].length;
  const W = word.length;
  const [dr, dc] = direction;
  const valid = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let fits = true;
      for (let k = 0; k < W; k++) {
        const nr = r + k * dr, nc = c + k * dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols ||
            (grid[nr][nc] !== '' && grid[nr][nc] !== word[k])) {
          fits = false; break;
        }
      }
      if (fits) valid.push([r, c]);
    }
  }
  if (!valid.length) return null;
  const [sr, sc] = valid[rand(0, valid.length - 1)];
  const path = [];
  for (let k = 0; k < W; k++) {
    grid[sr + k * dr][sc + k * dc] = word[k];
    path.push([sr + k * dr, sc + k * dc]);
  }
  return { start: [sr, sc], dir: direction, path };
}

function fillGrid(grid) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!grid[r][c]) grid[r][c] = FILLER[rand(0, FILLER.length - 1)];
    }
  }
}

function wordInGrid(grid, word, directions) {
  const rows = grid.length, cols = grid[0].length, W = word.length;
  for (const [dr, dc] of directions) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let ok = true;
        for (let k = 0; k < W; k++) {
          const nr = r + k * dr, nc = c + k * dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] !== word[k]) {
            ok = false; break;
          }
        }
        if (ok) return true;
      }
    }
  }
  return false;
}

function filterByLength(pool, targetLength) {
  const byLen = pool.filter(w => w.length === targetLength);
  return byLen.length >= 3 ? byLen : pool;
}

export default {
  id: 'word-box',
  name: 'Boîte à mots',
  category: 'lettres',
  icon: '🔍',
  isSequential: false,
  requiresSpecialInput: true,
  numpadExtras: [],

  getInputType() { return 'choice'; },

  generate(difficulty) {
    const cfg = CONFIGS[Math.min(difficulty, 5)];
    const { rows, cols, pool, directions, cellSize } = cfg;

    // Pick 3 words of similar length
    const shuffledPool = shuffle(pool);
    const targetWord = shuffledPool[0];
    const sameLen = filterByLength(pool, targetWord.length);
    const candidates = shuffle(sameLen).slice(0, 3);
    // Ensure we have 3 distinct candidates
    while (candidates.length < 3) candidates.push(shuffledPool[candidates.length]);

    const hiddenIdx = rand(0, 2);
    const hiddenWord = candidates[hiddenIdx];
    const answer = String.fromCharCode(65 + hiddenIdx);

    // Generate grid, retry if distractors accidentally appear
    let grid = createGrid(rows, cols);
    let placement = null;
    let attempts = 0;
    do {
      grid = createGrid(rows, cols);
      const dir = pick(directions);
      placement = placeWord(grid, hiddenWord, dir);
      if (placement) {
        fillGrid(grid);
        const others = candidates.filter((_, i) => i !== hiddenIdx);
        if (!wordInGrid(grid, others[0], directions) && !wordInGrid(grid, others[1], directions)) break;
      }
      attempts++;
    } while (attempts < 20);

    return {
      question: 'Quel mot est caché dans la grille ?',
      answer,
      extraData: { grid, words: candidates, hiddenIdx, placement, cellSize },
    };
  },

  validate(userAnswer, correctAnswer) {
    return { correct: userAnswer.toUpperCase() === correctAnswer.toUpperCase() };
  },

  renderQuestion(container, item, ctx) {
    const { grid, words, cellSize } = item.extraData;
    container.innerHTML = '';

    const label = document.createElement('div');
    label.className = 'question-label';
    label.textContent = 'Quel mot est caché dans la grille ?';
    container.appendChild(label);

    const gridEl = document.createElement('div');
    gridEl.className = 'wordbox-grid';

    for (const row of grid) {
      const rowEl = document.createElement('div');
      rowEl.className = 'wordbox-row';
      for (const letter of row) {
        const cell = document.createElement('span');
        cell.className = 'wordbox-cell';
        cell.textContent = letter;
        cell.style.cssText = `width:${cellSize}px;height:${cellSize}px;font-size:${Math.round(cellSize * 0.45)}px;`;
        rowEl.appendChild(cell);
      }
      gridEl.appendChild(rowEl);
    }
    container.appendChild(gridEl);

    buildChoiceButtons(ctx.special, words.map((w, i) => ({
      label: `${['A', 'B', 'C'][i]} — ${w}`,
      value: String.fromCharCode(65 + i),
      className: 'btn-abcd',
    })), ctx.onAnswer);
  },

  getHint(item, userAnswer) {
    const { hiddenIdx, words, placement } = item.extraData;
    const correct = String.fromCharCode(65 + hiddenIdx);
    const word = words[hiddenIdx];
    if (!placement) return `Le mot caché était : "${word}" (option ${correct})`;
    const [r, c] = placement.start;
    const [dr, dc] = placement.dir;
    const dirName = DIR_NAMES[`${dr},${dc}`] || 'dans la grille';
    return `"${word}" (option ${correct}) : ligne ${r + 1}, colonne ${c + 1}, ${dirName}`;
  },

  keyHandler(e, submitFn) {
    const k = e.key.toUpperCase();
    if (k === 'A') submitFn('A');
    else if (k === 'B') submitFn('B');
    else if (k === 'C') submitFn('C');
  },
};
