// letter-jumps.js — Sauts de lettres
import { buildLetterGrid } from '../ui.js';

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Return letter at position idx (0-based) with wrap-around
function letterAt(idx) {
  return ALPHABET[((idx % 26) + 26) % 26];
}


export default {
  id: 'letter-jumps',
  name: 'Sauts de lettres',
  category: 'lettres',
  icon: '🔡',
  isSequential: false,
  requiresSpecialInput: true,
  numpadExtras: [],

  configSpec: {
    intro: 'Avancez ou reculez dans l\'alphabet à partir d\'une lettre',
    params: [
      { id: 'sens', label: 'Sens', type: 'chips', def: 'mix',
        options: [{ v: 'plus', l: '+ Avancer' }, { v: 'minus', l: '− Reculer' }, { v: 'mix', l: 'Mixte' }] },
      { id: 'taille', label: 'Sauts de', type: 'chips', def: 5,
        options: [{ v: 3, l: '1-3' }, { v: 5, l: '1-5' }, { v: 8, l: '1-8' }] },
      { id: 'chaine', label: 'Enchaînement', type: 'chips', def: 1,
        options: [{ v: 1, l: '1 saut' }, { v: 2, l: '2 sauts' }] },
      { id: 'wrap', label: 'Passage Z↔A', type: 'chips', def: 'off',
        note: 'Avec : Z + 2 = B (l\'alphabet boucle)',
        options: [{ v: 'off', l: 'Sans' }, { v: 'on', l: 'Avec' }] },
    ],
  },

  getInputType() { return 'choice'; },

  generate(params) {
    const maxJump = params.taille ?? 5;
    const nSteps = params.chaine ?? 1;
    const wrap = params.wrap === 'on';
    const signFor = () =>
      params.sens === 'plus' ? '+' : params.sens === 'minus' ? '-' : pick(['+', '-']);

    // Tire des étapes ; sans wrap, on re-tire tant qu'un point du parcours
    // sortirait de A..Z.
    let startIdx, steps, endIdx;
    for (let attempt = 0; attempt < 200; attempt++) {
      startIdx = rand(0, 25);
      steps = Array.from({ length: nSteps }, () => ({ sign: signFor(), n: rand(1, maxJump) }));
      let idx = startIdx;
      let ok = true;
      for (const s of steps) {
        idx = s.sign === '+' ? idx + s.n : idx - s.n;
        if (!wrap && (idx < 0 || idx > 25)) { ok = false; break; }
      }
      if (ok) { endIdx = idx; break; }
      endIdx = undefined;
    }
    if (endIdx === undefined) {
      // Repli sûr : un seul saut positif sans sortie de zone
      startIdx = rand(0, 20);
      steps = [{ sign: '+', n: rand(1, Math.min(maxJump, 25 - startIdx)) }];
      endIdx = startIdx + steps[0].n;
    }

    const start = letterAt(startIdx);
    const end = letterAt(endIdx);
    const opsStr = steps.map((s) => `${s.sign === '+' ? '+' : '−'} ${s.n}`).join(' ');

    return {
      question: `${start} ${opsStr} = ?`,
      answer: end,
      extraData: { start, steps },
    };
  },

  validate(userAnswer, correctAnswer) {
    const u = userAnswer.trim().toUpperCase();
    const c = correctAnswer.trim().toUpperCase();
    return { correct: u === c };
  },

  renderQuestion(container, item, ctx) {
    // Show the question text
    container.innerHTML = `<div class="question-display">${item.question}</div>`;

    // Build letter buffer state
    let buffer = '';

    // Small display inside the question zone for the typed letter
    const answerDisplay = document.createElement('div');
    answerDisplay.className = 'letter-answer-display question-display--sub';
    answerDisplay.textContent = '—';
    container.appendChild(answerDisplay);

    const updateDisplay = () => {
      answerDisplay.textContent = buffer || '—';
    };

    // Render letter grid in the special input area
    buildLetterGrid(ctx.special, (key) => {
      if (key === 'backspace') {
        buffer = '';
        updateDisplay();
      } else if (key === 'confirm') {
        if (buffer) ctx.onAnswer(buffer);
      } else {
        // Single-letter answer — replace on each tap
        buffer = key;
        updateDisplay();
      }
    });
  },

  keyHandler(e, submitFn) {
    // Typing a letter key directly selects that letter and submits
    if (/^[a-zA-Z]$/.test(e.key) && e.key.length === 1) {
      submitFn(e.key.toUpperCase());
    }
  },
};
