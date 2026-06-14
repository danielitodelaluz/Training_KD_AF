// multiplication.js — Tables de multiplication

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default {
  id: 'multiplication',
  name: 'Tables de multiplication',
  category: 'numerique',
  icon: '✖️',
  isSequential: false,
  requiresSpecialInput: false,
  numpadExtras: [],

  getInputType() { return 'numeric'; },

  generate(difficulty) {
    let question, answer;

    if (difficulty === 1) {
      // Table of 2, b ∈ [1,10]
      const a = 2;
      const b = rand(1, 10);
      question = `${a} × ${b} = ?`;
      answer = a * b;

    } else if (difficulty === 2) {
      // Tables 2-5, b ∈ [1,10]
      const a = rand(2, 5);
      const b = rand(1, 10);
      question = `${a} × ${b} = ?`;
      answer = a * b;

    } else if (difficulty === 3) {
      // Tables 2-9, b ∈ [1,12]
      const a = rand(2, 9);
      const b = rand(1, 12);
      question = `${a} × ${b} = ?`;
      answer = a * b;

    } else if (difficulty === 4) {
      // Tables 2-12, b ∈ [1,12]
      const a = rand(2, 12);
      const b = rand(1, 12);
      question = `${a} × ${b} = ?`;
      answer = a * b;

    } else {
      // D5: "missing factor" — show "a × ? = c", user types the missing factor
      const a = rand(2, 12);
      const b = rand(1, 12);
      const c = a * b;
      question = `${a} × ? = ${c}`;
      answer = b;
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
    // No special key handling needed
  },
};
