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

  configSpec: {
    intro: 'Ce nombre est-il divisible par… ?',
    params: [
      { id: 'divisors', label: 'Diviseurs', type: 'multi', def: [2, 3, 5],
        options: DIVISORS.map((d) => ({ v: d, l: String(d) })) },
      { id: 'digits', label: 'Taille', type: 'chips', def: 3,
        options: [{ v: 3, l: '3 chiffres' }, { v: 4, l: '4 chiffres' }, { v: 5, l: '5 chiffres' }] },
    ],
  },

  getInputType() { return 'choice'; },

  generate(params) {
    const divisors = params.divisors && params.divisors.length ? params.divisors : DIVISORS;
    const digits = params.digits ?? 3;
    const lo = 10 ** (digits - 1);
    const hi = 10 ** digits - 1;

    const divisor = pick(divisors);
    let n;
    if (Math.random() < 0.5) {
      // Multiple garanti du diviseur dans la plage
      const minMult = Math.ceil(lo / divisor);
      const maxMult = Math.floor(hi / divisor);
      n = rand(minMult, maxMult) * divisor;
    } else {
      do { n = rand(lo, hi); } while (n % divisor === 0);
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
