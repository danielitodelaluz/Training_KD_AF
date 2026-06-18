// reaction-time.js — Temps de réaction simple + go/no-go

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export default {
  id: 'reaction-time',
  name: 'Temps de réaction',
  category: 'attention',
  icon: '⚡',
  isSequential: true,
  requiresSpecialInput: false,
  numpadExtras: [],
  getInputType() { return 'click'; },

  _timers: [],
  _keyHandler: null,

  generate() { return { question: '', answer: '' }; },
  validate() { return { correct: true }; },
  renderQuestion() {},

  startSequence(difficulty, onComplete) {
    this._timers = [];
    const items = [];

    const TRIALS = 10;
    const noGoChance = [0, 0, 0.2, 0.3, 0.4][difficulty - 1];
    const timeout = [2000, 1800, 1500, 1300, 1100][difficulty - 1];
    const useRule = difficulty === 5;

    const questionZone = document.getElementById('exercise-question-zone');
    const specialArea = document.getElementById('exercise-special-input');
    if (specialArea) specialArea.classList.add('hidden');
    document.getElementById('numpad-area')?.classList.add('hidden');

    questionZone.innerHTML = `
      <div class="reaction-container">
        <div class="reaction-instruction" id="rt-instruction">
          ${noGoChance > 0
            ? 'Appuyez sur le cercle <strong>vert</strong> uniquement'
            : 'Appuyez le plus vite possible !'}
          ${useRule ? '<br>🌟 Appuyez seulement si le cercle contient une étoile' : ''}
        </div>
        <div class="reaction-target waiting" id="rt-target" role="button" aria-label="Cible">+</div>
        <div class="reaction-result" id="rt-result"></div>
        <div style="font-size:0.75rem;color:var(--text-muted)">Essai <span id="rt-count">0</span> / ${TRIALS}</div>
      </div>
    `;

    let trialIndex = 0;
    let stimulusShown = false;
    let stimulusTime = 0;
    let currentIsGo = true;
    let pressed = false;
    let trialTimer = null;

    const target = document.getElementById('rt-target');
    const result = document.getElementById('rt-result');
    const countEl = document.getElementById('rt-count');

    const nextTrial = () => {
      if (trialIndex >= TRIALS) {
        cleanup();
        onComplete(items);
        return;
      }

      trialIndex++;
      countEl.textContent = trialIndex;
      pressed = false;
      stimulusShown = false;
      result.textContent = '';

      target.className = 'reaction-target waiting';
      target.textContent = '+';

      // Random fixation delay
      const delay = rand(800, 2000);
      const fixTimer = setTimeout(() => {
        if (!questionZone.isConnected) return;

        // Determine go/no-go
        currentIsGo = Math.random() > noGoChance;
        const hasSymbol = useRule ? (currentIsGo && Math.random() > 0.3) : false;

        stimulusShown = true;
        stimulusTime = performance.now();

        if (currentIsGo) {
          target.className = 'reaction-target go';
          target.textContent = useRule ? (hasSymbol ? '★' : '') : '●';
        } else {
          target.className = 'reaction-target no-go';
          target.textContent = useRule ? (Math.random() > 0.5 ? '■' : '') : '■';
        }

        // Timeout handler
        trialTimer = setTimeout(() => {
          if (pressed) return;
          const time_ms = timeout;
          const correct = !currentIsGo; // not pressing a no-go = correct
          result.textContent = currentIsGo ? '⌛ Trop lent !' : '✓ Bonne inhibition';
          items.push({
            question: currentIsGo ? 'go' : 'no-go',
            correctAnswer: currentIsGo ? 'go' : 'no-go',
            userAnswer: 'none',
            correct,
            partial: false,
            time_ms,
            difficulty,
          });
          const nextTimer = setTimeout(nextTrial, 700);
          this._timers.push(nextTimer);
        }, timeout);
        this._timers.push(trialTimer);
      }, delay);
      this._timers.push(fixTimer);
    };

    const onPress = () => {
      if (!stimulusShown || pressed) return;
      pressed = true;
      clearTimeout(trialTimer);

      const time_ms = Math.round(performance.now() - stimulusTime);
      const correct = currentIsGo;

      target.className = 'reaction-target ' + (correct ? 'go' : 'no-go');
      result.textContent = correct
        ? `✓ ${time_ms} ms`
        : '✗ Fausse alarme !';

      items.push({
        question: currentIsGo ? 'go' : 'no-go',
        correctAnswer: currentIsGo ? 'go' : 'no-go',
        userAnswer: 'pressed',
        correct,
        partial: false,
        time_ms,
        difficulty,
      });

      const nextTimer = setTimeout(nextTrial, 600);
      this._timers.push(nextTimer);
    };

    target.addEventListener('click', onPress);
    target.addEventListener('touchend', (e) => { e.preventDefault(); onPress(); });

    this._keyHandler = (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onPress(); }
    };
    document.addEventListener('keydown', this._keyHandler);

    const cleanup = () => {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    };

    nextTrial();
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
