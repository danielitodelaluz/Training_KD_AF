// prime-numbers.js — Nombres premiers vs composés

import { buildChoiceButtons } from '../ui.js';

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function isPrime(n) {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}

function buildPool(min, max) {
  const primes = [], composites = [];
  for (let n = min; n <= max; n++) {
    if (isPrime(n)) primes.push(n);
    else if (n > 1) composites.push(n);
  }
  return { primes, composites };
}

const POOLS = {
  1: buildPool(2, 30),
  2: buildPool(2, 100),
  3: buildPool(2, 300),
  4: buildPool(100, 600),
  5: buildPool(200, 999),
};

// Return smallest prime factor of n (n > 1, n composite)
function smallestFactor(n) {
  if (n % 2 === 0) return 2;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return i;
  return n; // shouldn't happen for composite
}

function digitSum(n) {
  return n.toString().split('').reduce((a, d) => a + parseInt(d), 0);
}

export default {
  id: 'prime-numbers',
  name: 'Nombres premiers',
  category: 'numerique',
  icon: '🔢',
  isSequential: false,
  requiresSpecialInput: true,
  numpadExtras: [],

  getInputType() { return 'choice'; },

  generate(difficulty) {
    const pool = POOLS[Math.min(difficulty, 5)];
    const isPrimeAnswer = Math.random() < 0.5;
    const src = isPrimeAnswer ? pool.primes : pool.composites;
    const n = src[Math.floor(Math.random() * src.length)];
    return {
      question: `${n}`,
      answer: isPrimeAnswer ? 'oui' : 'non',
      extraData: { n, isPrime: isPrimeAnswer },
    };
  },

  validate(userAnswer, correctAnswer) {
    return { correct: userAnswer.toLowerCase() === correctAnswer.toLowerCase() };
  },

  renderQuestion(container, item, ctx) {
    container.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'question-display';
    wrap.textContent = item.extraData.n;
    container.appendChild(wrap);

    const sub = document.createElement('div');
    sub.className = 'question-label';
    sub.textContent = 'Nombre premier ou composé ?';
    container.appendChild(sub);

    if (item.extraData.n <= 100) {
      const ref = document.createElement('div');
      ref.className = 'prime-ref';
      ref.textContent = 'Rappel règles : ÷2 (pair) · ÷3 (somme chiffres) · ÷5 (finit par 0/5)';
      container.appendChild(ref);
    }

    buildChoiceButtons(ctx.special, [
      { label: '★ Premier', value: 'oui', className: 'btn-oui' },
      { label: '✗ Composé', value: 'non', className: 'btn-non' },
    ], ctx.onAnswer);
  },

  getHint(item, userAnswer) {
    const n = item.extraData.n;
    const prime = item.answer === 'oui';

    if (prime) {
      return `${n} est premier : aucun diviseur entre 2 et ⌊√${n}⌋=${Math.floor(Math.sqrt(n))} ne le divise.`;
    }

    // Explain why it's composite
    if (n % 2 === 0) return `${n} est pair → divisible par 2 → composé. (${n}÷2=${n/2})`;
    const ds = digitSum(n);
    if (n % 3 === 0) return `Somme des chiffres de ${n} = ${ds}, divisible par 3 → composé. (${n}÷3=${n/3})`;
    if (n % 5 === 0) return `${n} se termine par 5 ou 0 → divisible par 5 → composé.`;
    if (n % 7 === 0) return `${n} est divisible par 7 → composé. (${n}÷7=${n/7})`;
    if (n % 11 === 0) return `${n} est divisible par 11 → composé. (${n}÷11=${n/11})`;
    if (n % 13 === 0) return `${n} est divisible par 13 → composé. (${n}÷13=${n/13})`;
    const f = smallestFactor(n);
    return `${n} est divisible par ${f} → composé. (${n}÷${f}=${n/f}) Testez les diviseurs premiers jusqu'à √${n}≈${Math.floor(Math.sqrt(n))}.`;
  },

  keyHandler(e, submitFn) {
    if (e.key === 'o' || e.key === 'y' || e.key === 'O' || e.key === 'Y') submitFn('oui');
    else if (e.key === 'n' || e.key === 'N') submitFn('non');
  },
};
