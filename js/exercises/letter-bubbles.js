// letter-bubbles.js — Bulles de lettres
// Des lettres apparaissent dans des bulles dispersées ; il faut cliquer dessus
// le plus vite possible dans l'ordre alphabétique (ou inverse).

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Tire `count` lettres distinctes. Contiguës aux niveaux faibles, dispersées ensuite.
function pickLetters(count, scattered) {
  if (!scattered) {
    const start = rand(0, 26 - count);
    return ALPHABET.slice(start, start + count).split('');
  }
  const pool = ALPHABET.split('');
  const chosen = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen;
}

// Place des bulles sans chevauchement dans une zone (w × h).
function layoutPositions(count, areaW, areaH, diameter) {
  const positions = [];
  const minDist = diameter + 10;
  let attempts = 0;
  while (positions.length < count && attempts < 2000) {
    attempts++;
    const x = rand(0, areaW - diameter);
    const y = rand(0, areaH - diameter);
    const cx = x + diameter / 2;
    const cy = y + diameter / 2;
    const ok = positions.every((p) => {
      const dx = (p.x + diameter / 2) - cx;
      const dy = (p.y + diameter / 2) - cy;
      return Math.hypot(dx, dy) >= minDist;
    });
    if (ok) positions.push({ x, y });
  }
  // Repli : si on n'a pas tout placé (zone trop dense), on tolère un peu de chevauchement
  while (positions.length < count) {
    positions.push({ x: rand(0, areaW - diameter), y: rand(0, areaH - diameter) });
  }
  return positions;
}

const CONFIGS = {
  1: { count: 5, diameter: 66, scattered: false, directions: ['asc'] },
  2: { count: 5, diameter: 62, scattered: false, directions: ['asc', 'desc'] },
  3: { count: 6, diameter: 58, scattered: true,  directions: ['asc', 'desc'] },
  4: { count: 6, diameter: 54, scattered: true,  directions: ['asc', 'desc'] },
  5: { count: 7, diameter: 50, scattered: true,  directions: ['asc', 'desc'] },
};

const ROUNDS = 3;

export default {
  id: 'letter-bubbles',
  name: 'Bulles de lettres',
  category: 'attention',
  icon: '🫧',
  isSequential: true,
  requiresSpecialInput: false,
  numpadExtras: [],

  _timers: [],
  _keyHandler: null,

  getInputType() { return 'none'; },

  generate() { return { question: 'Bulles de lettres', answer: '' }; },
  validate(u, c) { return { correct: u === c }; },
  renderQuestion() {},

  startSequence(difficulty, onComplete) {
    this._timers = [];
    const cfg = CONFIGS[difficulty] || CONFIGS[1];
    const items = [];
    let roundNum = 0;

    const questionZone = document.getElementById('exercise-question-zone');
    const specialInput = document.getElementById('exercise-special-input');
    document.getElementById('numpad-area')?.classList.add('hidden');
    if (specialInput) { specialInput.classList.add('hidden'); specialInput.innerHTML = ''; }
    if (!questionZone) return;

    // État du round courant, accessible par le gestionnaire clavier.
    const current = { bubbleByLetter: {}, expected: [], expectedIndex: 0, errors: 0, locked: true, startTime: 0 };

    const handleSelect = (letter) => {
      if (current.locked) return;
      const expectedLetter = current.expected[current.expectedIndex];
      const bubble = current.bubbleByLetter[letter];
      if (!bubble || bubble.dataset.done === '1') return;

      if (letter === expectedLetter) {
        bubble.dataset.done = '1';
        bubble.style.background = '#22c55e';
        bubble.style.borderColor = '#86efac';
        bubble.style.color = '#fff';
        bubble.style.transform = 'scale(0.92)';
        current.expectedIndex++;
        if (current.expectedIndex >= current.expected.length) {
          finishRound();
        }
      } else {
        current.errors++;
        bubble.style.background = '#ef4444';
        bubble.style.borderColor = '#fca5a5';
        const t = setTimeout(() => {
          if (bubble.dataset.done !== '1') {
            bubble.style.background = '#1e293b';
            bubble.style.borderColor = '#475569';
          }
        }, 350);
        this._timers.push(t);
      }
    };

    const finishRound = () => {
      current.locked = true;
      const time_ms = Math.round(performance.now() - current.startTime);
      const correct = current.errors === 0;
      items.push({
        question: `${current.expected.length} bulles, ordre ${current.direction === 'asc' ? 'alphabétique' : 'inverse'}`,
        correctAnswer: current.expected.join(''),
        userAnswer: correct ? current.expected.join('') : `${current.errors} erreur(s)`,
        correct,
        partial: !correct,
        time_ms,
        difficulty,
      });

      const status = document.getElementById('lb-status');
      if (status) {
        status.textContent = correct
          ? `✓ Round réussi en ${(time_ms / 1000).toFixed(1)}s`
          : `Terminé — ${current.errors} erreur(s)`;
        status.style.color = correct ? '#22c55e' : '#f59e0b';
      }

      const t = setTimeout(startRound, 900);
      this._timers.push(t);
    };

    const startRound = () => {
      if (roundNum >= ROUNDS) {
        this.cleanup();
        onComplete(items);
        return;
      }
      roundNum++;

      const letters = pickLetters(cfg.count, cfg.scattered);
      const sorted = [...letters].sort();
      const direction = pick(cfg.directions);
      const expected = direction === 'asc' ? sorted : [...sorted].reverse();

      current.expected = expected;
      current.direction = direction;
      current.expectedIndex = 0;
      current.errors = 0;
      current.bubbleByLetter = {};
      current.locked = true;

      // En-tête : consigne + progression
      questionZone.innerHTML = `
        <div style="text-align:center;margin-bottom:8px;">
          <div style="font-size:1rem;font-weight:700;color:#e2e8f0;">
            Ordre ${direction === 'asc' ? 'alphabétique (A→Z)' : 'inverse (Z→A)'}
          </div>
          <div style="font-size:0.78rem;color:#94a3b8;margin-top:2px;">
            Round ${roundNum}/${ROUNDS} — cliquez vite et dans l'ordre
          </div>
          <div id="lb-status" style="font-size:0.82rem;min-height:1.1em;margin-top:4px;font-weight:600;"></div>
        </div>
      `;

      // Zone de jeu
      const areaW = Math.min(questionZone.clientWidth - 24, 340) || 320;
      const areaH = 300;
      const playArea = document.createElement('div');
      playArea.style.cssText = `position:relative;width:${areaW}px;height:${areaH}px;margin:0 auto;`;
      questionZone.appendChild(playArea);

      const positions = layoutPositions(cfg.count, areaW, areaH, cfg.diameter);

      letters.forEach((letter, i) => {
        const pos = positions[i];
        const bubble = document.createElement('button');
        bubble.type = 'button';
        bubble.textContent = letter;
        bubble.dataset.letter = letter;
        bubble.style.cssText = [
          'position:absolute',
          `left:${pos.x}px`, `top:${pos.y}px`,
          `width:${cfg.diameter}px`, `height:${cfg.diameter}px`,
          'border-radius:50%',
          'background:#1e293b', 'border:2px solid #475569', 'color:#e2e8f0',
          `font-size:${Math.round(cfg.diameter * 0.42)}px`, 'font-weight:800',
          'cursor:pointer', 'user-select:none', '-webkit-tap-highlight-color:transparent',
          'transition:background 0.12s,border-color 0.12s,transform 0.12s',
          'display:flex', 'align-items:center', 'justify-content:center',
        ].join(';');
        bubble.addEventListener('click', () => handleSelect(letter));
        playArea.appendChild(bubble);
        current.bubbleByLetter[letter] = bubble;
      });

      // Petit délai avant déverrouillage pour laisser le temps de visualiser
      const t = setTimeout(() => {
        current.locked = false;
        current.startTime = performance.now();
      }, 350);
      this._timers.push(t);
    };

    // Clavier physique : taper la lettre la sélectionne
    this._keyHandler = (e) => {
      if (/^[a-zA-Z]$/.test(e.key) && e.key.length === 1) {
        handleSelect(e.key.toUpperCase());
      }
    };
    document.addEventListener('keydown', this._keyHandler);

    startRound();
  },

  cleanup() {
    for (const t of this._timers) clearTimeout(t);
    this._timers = [];
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  },
};
