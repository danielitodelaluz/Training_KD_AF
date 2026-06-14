// nback.js — N-back (position sur grille 3×3)

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const LETTERS = 'BCDFGHJKLMNPQRSTVWXYZ'; // consonants for letter mode

function generateSequence(length, n, matchRate = 0.3) {
  const seq = [];
  for (let i = 0; i < length; i++) {
    if (i >= n && Math.random() < matchRate) {
      // Force a match: repeat the position from n back
      seq.push(seq[i - n]);
    } else {
      let val;
      do {
        val = rand(0, 8);
      } while (i >= n && val === seq[i - n] && Math.random() < 0.5);
      // Allow non-matches but avoid accidental matches most of the time
      seq.push(val);
    }
  }
  return seq;
}

function generateLetterSequence(length, n, matchRate = 0.3) {
  const seq = [];
  for (let i = 0; i < length; i++) {
    if (i >= n && Math.random() < matchRate) {
      seq.push(seq[i - n]);
    } else {
      let val;
      do {
        val = rand(0, LETTERS.length - 1);
      } while (i >= n && val === seq[i - n] && Math.random() < 0.5);
      seq.push(val);
    }
  }
  return seq;
}

export default {
  id: 'nback',
  name: 'N-back',
  category: 'memoire',
  icon: '🧩',
  isSequential: true,
  requiresSpecialInput: false,
  numpadExtras: [],

  _timers: [],
  _keyHandler: null,

  getInputType() { return 'none'; },

  generate(_difficulty) {
    return { question: 'N-back', answer: '0' };
  },

  validate(userAnswer, correctAnswer) {
    return { correct: userAnswer === correctAnswer };
  },

  renderQuestion(_container, _item, _ctx) {
    // Not used for sequential exercises
  },

  startSequence(difficulty, onComplete) {
    this._timers = [];
    const configs = {
      1: { n: 1, interval: 2000, length: 15, mode: 'position' },
      2: { n: 2, interval: 1800, length: 18, mode: 'position' },
      3: { n: 3, interval: 1500, length: 20, mode: 'position' },
      4: { n: 4, interval: 1200, length: 22, mode: 'position' },
      5: { n: 4, interval: 1000, length: 22, mode: 'letter' },
    };
    const cfg = configs[difficulty] || configs[1];
    const { n, interval, length, mode } = cfg;
    const stimulusDuration = 600;
    const blankDuration = interval - stimulusDuration;

    // Generate sequence
    let sequence;
    if (mode === 'letter') {
      sequence = generateLetterSequence(length, n);
    } else {
      sequence = generateSequence(length, n);
    }

    // Determine ground truth for each position after n
    // isMatch[i] = true if sequence[i] === sequence[i - n] (for i >= n)
    const isMatch = sequence.map((val, i) => i >= n && val === sequence[i - n]);

    // Build DOM
    const questionZone = document.getElementById('exercise-question-zone');
    const specialInput = document.getElementById('exercise-special-input');
    if (!questionZone || !specialInput) return;

    questionZone.innerHTML = '';
    specialInput.innerHTML = '';

    // Rule label
    const ruleEl = document.createElement('div');
    ruleEl.className = 'nback-rule';
    ruleEl.textContent = `${n}-back : ${mode === 'letter' ? 'lettre' : 'position'} identique il y a ${n} stimulus ?`;
    questionZone.appendChild(ruleEl);

    // Counter
    const counterEl = document.createElement('div');
    counterEl.className = 'nback-counter';
    counterEl.textContent = `0 / ${length}`;
    questionZone.appendChild(counterEl);

    // 3×3 grid
    const grid = document.createElement('div');
    grid.className = 'nback-grid';
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:220px;margin:16px auto;';
    const cells = [];
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'nback-cell';
      cell.style.cssText = 'width:60px;height:60px;border-radius:8px;background:#334155;border:2px solid #475569;transition:background 0.1s;';
      grid.appendChild(cell);
      cells.push(cell);
    }
    questionZone.appendChild(grid);

    // Letter display (only in letter mode)
    let letterDisplay = null;
    if (mode === 'letter') {
      letterDisplay = document.createElement('div');
      letterDisplay.className = 'nback-letter';
      letterDisplay.style.cssText = 'font-size:3rem;font-weight:bold;text-align:center;color:#6366f1;height:4rem;line-height:4rem;margin-top:8px;';
      questionZone.appendChild(letterDisplay);
    }

    // Oui/Non buttons
    const btnContainer = document.createElement('div');
    btnContainer.className = 'nback-match-btns';
    btnContainer.style.cssText = 'display:flex;gap:12px;justify-content:center;margin-top:12px;';

    const ouiBtn = document.createElement('button');
    ouiBtn.className = 'choice-btn nback-oui';
    ouiBtn.textContent = 'Oui ✓';
    ouiBtn.style.cssText = 'padding:12px 28px;font-size:1.1rem;background:#22c55e;color:white;border:none;border-radius:8px;cursor:pointer;';

    const nonBtn = document.createElement('button');
    nonBtn.className = 'choice-btn nback-non';
    nonBtn.textContent = 'Non ✗';
    nonBtn.style.cssText = 'padding:12px 28px;font-size:1.1rem;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;';

    btnContainer.appendChild(ouiBtn);
    btnContainer.appendChild(nonBtn);
    specialInput.appendChild(btnContainer);

    // Disable buttons initially (before n stimuli)
    ouiBtn.disabled = true;
    nonBtn.disabled = true;
    ouiBtn.style.opacity = '0.4';
    nonBtn.style.opacity = '0.4';

    const items = [];
    let currentIndex = 0;
    let responseForCurrent = null; // null = no response yet, 'yes'/'no'
    let stimulusStart = 0;

    const enableButtons = () => {
      ouiBtn.disabled = false;
      nonBtn.disabled = false;
      ouiBtn.style.opacity = '1';
      nonBtn.style.opacity = '1';
    };

    const disableButtons = () => {
      ouiBtn.disabled = true;
      nonBtn.disabled = true;
      ouiBtn.style.opacity = '0.4';
      nonBtn.style.opacity = '0.4';
    };

    const recordResponse = (response) => {
      if (currentIndex < n) return; // no recording before n stimuli
      responseForCurrent = response;
    };

    ouiBtn.addEventListener('click', () => recordResponse('yes'));
    nonBtn.addEventListener('click', () => recordResponse('no'));

    // Key bindings
    const keyListener = (e) => {
      if (e.code === 'Space') { e.preventDefault(); recordResponse('yes'); }
      if (e.key === 'n' || e.key === 'N') recordResponse('no');
    };
    document.addEventListener('keydown', keyListener);
    this._keyHandler = keyListener;

    const showStimulus = (index) => {
      currentIndex = index;
      responseForCurrent = null;
      counterEl.textContent = `${index + 1} / ${length}`;

      if (index >= n) {
        enableButtons();
      } else {
        disableButtons();
      }

      // Light up cell or show letter
      if (mode === 'letter') {
        const letterIdx = sequence[index];
        if (letterDisplay) letterDisplay.textContent = LETTERS[letterIdx];
      } else {
        const cellIdx = sequence[index];
        cells[cellIdx].style.background = '#6366f1';
        cells[cellIdx].style.borderColor = '#818cf8';
      }

      stimulusStart = performance.now();

      const hideTimer = setTimeout(() => {
        // Hide stimulus
        if (mode === 'letter') {
          if (letterDisplay) letterDisplay.textContent = '';
        } else {
          cells.forEach(c => {
            c.style.background = '#334155';
            c.style.borderColor = '#475569';
          });
        }
        disableButtons();

        // Record item if this was a scoreable position
        if (index >= n) {
          const match = isMatch[index];
          const userSaidYes = responseForCurrent === 'yes';
          const correct = match ? userSaidYes : !userSaidYes;
          const time_ms = Math.round(performance.now() - stimulusStart);

          items.push({
            question: mode === 'letter'
              ? `Lettre ${LETTERS[sequence[index]]} (${n}-back)`
              : `Cellule ${sequence[index]} (${n}-back)`,
            correctAnswer: match ? 'yes' : 'no',
            userAnswer: responseForCurrent ?? 'no',
            correct,
            partial: false,
            time_ms,
            difficulty,
          });
        }

        // Schedule next stimulus or finish
        if (index + 1 < length) {
          const nextTimer = setTimeout(() => showStimulus(index + 1), blankDuration);
          this._timers.push(nextTimer);
        } else {
          // Done
          document.removeEventListener('keydown', keyListener);
          this._keyHandler = null;
          questionZone.innerHTML = '<div class="question-display">Séquence terminée !</div>';
          specialInput.innerHTML = '';
          onComplete(items);
        }
      }, stimulusDuration);
      this._timers.push(hideTimer);
    };

    // Start after a short delay
    const startTimer = setTimeout(() => showStimulus(0), 500);
    this._timers.push(startTimer);
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
