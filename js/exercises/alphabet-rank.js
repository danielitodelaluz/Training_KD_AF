// alphabet-rank.js — Alphabet — rang
import { buildLetterGrid } from '../ui.js';

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function letterToRank(letter) {
  return ALPHABET.indexOf(letter.toUpperCase()) + 1;
}

function rankToLetter(rank) {
  return ALPHABET[rank - 1];
}

export default {
  id: 'alphabet-rank',
  name: 'Alphabet — rang',
  category: 'lettres',
  icon: '🔤',
  isSequential: false,
  requiresSpecialInput: false, // overridden per-item in renderQuestion based on direction
  numpadExtras: [],

  configSpec: {
    intro: 'Connaître la position de chaque lettre par cœur',
    params: [
      { id: 'direction', label: 'Sens', type: 'chips', def: 'mix',
        options: [{ v: 'l2r', l: 'Lettre → rang' }, { v: 'r2l', l: 'Rang → lettre' }, { v: 'mix', l: 'Mixte' }] },
      { id: 'zone', label: 'Zone', type: 'chips', def: 'all',
        options: [{ v: 'am', l: 'A–M' }, { v: 'nz', l: 'N–Z' }, { v: 'all', l: 'Tout' }] },
    ],
  },

  getInputType() { return 'numeric'; }, // default; letter-direction uses special grid

  generate(params) {
    const zone = params.zone ?? 'all';
    const [lo, hi] = zone === 'am' ? [1, 13] : zone === 'nz' ? [14, 26] : [1, 26];
    const direction = params.direction === 'mix' || !params.direction
      ? (Math.random() < 0.5 ? 'l2r' : 'r2l')
      : params.direction;

    const rank = rand(lo, hi);
    const letter = rankToLetter(rank);

    if (direction === 'l2r') {
      return {
        question: `Lettre ${letter} → rang ?`,
        answer: String(rank),
        extraData: { direction: 'letter-to-rank', letter, rank },
      };
    }
    return {
      question: `Rang ${rank} → lettre ?`,
      answer: letter,
      extraData: { direction: 'rank-to-letter', letter, rank },
    };
  },

  validate(userAnswer, correctAnswer) {
    // For letter answers: case-insensitive single-letter comparison
    // For number answers: parseInt exact match
    const u = userAnswer.trim().toUpperCase();
    const c = correctAnswer.trim().toUpperCase();

    // If correct answer is a single letter (A-Z)
    if (/^[A-Z]$/.test(c)) {
      return { correct: u === c };
    }

    // Otherwise numeric comparison
    const uInt = parseInt(u, 10);
    const cInt = parseInt(c, 10);
    if (isNaN(uInt) || isNaN(cInt)) return { correct: false };
    return { correct: uInt === cInt };
  },

  renderQuestion(container, item, ctx) {
    const direction = item.extraData?.direction;

    if (direction === 'rank-to-letter') {
      // Manually control input areas: hide numpad, show letter grid
      document.getElementById('numpad-area')?.classList.add('hidden');
      if (ctx.special) {
        ctx.special.classList.remove('hidden');
        ctx.special.innerHTML = '';
      }

      container.innerHTML = `<div class="question-display">${item.question}</div>`;

      let buffer = '';
      const answerDisplay = document.createElement('div');
      answerDisplay.style.cssText = 'font-size:2rem;font-weight:900;color:var(--accent);margin-top:8px;min-height:40px;';
      answerDisplay.textContent = '—';
      container.appendChild(answerDisplay);

      buildLetterGrid(ctx.special, (key) => {
        if (key === 'backspace') {
          buffer = '';
          answerDisplay.textContent = '—';
        } else if (key === 'confirm') {
          if (buffer) ctx.onAnswer(buffer);
        } else {
          buffer = key;
          answerDisplay.textContent = buffer;
        }
      });

    } else {
      // Letter → rank: numpad (default setup from app.js is fine)
      container.innerHTML = `
        <div class="question-display">${item.question}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px">A = 1 … Z = 26</div>
      `;
    }
  },

  keyHandler(e, submitFn) {
    // No special keyboard handling — numpad or letter grid handles input
  },
};
