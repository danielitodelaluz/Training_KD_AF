// dual-task.js — Double tâche (alternance calcul mental + rang alphabet)

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function genMath(difficulty) {
  const maxN = [9, 19, 49, 99, 99][difficulty - 1];
  const a = rand(1, maxN), b = rand(1, Math.min(a, maxN));
  const op = difficulty <= 2 ? '+' : pick(['+', '−']);
  const ans = op === '+' ? a + b : a - b;
  return { q: `${a} ${op} ${b} = ?`, ans: String(ans) };
}

function genAlpha(difficulty) {
  const maxIdx = difficulty <= 2 ? 12 : 25;
  const letter = ALPHA[rand(0, maxIdx)];
  const rank = ALPHA.indexOf(letter) + 1;
  return { q: `Lettre ${letter} = rang ?`, ans: String(rank) };
}

export default {
  id: 'dual-task',
  name: 'Double tâche',
  category: 'attention',
  icon: '🔀',
  isSequential: true,
  requiresSpecialInput: false,
  numpadExtras: [],
  getInputType() { return 'numeric'; },

  _timers: [],
  _clickHandlers: [],
  _keyHandler: null,

  generate() { return { question: '', answer: '' }; },
  validate() { return { correct: true }; },
  renderQuestion() {},

  startSequence(difficulty, onComplete) {
    this._timers = [];
    this._clickHandlers = [];

    const PAIRS = 8;
    const interDelay = [800, 600, 500, 400, 300][difficulty - 1];
    const items = [];

    const questionZone = document.getElementById('exercise-question-zone');
    const numpadArea = document.getElementById('numpad-area');
    const specialArea = document.getElementById('exercise-special-input');
    if (specialArea) specialArea.classList.add('hidden');
    if (numpadArea) numpadArea.classList.remove('hidden');

    questionZone.innerHTML = `
      <div class="dual-task-container">
        <div class="dual-task-half" id="dt-a" style="border:2px solid transparent;">
          <div class="dual-task-label">Calcul</div>
          <div id="dt-a-q" style="font-size:1.4rem;font-weight:800;">—</div>
        </div>
        <div class="dual-task-half" id="dt-b" style="border:2px solid transparent;">
          <div class="dual-task-label">Alphabet</div>
          <div id="dt-b-q" style="font-size:1.4rem;font-weight:800;">—</div>
        </div>
      </div>
      <div id="dt-feedback" style="font-size:0.85rem;color:var(--text-muted);text-align:center;margin-top:8px;min-height:1.2em;"></div>
    `;

    let buffer = '';
    let pairsDone = 0;
    let currentTask = null; // { q, ans, type }
    let taskStartTime = 0;

    const numpadDisplay = document.getElementById('numpad-display');
    const feedbackEl = document.getElementById('dt-feedback');

    const updateDisplay = () => {
      if (numpadDisplay) {
        if (buffer === '') {
          numpadDisplay.innerHTML = '<span class="placeholder">—</span>';
          numpadDisplay.classList.remove('has-value');
        } else {
          numpadDisplay.textContent = buffer;
          numpadDisplay.classList.add('has-value');
        }
      }
    };

    const submit = () => {
      if (!buffer || !currentTask) return;
      const time_ms = Math.round(performance.now() - taskStartTime);
      const correct = buffer.trim() === currentTask.ans;

      items.push({
        question: currentTask.q,
        correctAnswer: currentTask.ans,
        userAnswer: buffer,
        correct,
        partial: false,
        time_ms,
        difficulty,
      });

      const fb = document.getElementById('dt-feedback');
      if (fb) fb.textContent = correct ? '✓ Correct' : `✗ Réponse : ${currentTask.ans}`;

      buffer = '';
      updateDisplay();

      const t = setTimeout(nextMiniTask, interDelay);
      this._timers.push(t);
    };

    const nextMiniTask = () => {
      if (pairsDone >= PAIRS) {
        cleanup();
        onComplete(items);
        return;
      }

      // Alternate: even pairs = math, odd pairs = alphabet
      const isMath = (items.length % 2 === 0);
      currentTask = isMath ? genMath(difficulty) : genAlpha(difficulty);
      taskStartTime = performance.now();
      buffer = '';
      updateDisplay();

      if (feedbackEl) feedbackEl.textContent = '';

      const aEl = document.getElementById('dt-a');
      const bEl = document.getElementById('dt-b');
      const aQ = document.getElementById('dt-a-q');
      const bQ = document.getElementById('dt-b-q');

      if (isMath) {
        if (aEl) aEl.style.borderColor = 'var(--accent)';
        if (bEl) bEl.style.borderColor = 'transparent';
        if (aQ) aQ.textContent = currentTask.q;
        if (bQ) bQ.textContent = pairsDone > 0 ? (items[items.length - 1]?.question ?? '—') : '—';
      } else {
        if (aEl) aEl.style.borderColor = 'transparent';
        if (bEl) bEl.style.borderColor = 'var(--success)';
        if (bQ) bQ.textContent = currentTask.q;
      }

      if (items.length >= PAIRS * 2) {
        cleanup();
        onComplete(items);
      }
      pairsDone++;
    };

    // Wire numpad
    const numpadArea2 = document.getElementById('numpad-area');
    const keyHandler = (key) => {
      if (key === 'backspace') { buffer = buffer.slice(0, -1); updateDisplay(); }
      else if (key === 'confirm') submit();
      else if (buffer.length < 6 && '0123456789'.includes(key)) { buffer += key; updateDisplay(); }
    };

    const numpadClickHandler = (e) => {
      const k = e.target.closest('[data-key]')?.dataset.key;
      if (k) keyHandler(k);
    };
    numpadArea2?.addEventListener('click', numpadClickHandler);
    this._clickHandlers.push([numpadArea2, numpadClickHandler]);

    this._keyHandler = (e) => {
      if ('0123456789'.includes(e.key)) keyHandler(e.key);
      else if (e.key === 'Backspace') keyHandler('backspace');
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); keyHandler('confirm'); }
    };
    document.addEventListener('keydown', this._keyHandler);

    const cleanup = () => {
      for (const [el, h] of this._clickHandlers) el?.removeEventListener('click', h);
      this._clickHandlers = [];
      if (this._keyHandler) {
        document.removeEventListener('keydown', this._keyHandler);
        this._keyHandler = null;
      }
    };

    nextMiniTask();
  },

  cleanup() {
    for (const t of this._timers) clearTimeout(t);
    this._timers = [];
    for (const [el, h] of this._clickHandlers) el?.removeEventListener('click', h);
    this._clickHandlers = [];
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  },
};
