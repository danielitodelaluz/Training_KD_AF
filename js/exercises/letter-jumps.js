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

  getInputType() { return 'choice'; },

  generate(difficulty) {
    let question, answer, extraData;

    if (difficulty === 1) {
      // Start letter A-V (idx 0-21), jump +1 to +3, no wrap needed (max V+3 = Y)
      const startIdx = rand(0, 21);
      const jump = rand(1, 3);
      const start = letterAt(startIdx);
      const end = letterAt(startIdx + jump);
      question = `${start} + ${jump} = ?`;
      answer = end;
      extraData = { start, jump, sign: '+', steps: [{ sign: '+', n: jump }] };

    } else if (difficulty === 2) {
      // Start letter A-T (idx 0-19), jump +1 to +5, may wrap Z→A
      const startIdx = rand(0, 19);
      const jump = rand(1, 5);
      const start = letterAt(startIdx);
      const end = letterAt(startIdx + jump);
      question = `${start} + ${jump} = ?`;
      answer = end;
      extraData = { start, jump, sign: '+', steps: [{ sign: '+', n: jump }] };

    } else if (difficulty === 3) {
      // Jump +1 to +8 or small negative -1 to -3, wrap both ways
      const startIdx = rand(0, 25);
      const goNeg = Math.random() < 0.35;
      const jump = goNeg ? rand(1, 3) : rand(1, 8);
      const sign = goNeg ? '-' : '+';
      const start = letterAt(startIdx);
      const endIdx = goNeg ? startIdx - jump : startIdx + jump;
      const end = letterAt(endIdx);
      const opStr = goNeg ? `− ${jump}` : `+ ${jump}`;
      question = `${start} ${opStr} = ?`;
      answer = end;
      extraData = { start, jump, sign, steps: [{ sign, n: jump }] };

    } else if (difficulty === 4) {
      // Negative jumps -1 to -6, wrap
      const startIdx = rand(0, 25);
      const jump = rand(1, 6);
      const start = letterAt(startIdx);
      const end = letterAt(startIdx - jump);
      question = `${start} − ${jump} = ?`;
      answer = end;
      extraData = { start, jump, sign: '-', steps: [{ sign: '-', n: jump }] };

    } else {
      // D5: two chained jumps e.g. "M + 4 − 2 = ?"
      const startIdx = rand(0, 25);
      const jump1 = rand(1, 6);
      const sign1 = pick(['+', '-']);
      const jump2 = rand(1, 5);
      const sign2 = pick(['+', '-']);

      const mid = sign1 === '+' ? startIdx + jump1 : startIdx - jump1;
      const endIdx = sign2 === '+' ? mid + jump2 : mid - jump2;

      const start = letterAt(startIdx);
      const end = letterAt(endIdx);

      const op1Str = sign1 === '+' ? `+ ${jump1}` : `− ${jump1}`;
      const op2Str = sign2 === '+' ? `+ ${jump2}` : `− ${jump2}`;
      question = `${start} ${op1Str} ${op2Str} = ?`;
      answer = end;
      extraData = {
        start,
        steps: [
          { sign: sign1, n: jump1 },
          { sign: sign2, n: jump2 },
        ],
      };
    }

    return { question, answer, extraData };
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
