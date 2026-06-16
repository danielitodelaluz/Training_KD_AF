// mental-math-tricks.js — Astuces et techniques de calcul mental rapide

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default {
  id: 'mental-math-tricks',
  name: 'Calcul Rapide',
  category: 'numerique',
  icon: '⚡',
  isSequential: false,
  requiresSpecialInput: false,
  numpadExtras: [],

  getInputType() { return 'numeric'; },

  generate(difficulty) {
    const pool = {
      1: [this._times11_1d, this._complement100easy, this._times5_small],
      2: [this._times11_2d, this._times9, this._times5, this._complement100],
      3: [this._times25, this._complement1000, this._times9, this._squareN5],
      4: [this._squareN5, this._near100add, this._doubleHalf, this._times25, this._times11_2d],
      5: [this._near100mult, this._squareNear50, this._near100add, this._squareN5],
    };
    const fns = pool[difficulty] || pool[1];
    return pick(fns).call(this);
  },

  _times11_1d() {
    const n = rand(2, 9);
    return { question: `${n} × 11 = ?`, answer: String(n * 11),
      extraData: { trick: 'times11_1d', n } };
  },

  _times11_2d() {
    const n = rand(10, 89);
    return { question: `${n} × 11 = ?`, answer: String(n * 11),
      extraData: { trick: 'times11_2d', n } };
  },

  _times9() {
    const n = rand(2, 12);
    return { question: `${n} × 9 = ?`, answer: String(n * 9),
      extraData: { trick: 'times9', n } };
  },

  _times5_small() {
    const n = rand(2, 20);
    return { question: `${n} × 5 = ?`, answer: String(n * 5),
      extraData: { trick: 'times5', n } };
  },

  _times5() {
    const n = rand(2, 40);
    return { question: `${n} × 5 = ?`, answer: String(n * 5),
      extraData: { trick: 'times5', n } };
  },

  _times25() {
    const n = rand(2, 40);
    return { question: `${n} × 25 = ?`, answer: String(n * 25),
      extraData: { trick: 'times25', n } };
  },

  _complement100easy() {
    const n = rand(1, 9) * 10;
    return { question: `${n} + ? = 100`, answer: String(100 - n),
      extraData: { trick: 'complement100', n } };
  },

  _complement100() {
    const n = rand(1, 99);
    return { question: `${n} + ? = 100`, answer: String(100 - n),
      extraData: { trick: 'complement100', n } };
  },

  _complement1000() {
    const n = rand(100, 999);
    return { question: `${n} + ? = 1000`, answer: String(1000 - n),
      extraData: { trick: 'complement1000', n } };
  },

  _squareN5() {
    const n = rand(1, 9);
    const n5 = n * 10 + 5;
    return { question: `${n5}² = ?`, answer: String(n5 * n5),
      extraData: { trick: 'squareN5', n5, n } };
  },

  _near100add() {
    const a = rand(10, 299);
    const offset = pick([1, 2, 3]);
    const b = 100 - offset;
    return { question: `${a} + ${b} = ?`, answer: String(a + b),
      extraData: { trick: 'near100add', a, b, offset } };
  },

  _doubleHalf() {
    if (Math.random() < 0.5) {
      const n = rand(25, 250);
      return { question: `Double de ${n} = ?`, answer: String(n * 2),
        extraData: { trick: 'double', n } };
    }
    const n = rand(2, 100) * 2;
    return { question: `Moitié de ${n} = ?`, answer: String(n / 2),
      extraData: { trick: 'half', n } };
  },

  _near100mult() {
    const a = rand(1, 9), b = rand(1, 9);
    const x = 100 - a, y = 100 - b;
    return { question: `${x} × ${y} = ?`, answer: String(x * y),
      extraData: { trick: 'near100mult', x, y, a, b } };
  },

  _squareNear50() {
    const n = rand(-9, 9);
    const base = 50 + n;
    return { question: `${base}² = ?`, answer: String(base * base),
      extraData: { trick: 'squareNear50', base, n } };
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

  getHint(item, userAnswer) {
    const trick = item.extraData?.trick;
    const correct = parseInt(item.answer, 10);
    const { n, n5, a, b, offset, x, y, base } = item.extraData || {};

    switch (trick) {
      case 'times11_1d':
        return `Astuce ×11 (1 chiffre) : répétez le chiffre. ${n}×11 = ${n}${n} = ${correct}`;
      case 'times11_2d': {
        const d1 = Math.floor(n / 10), d2 = n % 10, mid = d1 + d2;
        if (mid < 10) return `Astuce ×11 : ${d1} | ${d1}+${d2}=${mid} | ${d2} → ${d1}${mid}${d2} = ${correct}`;
        return `Astuce ×11 avec retenue : ${d1} | ${mid} | ${d2} — la retenue du milieu s'ajoute à la dizaine → ${correct}`;
      }
      case 'times9':
        return `Astuce ×9 : ${n}×9 = ${n}×10 − ${n} = ${n * 10} − ${n} = ${correct}`;
      case 'times5':
        return `Astuce ×5 : divisez par 2 puis ×10. ${n}×5 = (${n}÷2)×10 = ${n / 2}×10 = ${correct}`;
      case 'times25':
        return `Astuce ×25 : ×100 puis ÷4. ${n}×25 = (${n}×100)÷4 = ${n * 100}÷4 = ${correct}`;
      case 'complement100': {
        const units = n % 10, tens = Math.floor(n / 10);
        if (units === 0) return `Complément à 100 : 10 − ${tens} = ${100 - n} dizaines → ${correct}`;
        return `Complément à 100 : unités → ${10 - units} (avec retenue), dizaines → ${9 - tens} → ${correct}`;
      }
      case 'complement1000': {
        const u2 = n % 10, t = Math.floor(n / 10) % 10, h = Math.floor(n / 100);
        return `Complément à 1000 : centaines 9−${h}, dizaines 9−${t}, unités 10−${u2} → ${correct}`;
      }
      case 'squareN5': {
        const nVal = Math.floor(n5 / 10);
        return `Carré en 5 : ${n5}² = ${nVal}×${nVal + 1}×100 + 25 = ${nVal * (nVal + 1)}×100 + 25 = ${nVal * (nVal + 1) * 100} + 25 = ${correct}`;
      }
      case 'near100add':
        return `Astuce +${b} : ajoutez 100 puis retirez ${offset}. ${a}+${b} = ${a}+100−${offset} = ${a + 100}−${offset} = ${correct}`;
      case 'double':
        return `Double : ${n}×2 = ${Math.floor(n / 10) * 10}×2 + ${n % 10}×2 = ${Math.floor(n / 10) * 20} + ${(n % 10) * 2} = ${correct}`;
      case 'half':
        return `Moitié : ${n}÷2 = ${Math.floor(n / 10) * 10}÷2 + ${n % 10}÷2 = ${Math.floor(n / 10) * 5} + ${(n % 10) / 2} = ${correct}`;
      case 'near100mult':
        return `Astuce (100−${a})(100−${b}) : base = 100−${a}−${b}=${100 - a - b}, correction = ${a}×${b}=${a * b}. Résultat = ${100 * (100 - a - b)} + ${a * b} = ${correct}`;
      case 'squareNear50': {
        const sign = n >= 0 ? '+' : '';
        return `Astuce (50${sign}${n})² : 2500 ${sign}${100 * n} + ${n * n} = ${correct}`;
      }
      default:
        return `Résultat attendu : ${correct}`;
    }
  },

  keyHandler() {},
};
