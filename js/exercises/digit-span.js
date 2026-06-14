// digit-span.js — Empan de chiffres

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateDigits(count) {
  const digits = [];
  for (let i = 0; i < count; i++) {
    digits.push(rand(0, 9));
  }
  return digits;
}

export default {
  id: 'digit-span',
  name: 'Empan de chiffres',
  category: 'memoire',
  icon: '🔢',
  isSequential: true,
  requiresSpecialInput: false,
  numpadExtras: [],

  _timers: [],
  _keyHandler: null,
  _clickHandler: null,

  getInputType() { return 'none'; },

  generate(_difficulty) {
    return { question: 'Empan de chiffres', answer: '0' };
  },

  validate(userAnswer, correctAnswer) {
    return { correct: userAnswer.trim() === correctAnswer.trim() };
  },

  renderQuestion(_container, _item, _ctx) {
    // Not used for sequential exercises
  },

  startSequence(difficulty, onComplete) {
    this._timers = [];

    const configs = {
      1: { length: 3, backward: false },
      2: { length: 4, backward: false },
      3: { length: 5, backward: false },
      4: { length: Math.random() < 0.5 ? 6 : 4, backward: Math.random() < 0.5 },
      5: { length: 6, backward: true },
    };

    // Re-randomize D4 each time
    let cfg;
    if (difficulty === 4) {
      const goBackward = Math.random() < 0.5;
      cfg = { length: goBackward ? 4 : 6, backward: goBackward };
    } else {
      cfg = configs[difficulty] || configs[1];
    }

    const { length, backward } = cfg;
    const digits = generateDigits(length);

    const questionZone = document.getElementById('exercise-question-zone');
    const specialInput = document.getElementById('exercise-special-input');
    const numpadArea = document.getElementById('numpad-area');

    if (!questionZone) return;

    // Phase 1: display digits one by one
    questionZone.innerHTML = '';
    if (specialInput) specialInput.innerHTML = '';

    const titleEl = document.createElement('div');
    titleEl.className = 'question-hint';
    titleEl.style.cssText = 'font-size:0.9rem;color:#94a3b8;margin-bottom:12px;text-align:center;';
    titleEl.textContent = backward
      ? 'Mémorisez, puis tapez à rebours'
      : 'Mémorisez les chiffres dans l\'ordre';
    questionZone.appendChild(titleEl);

    const displayEl = document.createElement('div');
    displayEl.className = 'span-display';
    displayEl.style.cssText = 'font-size:4rem;font-weight:bold;text-align:center;color:#6366f1;min-height:5rem;line-height:5rem;letter-spacing:4px;';
    questionZone.appendChild(displayEl);

    const progressEl = document.createElement('div');
    progressEl.style.cssText = 'text-align:center;color:#94a3b8;font-size:0.85rem;margin-top:8px;';
    questionZone.appendChild(progressEl);

    // Hide numpad during display phase
    if (numpadArea) numpadArea.classList.add('hidden');

    let digitIndex = 0;
    const showDuration = 500;
    const blankDuration = 300;

    const showNextDigit = () => {
      if (digitIndex >= digits.length) {
        // All digits shown, transition to input phase
        displayEl.textContent = '';
        progressEl.textContent = '';
        const blankTimer = setTimeout(() => startInputPhase(), 400);
        this._timers.push(blankTimer);
        return;
      }

      progressEl.textContent = `${digitIndex + 1} / ${length}`;
      displayEl.textContent = String(digits[digitIndex]);
      digitIndex++;

      const hideTimer = setTimeout(() => {
        displayEl.textContent = '';
        const nextTimer = setTimeout(showNextDigit, blankDuration);
        this._timers.push(nextTimer);
      }, showDuration);
      this._timers.push(hideTimer);
    };

    const startInputPhase = () => {
      // Update instruction
      questionZone.innerHTML = '';

      const instrEl = document.createElement('div');
      instrEl.className = 'question-display';
      instrEl.style.cssText = 'font-size:1.1rem;text-align:center;margin-bottom:8px;';
      instrEl.textContent = backward
        ? `Tapez les ${length} chiffres à REBOURS`
        : `Tapez les ${length} chiffres dans l'ordre`;
      questionZone.appendChild(instrEl);

      // Show typed digits as feedback
      const typedDisplay = document.createElement('div');
      typedDisplay.style.cssText = 'font-size:2rem;text-align:center;color:#f59e0b;min-height:2.5rem;letter-spacing:6px;font-weight:bold;margin-top:8px;';
      typedDisplay.textContent = '_'.repeat(length);
      questionZone.appendChild(typedDisplay);

      let buffer = '';

      const updateTyped = () => {
        const filled = buffer.split('').join(' ');
        const remaining = '_'.repeat(Math.max(0, length - buffer.length));
        typedDisplay.textContent = (buffer + remaining).split('').join(' ');
      };

      // Show numpad
      if (numpadArea) numpadArea.classList.remove('hidden');

      const handleKey = (key) => {
        if (key === 'backspace') {
          buffer = buffer.slice(0, -1);
          updateTyped();
        } else if (key === 'confirm') {
          if (buffer.length > 0) finishInput(buffer);
        } else if (/^\d$/.test(key) && buffer.length < length) {
          buffer += key;
          updateTyped();
          // Auto-submit when enough digits entered
          if (buffer.length === length) {
            const autoTimer = setTimeout(() => finishInput(buffer), 400);
            this._timers.push(autoTimer);
          }
        }
      };

      // Wire numpad buttons
      if (numpadArea) {
        const numpadClickHandler = (e) => {
          const key = e.target.closest('[data-key]')?.dataset.key;
          if (key) handleKey(key);
        };
        numpadArea.addEventListener('click', numpadClickHandler);
        this._clickHandler = () => numpadArea.removeEventListener('click', numpadClickHandler);
      }

      // Wire keyboard
      const keyboardHandler = (e) => {
        if (e.key >= '0' && e.key <= '9') handleKey(e.key);
        else if (e.key === 'Backspace') handleKey('backspace');
        else if (e.key === 'Enter') handleKey('confirm');
      };
      document.addEventListener('keydown', keyboardHandler);
      this._keyHandler = keyboardHandler;

      updateTyped();
    };

    const finishInput = (buffer) => {
      // Clean up
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
      if (this._clickHandler) { this._clickHandler(); this._clickHandler = null; }
      if (numpadArea) numpadArea.classList.add('hidden');

      const correctSequence = backward
        ? [...digits].reverse().join('')
        : digits.join('');

      const correct = buffer === correctSequence;

      // Count partial: how many in-position digits are correct
      let partialCount = 0;
      for (let i = 0; i < Math.min(buffer.length, correctSequence.length); i++) {
        if (buffer[i] === correctSequence[i]) partialCount++;
      }
      const partial = !correct && partialCount > 0;

      const item = {
        question: backward
          ? `Empan à rebours: ${digits.join(' - ')}`
          : `Empan: ${digits.join(' - ')}`,
        correctAnswer: correctSequence,
        userAnswer: buffer,
        correct,
        partial,
        time_ms: 0,
        difficulty,
      };

      questionZone.innerHTML = `<div class="question-display" style="color:${correct ? '#22c55e' : '#ef4444'}">${correct ? '✓ Correct !' : '✗ ' + correctSequence}</div>`;

      const doneTimer = setTimeout(() => onComplete([item]), 1000);
      this._timers.push(doneTimer);
    };

    // Start displaying digits after a brief pause
    const startTimer = setTimeout(showNextDigit, 600);
    this._timers.push(startTimer);
  },

  cleanup() {
    for (const t of this._timers) clearTimeout(t);
    this._timers = [];
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._clickHandler) {
      this._clickHandler();
      this._clickHandler = null;
    }
    const numpadArea = document.getElementById('numpad-area');
    if (numpadArea) numpadArea.classList.add('hidden');
  },
};
