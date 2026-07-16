// stroop-gonogo.js — Stroop / Go-No-Go

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const WORDS  = ['ROUGE', 'BLEU', 'VERT', 'JAUNE'];
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];

// Returns { word, inkColor, isCongruent, shouldPress }
function generateTrial(noGoChance) {
  const wordIdx = rand(0, 3);
  const word = WORDS[wordIdx];

  let inkIdx;
  let isCongruent;
  if (Math.random() < noGoChance) {
    // Force incongruent (no-go)
    do { inkIdx = rand(0, 3); } while (inkIdx === wordIdx);
    isCongruent = false;
  } else {
    // Force congruent (go)
    inkIdx = wordIdx;
    isCongruent = true;
  }

  return {
    word,
    inkColor: COLORS[inkIdx],
    isCongruent,
    shouldPress: isCongruent, // press when congruent
  };
}

export default {
  id: 'stroop-gonogo',
  name: 'Stroop / Go-No-Go',
  category: 'attention',
  icon: '🎯',
  isSequential: true,
  requiresSpecialInput: false,
  numpadExtras: [],

  configSpec: {
    intro: 'Appuyez seulement si la couleur du texte correspond au mot',
    params: [
      { id: 'timeout', label: 'Cadence', type: 'chips', def: 1500,
        options: [{ v: 2000, l: '2s' }, { v: 1500, l: '1,5s' }, { v: 1200, l: '1,2s' }, { v: 800, l: '0,8s' }] },
      { id: 'nogo', label: 'Pièges', type: 'chips', def: 0.4,
        note: 'Part d\'essais où il ne faut PAS appuyer',
        options: [{ v: 0.3, l: '30%' }, { v: 0.4, l: '40%' }, { v: 0.5, l: '50%' }] },
      { id: 'trials', label: 'Essais', type: 'chips', def: 15,
        options: [{ v: 10, l: '10' }, { v: 15, l: '15' }, { v: 20, l: '20' }] },
    ],
  },

  _timers: [],
  _keyHandler: null,

  getInputType() { return 'none'; },

  generate(_difficulty) {
    return { question: 'Stroop Go-No-Go', answer: '0' };
  },

  validate(userAnswer, correctAnswer) {
    return { correct: userAnswer === correctAnswer };
  },

  renderQuestion(_container, _item, _ctx) {},

  startSequence(params, onComplete) {
    this._timers = [];

    const SEQUENCE_LENGTH = params.trials ?? 15;
    const timeout_ms = params.timeout ?? 1500;
    const noGoChance = params.nogo ?? 0.4;

    const trials = [];
    for (let i = 0; i < SEQUENCE_LENGTH; i++) {
      trials.push(generateTrial(noGoChance));
    }

    const questionZone = document.getElementById('exercise-question-zone');
    const specialInput = document.getElementById('exercise-special-input');
    if (!questionZone) return;

    questionZone.innerHTML = '';
    if (specialInput) specialInput.innerHTML = '';

    // Rule display
    const ruleEl = document.createElement('div');
    ruleEl.className = 'nback-rule';
    ruleEl.style.cssText = 'text-align:center;font-size:0.9rem;color:#94a3b8;margin-bottom:12px;padding:8px;background:#1e293b;border-radius:8px;';
    ruleEl.textContent = 'Appuyez si la couleur du texte correspond au mot';
    questionZone.appendChild(ruleEl);

    // Counter
    const counterEl = document.createElement('div');
    counterEl.className = 'nback-counter';
    counterEl.style.cssText = 'text-align:center;color:#94a3b8;font-size:0.85rem;margin-bottom:8px;';
    counterEl.textContent = `0 / ${SEQUENCE_LENGTH}`;
    questionZone.appendChild(counterEl);

    // Word display
    const wordEl = document.createElement('div');
    wordEl.style.cssText = 'font-size:3rem;font-weight:900;text-align:center;min-height:4.5rem;line-height:4.5rem;letter-spacing:4px;margin:8px 0;';
    questionZone.appendChild(wordEl);

    // Countdown bar container
    const barWrap = document.createElement('div');
    barWrap.style.cssText = 'width:100%;max-width:340px;height:6px;background:#334155;border-radius:3px;margin:8px auto;overflow:hidden;';
    const barFill = document.createElement('div');
    barFill.style.cssText = 'height:100%;background:#6366f1;width:100%;transition:width linear;';
    barWrap.appendChild(barFill);
    questionZone.appendChild(barWrap);

    // Feedback line
    const feedbackEl = document.createElement('div');
    feedbackEl.style.cssText = 'text-align:center;font-size:0.9rem;min-height:1.4rem;margin-top:4px;';
    questionZone.appendChild(feedbackEl);

    // APPUYER button in special input
    if (specialInput) {
      const pressBtn = document.createElement('button');
      pressBtn.className = 'choice-btn reaction-target';
      pressBtn.id = 'stroop-press-btn';
      pressBtn.textContent = 'APPUYER';
      pressBtn.style.cssText = 'padding:16px 40px;font-size:1.3rem;font-weight:700;background:#6366f1;color:white;border:none;border-radius:12px;cursor:pointer;letter-spacing:2px;';
      specialInput.appendChild(pressBtn);
    }

    const items = [];
    let trialIndex = 0;
    let pressed = false;
    let trialStart = 0;
    let barAnimFrame = null;

    const runTrial = (idx) => {
      if (idx >= SEQUENCE_LENGTH) {
        finishSequence();
        return;
      }

      const trial = trials[idx];
      pressed = false;
      trialStart = performance.now();

      counterEl.textContent = `${idx + 1} / ${SEQUENCE_LENGTH}`;
      wordEl.textContent = trial.word;
      wordEl.style.color = trial.inkColor;
      feedbackEl.textContent = '';
      feedbackEl.style.color = '';

      // Animate countdown bar
      barFill.style.transition = 'none';
      barFill.style.width = '100%';
      // Force reflow then animate
      void barFill.offsetWidth;
      barFill.style.transition = `width ${timeout_ms}ms linear`;
      barFill.style.width = '0%';

      const recordPress = (timeFromStart) => {
        if (pressed) return;
        pressed = true;
        const time_ms = Math.round(timeFromStart);
        const correct = trial.shouldPress; // pressed when should press
        feedbackEl.textContent = correct ? '✓' : '✗';
        feedbackEl.style.color = correct ? '#22c55e' : '#ef4444';

        items.push({
          question: `"${trial.word}" en ${trial.inkColor} (congruent: ${trial.isCongruent})`,
          correctAnswer: trial.shouldPress ? 'press' : 'no-press',
          userAnswer: 'press',
          correct,
          partial: false,
          time_ms,
        });
      };

      // Wire button
      const pressBtn = document.getElementById('stroop-press-btn');
      const handlePress = () => recordPress(performance.now() - trialStart);
      if (pressBtn) {
        pressBtn.addEventListener('click', handlePress, { once: true });
      }

      // Key handler (Space)
      const keyFn = (e) => {
        if (e.code === 'Space') {
          e.preventDefault();
          recordPress(performance.now() - trialStart);
        }
      };
      document.addEventListener('keydown', keyFn);
      this._keyHandler = keyFn;

      const trialTimer = setTimeout(() => {
        // Clean up key handler for this trial
        document.removeEventListener('keydown', keyFn);
        if (pressBtn) pressBtn.removeEventListener('click', handlePress);

        if (!pressed) {
          // No press: correct rejection or miss
          const correct = !trial.shouldPress;
          feedbackEl.textContent = correct ? '✓' : '✗';
          feedbackEl.style.color = correct ? '#22c55e' : '#ef4444';

          items.push({
            question: `"${trial.word}" en ${trial.inkColor} (congruent: ${trial.isCongruent})`,
            correctAnswer: trial.shouldPress ? 'press' : 'no-press',
            userAnswer: 'no-press',
            correct,
            partial: false,
            time_ms: timeout_ms,
          });
        }

        // Brief inter-trial interval
        const iti = setTimeout(() => runTrial(idx + 1), 400);
        this._timers.push(iti);
      }, timeout_ms);
      this._timers.push(trialTimer);
    };

    const finishSequence = () => {
      if (this._keyHandler) {
        document.removeEventListener('keydown', this._keyHandler);
        this._keyHandler = null;
      }
      questionZone.innerHTML = '<div class="question-display">Séquence terminée !</div>';
      if (specialInput) specialInput.innerHTML = '';
      onComplete(items);
    };

    // Start after short delay
    const startTimer = setTimeout(() => runTrial(0), 600);
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
