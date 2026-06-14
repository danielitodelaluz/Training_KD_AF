// divisibility.js — Divisibilité
import { buildChoiceButtons } from '../ui.js';

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const DIVISORS = [2, 3, 4, 5, 9];

// Format number with thin space as thousands separator
function formatNumber(n) {
  return n.toLocaleString('fr-FR');
}

export default {
  id: 'divisibility',
  name: 'Divisibilité',
  category: 'numerique',
  icon: '÷',
  isSequential: false,
  requiresSpecialInput: true,
  numpadExtras: [],

  getInputType() { return 'choice'; },

  generate(difficulty) {
    let n, divisor, isDivisible;

    if (difficulty === 1) {
      // 3-digit number, single divisor
      divisor = pick(DIVISORS);
      // 50% chance of being divisible
      if (Math.random() < 0.5) {
        // Pick a multiple of divisor in [100, 999]
        const minMult = Math.ceil(100 / divisor);
        const maxMult = Math.floor(999 / divisor);
        n = pick([...Array(maxMult - minMult + 1)].map((_, i) => (minMult + i) * divisor));
        isDivisible = true;
      } else {
        do { n = rand(100, 999); } while (n % divisor === 0);
        isDivisible = false;
      }

    } else if (difficulty === 2 || difficulty === 3) {
      // 4-digit number, single divisor
      divisor = pick(DIVISORS);
      if (Math.random() < 0.5) {
        const minMult = Math.ceil(1000 / divisor);
        const maxMult = Math.floor(9999 / divisor);
        n = pick([...Array(Math.min(maxMult - minMult + 1, 500))].map((_, i) => (minMult + i) * divisor));
        isDivisible = true;
      } else {
        do { n = rand(1000, 9999); } while (n % divisor === 0);
        isDivisible = false;
      }

    } else {
      // D4-D5: 4-5 digit number, pick one divisor (yes/no style)
      const digits = difficulty === 4 ? rand(1000, 9999) : rand(10000, 99999);
      divisor = pick(DIVISORS);
      if (Math.random() < 0.5) {
        const minMult = Math.ceil((difficulty === 4 ? 1000 : 10000) / divisor);
        const maxMult = Math.floor((difficulty === 4 ? 9999 : 99999) / divisor);
        n = pick([...Array(Math.min(maxMult - minMult + 1, 500))].map((_, i) => (minMult + i) * divisor));
        isDivisible = true;
      } else {
        const lo = difficulty === 4 ? 1000 : 10000;
        const hi = difficulty === 4 ? 9999 : 99999;
        do { n = rand(lo, hi); } while (n % divisor === 0);
        isDivisible = false;
      }
    }

    const answer = n % divisor === 0 ? 'oui' : 'non';
    const question = `${formatNumber(n)} est-il divisible par ${divisor} ?`;

    return {
      question,
      answer,
      extraData: { n, divisor, isDivisible: answer === 'oui' },
    };
  },

  validate(userAnswer, correctAnswer) {
    return { correct: userAnswer.toLowerCase() === correctAnswer.toLowerCase() };
  },

  renderQuestion(container, item, ctx) {
    container.innerHTML = `<div class="question-display">${item.question}</div>`;

    buildChoiceButtons(
      ctx.special,
      [
        { label: 'Oui', value: 'oui', className: 'btn-oui' },
        { label: 'Non', value: 'non', className: 'btn-non' },
      ],
      (val) => ctx.onAnswer(val)
    );
  },

  keyHandler(e, submitFn) {
    if (e.key === 'o' || e.key === 'y' || e.key === 'O' || e.key === 'Y') {
      submitFn('oui');
    } else if (e.key === 'n' || e.key === 'N') {
      submitFn('non');
    }
  },
};
