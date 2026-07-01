// headings.js — Caps & directions
// Rose des caps : cardinales, virages gauche/droite, caps inverses,
// virages enchaînés. Réponse en degrés (0/360 acceptés pour le Nord).

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const norm = (h) => ((h % 360) + 360) % 360;
const fmtHdg = (h) => String(norm(h) === 0 ? 360 : norm(h)).padStart(3, '0');

const CARDINALS = [
  { name: 'NORD', hdg: 360 }, { name: 'NORD-EST', hdg: 45 },
  { name: 'EST', hdg: 90 },   { name: 'SUD-EST', hdg: 135 },
  { name: 'SUD', hdg: 180 },  { name: 'SUD-OUEST', hdg: 225 },
  { name: 'OUEST', hdg: 270 },{ name: 'NORD-OUEST', hdg: 315 },
];

export default {
  id: 'headings',
  name: 'Caps & directions',
  category: 'aviation',
  icon: '🧭',
  isSequential: false,
  requiresSpecialInput: false,
  numpadExtras: [],

  getInputType() { return 'numeric'; },

  generate(difficulty) {
    let question, answer, hintData;

    if (difficulty === 1) {
      const c = pick(CARDINALS);
      question = `Quel cap pour voler vers le ${c.name} ?`;
      answer = c.hdg;
      hintData = { type: 'cardinal', name: c.name };

    } else if (difficulty === 2) {
      const h0 = 10 * rand(1, 36);
      const turn = pick([90, 180]);
      const right = Math.random() < 0.5;
      question = `Cap ${fmtHdg(h0)}, virage de ${turn}° par la ${right ? 'droite' : 'gauche'} :\nnouveau cap ?`;
      answer = norm(h0 + (right ? turn : -turn));
      hintData = { type: 'turn', h0, turn: right ? turn : -turn };

    } else if (difficulty === 3) {
      const h0 = 5 * rand(1, 71);
      const turn = 5 * rand(2, 34); // 10..170
      const right = Math.random() < 0.5;
      question = `Cap ${fmtHdg(h0)}, virage de ${turn}° par la ${right ? 'droite' : 'gauche'} :\nnouveau cap ?`;
      answer = norm(h0 + (right ? turn : -turn));
      hintData = { type: 'turn', h0, turn: right ? turn : -turn };

    } else if (difficulty === 4) {
      const h0 = rand(1, 359);
      question = `Cap inverse du ${fmtHdg(h0)} ?`;
      answer = norm(h0 + 180);
      hintData = { type: 'reciprocal', h0 };

    } else {
      const h0 = 5 * rand(1, 71);
      const t1 = 5 * rand(2, 24), t2 = 5 * rand(2, 24);
      const r1 = Math.random() < 0.5, r2 = Math.random() < 0.5;
      question = `Cap ${fmtHdg(h0)}\n${t1}° par la ${r1 ? 'droite' : 'gauche'}, puis ${t2}° par la ${r2 ? 'droite' : 'gauche'} :\ncap final ?`;
      answer = norm(h0 + (r1 ? t1 : -t1) + (r2 ? t2 : -t2));
      hintData = { type: 'chain', h0, t1: r1 ? t1 : -t1, t2: r2 ? t2 : -t2 };
    }

    return {
      question,
      answer: String(norm(answer) === 0 ? 360 : norm(answer)),
      extraData: { hintData },
    };
  },

  validate(userAnswer, correctAnswer) {
    const u = parseInt(userAnswer, 10);
    const c = parseInt(correctAnswer, 10);
    if (isNaN(u) || isNaN(c)) return { correct: false };
    return { correct: norm(u) === norm(c) };
  },

  renderQuestion(container, item) {
    const lines = item.question.split('\n').map((l) => `<div>${l}</div>`).join('');
    container.innerHTML = `
      <div class="question-display size-md" style="line-height:1.5">${lines}</div>
      <div class="question-label" style="margin-top:12px">Réponse en degrés (Nord = 360)</div>
    `;
  },

  getHint(item) {
    const d = item.extraData.hintData;
    const ans = fmtHdg(parseInt(item.answer, 10));
    if (!d) return null;
    if (d.type === 'cardinal') return `Rose des caps : N=360, E=090, S=180, O=270 (intercardinales à ±45°). ${d.name} = ${ans}.`;
    if (d.type === 'turn') return `${fmtHdg(d.h0)} ${d.turn >= 0 ? '+' : '−'} ${Math.abs(d.turn)} = ${ans}. Si le résultat dépasse 360, retirez 360 ; s'il est négatif, ajoutez 360.`;
    if (d.type === 'reciprocal') return `Astuce : ${d.h0 < 180 ? '+200 puis −20' : '−200 puis +20'} (soit ±180). ${fmtHdg(d.h0)} → ${ans}.`;
    if (d.type === 'chain') return `Cumulez les virages : ${d.t1 >= 0 ? '+' : ''}${d.t1} ${d.t2 >= 0 ? '+' : ''}${d.t2} = ${d.t1 + d.t2 >= 0 ? '+' : ''}${d.t1 + d.t2}, appliqué au cap ${fmtHdg(d.h0)} → ${ans}.`;
    return null;
  },

  keyHandler() {},
};
