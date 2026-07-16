// letter-bubbles.js — Bulles de lettres
// Des lettres apparaissent dans des bulles dispersées ; il faut cliquer dessus
// le plus vite possible dans l'ordre demandé (alphabétique ou inverse).
// Réglages : sens, espacement des lettres (proches = plus difficile),
// nombre de bulles, nombre de rounds.

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Tire `count` lettres distinctes selon le mode d'espacement.
//  near : lettres contiguës dans l'alphabet (ordre difficile à trancher vite)
//  far  : lettres séparées d'au moins 3 positions (ordre plus évident)
//  mix  : tirage totalement aléatoire
function pickLetters(count, spacing) {
  if (spacing === 'near') {
    const start = rand(0, 26 - count);
    return ALPHABET.slice(start, start + count).split('');
  }
  if (spacing === 'far') {
    for (let attempt = 0; attempt < 300; attempt++) {
      const pool = ALPHABET.split('');
      const chosen = [];
      for (let i = 0; i < count; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        chosen.push(pool.splice(idx, 1)[0]);
      }
      const sorted = chosen.map((l) => ALPHABET.indexOf(l)).sort((a, b) => a - b);
      let ok = true;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - sorted[i - 1] < 3) { ok = false; break; }
      }
      if (ok) return chosen;
    }
    // Repli déterministe : positions régulièrement espacées, départ aléatoire
    const step = Math.floor(25 / (count - 1));
    const offset = rand(0, 25 - step * (count - 1));
    return Array.from({ length: count }, (_, i) => ALPHABET[offset + i * step]);
  }
  // mix : aléatoire pur
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

export default {
  id: 'letter-bubbles',
  name: 'Bulles de lettres',
  category: 'attention',
  icon: '🫧',
  isSequential: true,
  requiresSpecialInput: false,
  numpadExtras: [],

  configSpec: {
    intro: 'Cliquez les bulles dans l\'ordre demandé, le plus vite possible',
    params: [
      { id: 'direction', label: 'Sens', type: 'chips', def: 'mix',
        options: [{ v: 'asc', l: 'A→Z' }, { v: 'desc', l: 'Z→A' }, { v: 'mix', l: 'Mixte' }] },
      { id: 'spacing', label: 'Espacement', type: 'chips', def: 'mix',
        note: 'Lettres proches = ordre plus difficile à trancher',
        options: [{ v: 'near', l: 'Proches' }, { v: 'far', l: 'Éloignées' }, { v: 'mix', l: 'Mixte' }] },
      { id: 'count', label: 'Bulles', type: 'stepper', min: 4, max: 7, def: 5 },
      { id: 'rounds', label: 'Rounds', type: 'stepper', min: 2, max: 5, def: 3 },
    ],
  },

  _timers: [],
  _keyHandler: null,

  getInputType() { return 'none'; },

  generate() { return { question: 'Bulles de lettres', answer: '' }; },
  validate(u, c) { return { correct: u === c }; },
  renderQuestion() {},

  startSequence(params, onComplete) {
    this._timers = [];
    const count = params.count ?? 5;
    const ROUNDS = params.rounds ?? 3;
    const diameter = count >= 7 ? 50 : count >= 6 ? 56 : 62;
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

      const spacing = params.spacing === 'mix' ? pick(['near', 'far', 'mix']) : (params.spacing ?? 'mix');
      const letters = pickLetters(count, spacing);
      const sorted = [...letters].sort();
      const direction = params.direction === 'mix' ? pick(['asc', 'desc']) : (params.direction ?? 'asc');
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

      const positions = layoutPositions(count, areaW, areaH, diameter);

      letters.forEach((letter, i) => {
        const pos = positions[i];
        const bubble = document.createElement('button');
        bubble.type = 'button';
        bubble.textContent = letter;
        bubble.dataset.letter = letter;
        bubble.style.cssText = [
          'position:absolute',
          `left:${pos.x}px`, `top:${pos.y}px`,
          `width:${diameter}px`, `height:${diameter}px`,
          'border-radius:50%',
          'background:#1e293b', 'border:2px solid #475569', 'color:#e2e8f0',
          `font-size:${Math.round(diameter * 0.42)}px`, 'font-weight:800',
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
