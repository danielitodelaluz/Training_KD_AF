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

  configSpec: {
    intro: 'Calculs de pourcentages, dans tous les sens',
    params: [
      { id: 'types', label: 'Questions', type: 'multi', def: ['pct'],
        options: [
          { v: 'pct', l: 'X% de Y' },
          { v: 'whole', l: 'Trouver le tout' },
          { v: 'findp', l: 'Trouver le %' },
          { v: 'rule3', l: 'Règle de trois' },
        ] },
      { id: 'values', label: 'Valeurs', type: 'chips', def: 'easy',
        options: [{ v: 'easy', l: 'Rondes' }, { v: 'hard', l: 'Variées' }] },
    ],
  },

  getInputType() { return 'numeric'; },

  generate(params) {
    const types = params.types && params.types.length ? params.types : ['pct'];
    const type = pick(types);
    const hard = params.values === 'hard';
    let question, answer, extraData;

    if (type === 'pct') {
      // "X% de Y = ?" — l'option Variées élargit les pourcentages et bases
      const percents = hard
        ? [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80]
        : [10, 20, 25, 50, 75];
      const bases = hard
        ? [100, 200, 300, 400, 500, 800, 1000]
        : [20, 40, 60, 80, 100, 120, 200, 400];
      const p = pick(percents);
      const base = pick(bases);
      const result = Math.round(base * p / 100);
      question = `${p}% de ${base} = ?`;
      answer = String(result);
      extraData = { type: 'd1', answerType: 'integer' };

    } else if (type === 'whole') {
      // "X est P% de ?" — retrouver le tout (résultat entier garanti)
      const p = pick(hard ? [5, 10, 20, 25, 40, 50] : [10, 20, 25, 50]);
      const multiplier = rand(2, 20);
      const part = multiplier * p;
      const whole = multiplier * 100;
      question = `${part} est ${p}% de ?`;
      answer = String(whole);
      extraData = { type: 'd3', answerType: 'integer' };

    } else if (type === 'findp') {
      // "X est ?% de Y"
      const p = pick(hard ? [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80] : [10, 20, 25, 50, 75]);
      const bases = hard ? [100, 200, 400, 500, 1000] : [100, 200, 400];
      const base = pick(bases);
      const part = Math.round(base * p / 100);
      question = `${part} est ?% de ${base}`;
      answer = String(p);
      extraData = { type: 'd4', answerType: 'integer' };

    } else {
      // Règle de trois — "Si N pommes coûtent X€, combien coûtent M pommes ?"
      const items = ['pommes', 'stylos', 'oranges', 'cahiers', 'bonbons'];
      const units = ['€', 'F', 'pts'];
      const item = pick(items);
      const unit = pick(units);
      const pricePerItem2 = pick([1, 2, 3, 4, 5]);
      const n1 = pick([2, 3, 4, 5]);
      const cost1 = n1 * pricePerItem2;
      const n2 = pick([3, 4, 6, 7, 8, 9, 10]);
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

  getHint(item, userAnswer) {
    const type = item.extraData?.type;
    const correct = item.answer;
    switch (type) {
      case 'd1':
      case 'd2': {
        const m = item.question.match(/(\d+)% de (\d+)/);
        if (m) {
          const [, p, base] = m;
          return `${p}% de ${base} : divisez par 100 puis multipliez par ${p}. ${base}÷100=${parseInt(base)/100}, ×${p}=${correct}`;
        }
        return null;
      }
      case 'd3': {
        const m = item.question.match(/(\d+) est (\d+)% de \?/);
        if (m) {
          const [, part, p] = m;
          return `"${part} est ${p}% de ?" → tout = ${part}×100÷${p} = ${correct}`;
        }
        return null;
      }
      case 'd4': {
        const m = item.question.match(/(\d+) est \?% de (\d+)/);
        if (m) {
          const [, part, base] = m;
          return `Trouvez % : (${part}÷${base})×100 = ${correct}%`;
        }
        return null;
      }
      case 'd5':
        return `Règle de trois : (quantité cible × coût total) ÷ quantité de départ. Résultat : ${correct}`;
      default:
        return `Résultat attendu : ${correct}`;
    }
  },
};
