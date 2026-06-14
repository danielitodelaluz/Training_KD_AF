// logic-series.js — Séries logiques (arithmétiques, géométriques, lettres)

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function letterRank(ch) { return ALPHA.indexOf(ch.toUpperCase()) + 1; }
function rankLetter(n) { return ALPHA[((n - 1 + 26) % 26)]; }

export default {
  id: 'logic-series',
  name: 'Séries logiques',
  category: 'raisonnement',
  icon: '🔢',
  isSequential: false,
  requiresSpecialInput: false,
  numpadExtras: ['neg'],
  getInputType() { return 'numeric'; },

  generate(difficulty) {
    let terms, rule, answer, question, hint = '';

    if (difficulty === 1) {
      // Arithmetic +N
      const start = rand(1, 20);
      const step = rand(2, 6);
      terms = [start, start+step, start+2*step, start+3*step, start+4*step];
      answer = start + 5 * step;
      rule = `+${step}`;

    } else if (difficulty === 2) {
      // Arithmetic −N or ×2/×3
      const type = pick(['minus', 'multiply']);
      if (type === 'minus') {
        const start = rand(30, 100);
        const step = rand(3, 12);
        terms = [start, start-step, start-2*step, start-3*step, start-4*step];
        answer = start - 5 * step;
        rule = `−${step}`;
      } else {
        const start = rand(1, 5);
        const mult = pick([2, 3]);
        terms = [start, start*mult, start*mult**2, start*mult**3, start*mult**4];
        answer = start * mult ** 5;
        rule = `×${mult}`;
      }

    } else if (difficulty === 3) {
      // Alternating two rules: +A, +B, +A, +B...
      const start = rand(1, 15);
      const stepA = rand(2, 5);
      const stepB = rand(5, 12);
      terms = [start];
      for (let i = 0; i < 5; i++) {
        terms.push(terms[terms.length - 1] + (i % 2 === 0 ? stepA : stepB));
      }
      answer = terms[5];
      terms = terms.slice(0, 5);
      rule = `+${stepA}, +${stepB}, alternés`;

    } else if (difficulty === 4) {
      // Second differences (quadratic sequence)
      const a0 = rand(1, 10);
      const d1 = rand(2, 5);   // first difference (initial)
      const d2 = rand(1, 3);   // second difference (constant)
      terms = [a0];
      let currentDiff = d1;
      for (let i = 0; i < 5; i++) {
        terms.push(terms[terms.length - 1] + currentDiff);
        currentDiff += d2;
      }
      answer = terms[5];
      terms = terms.slice(0, 5);
      rule = 'différences des différences';

    } else {
      // Letter sequences
      const startRank = rand(1, 15);
      const jumps = [rand(1, 4), rand(1, 4), rand(1, 4)];
      // Sequence: each step adds a progressively increasing jump
      const ranks = [startRank];
      for (let i = 0; i < 5; i++) {
        ranks.push(ranks[ranks.length - 1] + jumps[i % jumps.length]);
      }
      terms = ranks.slice(0, 5).map((r) => rankLetter(r));
      answer = String(ranks[5]); // Answer is the rank (user types rank)
      const letterAnswer = rankLetter(ranks[5]);
      hint = `A=1 … Z=26 — répondez par le rang (${letterAnswer} = ${ranks[5]})`;
      question = terms.join(', ') + ', ?';
      return { question, answer, extraData: { type: 'letter', hint, letterAnswer } };
    }

    question = terms.join(', ') + ', ?';
    return { question, answer: String(answer), extraData: { type: 'number', rule } };
  },

  validate(userAnswer, correctAnswer) {
    const u = parseInt(userAnswer, 10);
    const c = parseInt(correctAnswer, 10);
    if (isNaN(u) || isNaN(c)) return { correct: false };
    return { correct: u === c };
  },

  renderQuestion(container, item) {
    const termsRaw = item.question.replace(', ?', '').split(', ');
    const hint = item.extraData?.hint || '';

    const seriesEl = document.createElement('div');
    seriesEl.className = 'series-container';

    for (const term of termsRaw) {
      const el = document.createElement('div');
      el.className = 'series-item';
      el.textContent = term;
      seriesEl.appendChild(el);
    }

    const qEl = document.createElement('div');
    qEl.className = 'series-item unknown';
    qEl.textContent = '?';
    seriesEl.appendChild(qEl);

    container.innerHTML = '';
    container.appendChild(seriesEl);

    if (hint) {
      const hintEl = document.createElement('div');
      hintEl.style.cssText = 'font-size:0.75rem;color:var(--text-muted);margin-top:12px;text-align:center;';
      hintEl.textContent = hint;
      container.appendChild(hintEl);
    }
  },

  keyHandler(e, submitFn) {
    // Standard numpad handles input
  },
};
