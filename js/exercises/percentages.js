// percentages.js — Pourcentages

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default {
  id: 'percentages',
  name: 'Pourcentages',
  category: 'numerique',
  icon: '%',
  isSequential: false,
  requiresSpecialInput: false,
  numpadExtras: ['dot'],

  getInputType() { return 'numeric'; },

  generate(difficulty) {
    let question, answer, extraData;

    if (difficulty === 1) {
      // "X% de Y = ?" — simple percentages with round numbers
      const percents = [10, 20, 25, 50, 75];
      const bases    = [20, 40, 60, 80, 100, 120, 200, 400];
      const p = pick(percents);
      const base = pick(bases);
      const result = Math.round(base * p / 100);
      question = `${p}% de ${base} = ?`;
      answer = String(result);
      extraData = { type: 'd1', answerType: 'integer' };

    } else if (difficulty === 2) {
      // Arbitrary % of round number, integer answer
      // Ensure integer: pick result and %, compute base
      const p = pick([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80]);
      const bases = [100, 200, 300, 400, 500, 800, 1000];
      const base = pick(bases);
      const result = Math.round(base * p / 100);
      question = `${p}% de ${base} = ?`;
      answer = String(result);
      extraData = { type: 'd2', answerType: 'integer' };

    } else if (difficulty === 3) {
      // Reverse: "X est P% de ?" — find the whole (ensure integer result)
      const p = pick([10, 20, 25, 50]);
      // result * (p/100) = part → whole = part * (100/p)
      // Pick part as a clean multiple to get integer whole
      const multiplier = rand(2, 20);
      const part = multiplier * p;
      const whole = multiplier * 100;
      question = `${part} est ${p}% de ?`;
      answer = String(whole);
      extraData = { type: 'd3', answerType: 'integer' };

    } else if (difficulty === 4) {
      // "X est ?% de Y" — find the percentage
      const p = pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80]);
      const bases = [100, 200, 400, 500, 1000];
      const base = pick(bases);
      const part = Math.round(base * p / 100);
      question = `${part} est ?% de ${base}`;
      answer = String(p);
      extraData = { type: 'd4', answerType: 'integer' };

    } else {
      // D5: rule of three — "Si N pommes coûtent X€, combien coûtent M pommes?"
      // Keep answer as integer or 1-decimal
      const items = ['pommes', 'stylos', 'oranges', 'cahiers', 'bonbons'];
      const units = ['€', 'F', 'pts'];
      const item = pick(items);
      const unit = pick(units);

      // Ensure result is a clean number (integer or .5)
      const pricePerItem2 = pick([1, 2, 3, 4, 5]); // price per 2 items (so per-item is 0.5 unit)
      const n1 = pick([2, 3, 4, 5]);                // reference quantity
      const cost1 = n1 * pricePerItem2;             // total cost for n1 items (integer)
      const n2 = pick([3, 4, 6, 7, 8, 9, 10]);      // target quantity
      // result = n2 * (cost1 / n1)
      const resultRaw = n2 * cost1 / n1;
      const result = Math.round(resultRaw * 10) / 10;

      question = `Si ${n1} ${item} coûtent ${cost1}${unit}, combien coûtent ${n2} ${item} ?`;
      answer = String(result);
      extraData = { type: 'd5', answerType: 'decimal' };
    }

    return { question, answer, extraData };
  },

  validate(userAnswer, correctAnswer) {
    const u = parseFloat(userAnswer);
    const c = parseFloat(correctAnswer);
    if (isNaN(u) || isNaN(c)) return { correct: false };
    // D5 (rule of three) can produce .5 decimals — detect by checking if correct
    // answer is non-integer; all other levels have integer answers → exact match.
    const isDecimalAnswer = correctAnswer.includes('.');
    if (isDecimalAnswer) {
      return { correct: Math.abs(u - c) < 0.5 };
    }
    return { correct: Math.round(u) === Math.round(c) };
  },

  renderQuestion(container, item) {
    container.innerHTML = `<div class="question-display">${item.question}</div>`;
  },

  keyHandler(e, submitFn) {
    // No special key handling needed
  },
};
