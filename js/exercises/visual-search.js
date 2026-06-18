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

// Grid sizes by difficulty
const GRID_CONFIGS = {
  1: { total: 4, cols: 2 },
  2: { total: 9, cols: 3 },
  3: { total: 12, cols: 4 },
  4: { total: 16, cols: 4 },
  5: { total: 25, cols: 5 },
};

export default {
  id: 'visual-search',
  name: 'Recherche visuelle',
  category: 'attention',
  icon: '👁',
  isSequential: false,
  requiresSpecialInput: true,
  numpadExtras: [],

  getInputType() { return 'click'; },

  generate(difficulty) {
    const cfg = GRID_CONFIGS[difficulty] || GRID_CONFIGS[1];
    const { total } = cfg;

    const target = pick(TARGETS);
    const distractors = SYMBOL_MAP[target];

    // Place target at a random index
    const targetIndex = rand(0, total - 1);

    // Build cells array
    const cells = [];
    for (let i = 0; i < total; i++) {
      if (i === targetIndex) {
        cells.push(target);
      } else {
        // Pick distractor (allow repeats)
        cells.push(pick(distractors));
      }
    }

    return {
      question: `Trouvez : ${target}`,
      answer: String(targetIndex),
      extraData: { cells, targetIndex, target, cols: cfg.cols },
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
