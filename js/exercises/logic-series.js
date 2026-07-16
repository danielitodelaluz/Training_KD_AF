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

  configSpec: {
    intro: 'Trouvez le terme suivant de la suite',
    params: [
      { id: 'types', label: 'Types', type: 'multi', def: ['arith', 'geo'],
        options: [
          { v: 'arith', l: 'Arithmétiques' },
          { v: 'geo', l: 'Géométriques' },
          { v: 'alt', l: 'Alternées' },
          { v: 'quad', l: 'Différences' },
          { v: 'letter', l: 'Lettres' },
        ] },
    ],
  },

  getInputType() { return 'numeric'; },

  generate(params) {
    const types = params.types && params.types.length ? params.types : ['arith'];
    const type = pick(types);
    let terms, rule, answer, question, hint = '';

    if (type === 'arith') {
      // +N ou −N
      if (Math.random() < 0.5) {
        const start = rand(1, 20);
        const step = rand(2, 6);
        terms = [start, start+step, start+2*step, start+3*step, start+4*step];
        answer = start + 5 * step;
        rule = `+${step}`;
      } else {
        const start = rand(30, 100);
        const step = rand(3, 12);
        terms = [start, start-step, start-2*step, start-3*step, start-4*step];
        answer = start - 5 * step;
        rule = `−${step}`;
      }

    } else if (type === 'geo') {
      const start = rand(1, 5);
      const mult = pick([2, 3]);
      terms = [start, start*mult, start*mult**2, start*mult**3, start*mult**4];
      answer = start * mult ** 5;
      rule = `×${mult}`;

    } else if (type === 'alt') {
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

    } else if (type === 'quad') {
      const a0 = rand(1, 10);
      const d1 = rand(2, 5);
      const d2 = rand(1, 3);
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
      // Suites de lettres
      const startRank = rand(1, 15);
      const jumps = [rand(1, 4), rand(1, 4), rand(1, 4)];
      const ranks = [startRank];
      for (let i = 0; i < 5; i++) {
        ranks.push(ranks[ranks.length - 1] + jumps[i % jumps.length]);
      }
      terms = ranks.slice(0, 5).map((r) => rankLetter(r));
      answer = String(ranks[5]);
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
