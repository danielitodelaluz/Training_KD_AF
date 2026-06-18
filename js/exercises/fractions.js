// fractions.js — Fractions & décimales
import { renderFraction } from '../ui.js';

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Whitelist of "clean" fractions as [numerator, denominator]
const ALL_FRACTIONS = [
  [1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5],
  [1, 8], [3, 8], [5, 8], [7, 8],
  [1, 10], [3, 10], [7, 10],
  [1, 3], [2, 3],
  [1, 6], [5, 6],
];

// Subsets by difficulty
const SIMPLE_FRACTIONS = [[1, 2], [1, 4], [3, 4], [1, 5]];
const EASY_FRACTIONS   = [[1, 2], [1, 4], [3, 4], [1, 5], [1, 8]];

function toDecimal([num, den]) {
  return Math.round((num / den) * 1000) / 1000;
}

function toPercent([num, den]) {
  return Math.round((num / den) * 100);
}

export default {
  id: 'fractions',
  name: 'Fractions & décimales',
  category: 'numerique',
  icon: '½',
  isSequential: false,
  requiresSpecialInput: false,
  numpadExtras: ['dot'],

  getInputType() { return 'numeric'; },

  generate(difficulty) {
    let direction, frac, question, answer, display, extraData;

    if (difficulty === 1) {
      // Fraction → decimal (simple fractions)
      frac = pick(SIMPLE_FRACTIONS);
      direction = 'frac-to-dec';
      const dec = toDecimal(frac);
      question = `${frac[0]}/${frac[1]} = ?`;
      answer = String(dec);
      display = { type: 'fraction', num: frac[0], den: frac[1] };
      extraData = { direction, answerType: 'decimal' };

    } else if (difficulty === 2) {
      // Decimal → fraction (show decimal and denominator, user types numerator)
      frac = pick(EASY_FRACTIONS);
      direction = 'dec-to-frac';
      const dec = toDecimal(frac);
      question = `${dec} = ? / ${frac[1]}`;
      answer = String(frac[0]);
      display = { type: 'decimal-to-frac', decimal: dec, den: frac[1] };
      extraData = { direction, answerType: 'integer' };

    } else if (difficulty === 3) {
      // Fraction → percent
      frac = pick(ALL_FRACTIONS);
      direction = 'frac-to-pct';
      const pct = toPercent(frac);
      question = `${frac[0]}/${frac[1]} = ? %`;
      answer = String(pct);
      display = { type: 'fraction', num: frac[0], den: frac[1], suffix: '= ? %' };
      extraData = { direction, answerType: 'integer' };

    } else if (difficulty === 4) {
      // Percent → decimal
      frac = pick(ALL_FRACTIONS);
      direction = 'pct-to-dec';
      const pct = toPercent(frac);
      const dec = toDecimal(frac);
      question = `${pct} % = ?`;
      answer = String(dec);
      display = { type: 'text', text: `${pct} % = ?` };
      extraData = { direction, answerType: 'decimal' };

    } else {
      // D5: mix of all directions
      const directions = ['frac-to-dec', 'dec-to-frac', 'frac-to-pct', 'pct-to-dec'];
      direction = pick(directions);
      frac = pick(ALL_FRACTIONS);

      if (direction === 'frac-to-dec') {
        const dec = toDecimal(frac);
        question = `${frac[0]}/${frac[1]} = ?`;
        answer = String(dec);
        display = { type: 'fraction', num: frac[0], den: frac[1] };
        extraData = { direction, answerType: 'decimal' };

      } else if (direction === 'dec-to-frac') {
        const dec = toDecimal(frac);
        question = `${dec} = ? / ${frac[1]}`;
        answer = String(frac[0]);
        display = { type: 'decimal-to-frac', decimal: dec, den: frac[1] };
        extraData = { direction, answerType: 'integer' };

      } else if (direction === 'frac-to-pct') {
        const pct = toPercent(frac);
        question = `${frac[0]}/${frac[1]} = ? %`;
        answer = String(pct);
        display = { type: 'fraction', num: frac[0], den: frac[1], suffix: '= ? %' };
        extraData = { direction, answerType: 'integer' };

      } else {
        const pct = toPercent(frac);
        const dec = toDecimal(frac);
        question = `${pct} % = ?`;
        answer = String(dec);
        display = { type: 'text', text: `${pct} % = ?` };
        extraData = { direction, answerType: 'decimal' };
      }
    }

    return { question, answer, display, extraData };
  },

  validate(userAnswer, correctAnswer) {
    // Try float comparison first (covers both decimals and integers)
    const u = parseFloat(userAnswer);
    const c = parseFloat(correctAnswer);
    if (isNaN(u) || isNaN(c)) return { correct: false };
    return { correct: Math.abs(u - c) < 0.001 };
  },

  renderQuestion(container, item) {
    container.innerHTML = '';
    const display = item.display || {};

    const wrap = document.createElement('div');
    wrap.className = 'question-display';

    if (display.type === 'fraction') {
      // Render the fraction visually, then optional suffix
      const fracEl = renderFraction(display.num, display.den);
      wrap.appendChild(fracEl);
      if (display.suffix) {
        const suffix = document.createElement('span');
        suffix.className = 'frac-suffix';
        suffix.textContent = ' ' + display.suffix;
        wrap.appendChild(suffix);
      }
    } else if (display.type === 'decimal-to-frac') {
      // Show: 0.25 = ? / 4
      wrap.textContent = `${display.decimal} = `;
      const placeholder = document.createElement('span');
      placeholder.className = 'frac-unknown';
      placeholder.textContent = '?';
      wrap.appendChild(placeholder);
      const den = document.createElement('span');
      // Inline fraction-style: ? / den
      const fracPart = document.createElement('span');
      fracPart.className = 'frac-suffix';
      fracPart.textContent = ` / ${display.den}`;
      wrap.appendChild(fracPart);
    } else {
      // Plain text question
      wrap.textContent = display.text || item.question;
    }

    container.appendChild(wrap);
  },

  keyHandler(e, submitFn) {
    // No special key handling needed
  },

  getHint(item, userAnswer) {
    const dir = item.extraData?.direction;
    const correct = item.answer;
    switch (dir) {
      case 'frac-to-dec':
        return `Fraction → décimale : divisez numérateur ÷ dénominateur. Réponse : ${correct}`;
      case 'dec-to-frac':
        return `Décimale → fraction : trouvez le numérateur tel que ?/${item.extraData?.den || '?'} = ${item.question.split('=')[0].trim()}. Réponse : ${correct}`;
      case 'frac-to-pct':
        return `Fraction → % : (numérateur ÷ dénominateur) × 100. Réponse : ${correct}%`;
      case 'pct-to-dec':
        return `% → décimale : divisez par 100. Réponse : ${correct}`;
      default:
        return `Réponse attendue : ${correct}`;
    }
  },
};
