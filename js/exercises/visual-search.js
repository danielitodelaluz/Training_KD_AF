// visual-search.js — Recherche visuelle

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const SYMBOL_MAP = {
  'E': ['F', 'H', 'L', '3'],
  'O': ['0', 'Q', 'G', 'D'],
  '8': ['B', '6', '3', 'S'],
  'T': ['Y', 'I', '7', 'F'],
  'R': ['P', 'B', 'F', 'K'],
  'M': ['N', 'H', 'W', 'm'],
  'X': ['K', 'Y', '×', 'x'],
  '4': ['A', 'H', 'Y', '9'],
};

const TARGETS = Object.keys(SYMBOL_MAP);

// Tailles de grille par réglage
const GRID_SIZES = {
  4: { total: 4, cols: 2 },
  9: { total: 9, cols: 3 },
  16: { total: 16, cols: 4 },
  25: { total: 25, cols: 5 },
};

export default {
  id: 'visual-search',
  name: 'Recherche visuelle',
  category: 'attention',
  icon: '👁',
  isSequential: false,
  requiresSpecialInput: true,
  numpadExtras: [],

  configSpec: {
    intro: 'Repérez la cible parmi les distracteurs',
    params: [
      { id: 'size', label: 'Grille', type: 'chips', def: 9,
        options: [{ v: 4, l: '4' }, { v: 9, l: '9' }, { v: 16, l: '16' }, { v: 25, l: '25' }] },
      { id: 'similar', label: 'Distracteurs', type: 'chips', def: 'similar',
        note: 'Ressemblants = cible plus dure à repérer',
        options: [{ v: 'mixed', l: 'Variés' }, { v: 'similar', l: 'Ressemblants' }] },
    ],
  },

  getInputType() { return 'click'; },

  generate(params) {
    const cfg = GRID_SIZES[params.size] ?? GRID_SIZES[9];
    const { total, cols } = cfg;

    const target = pick(TARGETS);
    // "Ressemblants" : distracteurs proches de la cible ; "Variés" : n'importe
    // quel symbole du jeu, cible mieux détachée.
    const distractors = params.similar === 'mixed'
      ? TARGETS.filter((t) => t !== target)
      : SYMBOL_MAP[target];

    const targetIndex = rand(0, total - 1);
    const cells = [];
    for (let i = 0; i < total; i++) {
      cells.push(i === targetIndex ? target : pick(distractors));
    }

    return {
      question: `Trouvez : ${target}`,
      answer: String(targetIndex),
      extraData: { cells, targetIndex, target, cols },
    };
  },

  validate(userAnswer, correctAnswer) {
    return { correct: parseInt(userAnswer, 10) === parseInt(correctAnswer, 10) };
  },

  renderQuestion(container, item, ctx) {
    const { cells, target, cols } = item.extraData;

    // Show hint in main container
    container.innerHTML = '';
    const hintEl = document.createElement('div');
    hintEl.className = 'question-display';
    hintEl.style.cssText = 'text-align:center;font-size:1.1rem;margin-bottom:8px;';
    hintEl.textContent = `Cible : `;

    const targetSpan = document.createElement('span');
    targetSpan.style.cssText = 'font-size:1.6rem;font-weight:900;color:#6366f1;';
    targetSpan.textContent = target;
    hintEl.appendChild(targetSpan);
    container.appendChild(hintEl);

    // Build search grid in ctx.special
    if (!ctx || !ctx.special) return;
    ctx.special.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'search-grid';
    grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:6px;max-width:${cols * 56 + (cols - 1) * 6}px;margin:0 auto;`;

    cells.forEach((symbol, idx) => {
      const cell = document.createElement('div');
      cell.className = 'search-cell';
      cell.style.cssText = [
        'width:50px;height:50px;border-radius:8px;',
        'background:#1e293b;border:2px solid #334155;',
        'display:flex;align-items:center;justify-content:center;',
        'font-size:1.4rem;font-weight:700;color:#e2e8f0;',
        'cursor:pointer;user-select:none;',
        'transition:background 0.1s,border-color 0.1s;',
      ].join('');
      cell.textContent = symbol;
      cell.dataset.index = String(idx);

      cell.addEventListener('mouseenter', () => {
        cell.style.background = '#334155';
        cell.style.borderColor = '#6366f1';
      });
      cell.addEventListener('mouseleave', () => {
        cell.style.background = '#1e293b';
        cell.style.borderColor = '#334155';
      });
      cell.addEventListener('click', () => {
        if (ctx.onAnswer) ctx.onAnswer(String(idx));
      });

      grid.appendChild(cell);
    });

    ctx.special.appendChild(grid);
  },

  keyHandler(_e, _submitFn) {
    // Click-based, no key handler needed
  },
};
