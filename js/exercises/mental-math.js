// mental-math.js — Calcul mental

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default {
  id: 'mental-math',
  name: 'Calcul mental',
  category: 'numerique',
  icon: '🔢',
  isSequential: false,
  requiresSpecialInput: false,
  numpadExtras: ['neg'],

  getInputType() { return 'numeric'; },

  generate(difficulty) {
    let question, answer;

    if (difficulty === 1) {
      // +/− single digit (1-9)
      const a = rand(1, 9);
      const b = rand(1, 9);
      const op = pick(['+', '−']);
      const result = op === '+' ? a + b : a - b;
      question = `${a} ${op} ${b} = ?`;
      answer = result;

    } else if (difficulty === 2) {
      // +/− two-digit (10-99)
      const a = rand(10, 99);
      const b = rand(10, 99);
      const op = pick(['+', '−']);
      const result = op === '+' ? a + b : a - b;
      question = `${a} ${op} ${b} = ?`;
      answer = result;

    } else if (difficulty === 3) {
      // × single digit (2-9) or ÷ with guaranteed integer result
      const opType = pick(['×', '÷']);
      if (opType === '×') {
        const a = rand(2, 50);
        const b = rand(2, 9);
        question = `${a} × ${b} = ?`;
        answer = a * b;
      } else {
        // Generate result and divisor first, then compute dividend
        const result = rand(2, 50);
        const divisor = rand(2, 9);
        const dividend = result * divisor;
        question = `${dividend} ÷ ${divisor} = ?`;
        answer = result;
      }

    } else if (difficulty === 4) {
      // Mixed ×/÷/+/− two-digit × one-digit
      const ops = ['×', '÷', '+', '−'];
      const op = pick(ops);
      if (op === '×') {
        const a = rand(10, 99);
        const b = rand(2, 9);
        question = `${a} × ${b} = ?`;
        answer = a * b;
      } else if (op === '÷') {
        const result = rand(10, 99);
        const divisor = rand(2, 9);
        const dividend = result * divisor;
        question = `${dividend} ÷ ${divisor} = ?`;
        answer = result;
      } else if (op === '+') {
        const a = rand(10, 99);
        const b = rand(10, 99);
        question = `${a} + ${b} = ?`;
        answer = a + b;
      } else {
        const a = rand(10, 99);
        const b = rand(10, 99);
        question = `${a} − ${b} = ?`;
        answer = a - b;
      }

    } else {
      // D5: chain of 2 operations on 2-3 digit numbers
      const a = rand(10, 999);
      const b = rand(1, 99);
      const c = rand(1, 99);
      const op1 = pick(['+', '−']);
      const op2 = pick(['+', '−']);
      const mid = op1 === '+' ? a + b : a - b;
      const result = op2 === '+' ? mid + c : mid - c;
      question = `${a} ${op1} ${b} ${op2} ${c} = ?`;
      answer = result;
    }

    return {
      question,
      answer: String(answer),
    };
  },

  validate(userAnswer, correctAnswer) {
    const u = parseInt(userAnswer, 10);
    const c = parseInt(correctAnswer, 10);
    if (isNaN(u) || isNaN(c)) return { correct: false };
    return { correct: u === c };
  },

  renderQuestion(container, item) {
    container.innerHTML = `<div class="question-display">${item.question}</div>`;
  },

  keyHandler(e, submitFn) {
    // No special key handling needed — numpad handles input
  },
};
