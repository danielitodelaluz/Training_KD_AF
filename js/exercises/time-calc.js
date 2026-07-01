// time-calc.js — Calculs horaires
// Additions/soustractions d'heures, durées de vol, passage de minuit,
// fuseaux horaires. Épreuve classique de la sélection pilote.
// Réponse au format HHMM (ex : 14:35 → 1435). Les zéros de tête sont tolérés.

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const pad2 = (n) => String(n).padStart(2, '0');

// minutes (0..∞) → "HH:MM" (heure d'horloge, mod 24 h)
function fmtClock(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

// minutes → "XhMM" (durée)
function fmtDur(mins) {
  return `${Math.floor(mins / 60)}h${pad2(mins % 60)}`;
}

// minutes → réponse attendue "HHMM"
function toAnswer(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return pad2(Math.floor(m / 60)) + pad2(m % 60);
}

// Saisie utilisateur ("215", "0215", "1435"…) → minutes
function parseUser(s) {
  const digits = String(s).replace(/\D/g, '');
  if (!digits) return NaN;
  const m = parseInt(digits.slice(-2), 10);
  const h = parseInt(digits.slice(0, -2) || '0', 10);
  return h * 60 + m;
}

function fmtOffset(o) { return `UTC${o >= 0 ? '+' : '−'}${Math.abs(o)}`; }

export default {
  id: 'time-calc',
  name: 'Calculs horaires',
  category: 'aviation',
  icon: '🕐',
  isSequential: false,
  requiresSpecialInput: false,
  numpadExtras: [],

  getInputType() { return 'numeric'; },

  generate(difficulty) {
    let question, answerMins, sub = 'Réponse : HHMM';
    let extra = {};

    if (difficulty === 1) {
      // Heure + minutes (multiples de 5)
      const dep = rand(6, 20) * 60 + 5 * rand(0, 11);
      const add = 5 * rand(2, 11);
      question = `${fmtClock(dep)} + ${add} min = ?`;
      answerMins = dep + add;
      extra = { type: 'add', dep, dur: add };

    } else if (difficulty === 2) {
      // Heure + durée HhMM
      const dep = rand(5, 19) * 60 + rand(0, 59);
      const dur = rand(1, 4) * 60 + rand(1, 59);
      question = `${fmtClock(dep)} + ${fmtDur(dur)} = ?`;
      answerMins = dep + dur;
      extra = { type: 'add', dep, dur };

    } else if (difficulty === 3) {
      // Passage de minuit, ou soustraction
      if (Math.random() < 0.5) {
        const dep = rand(20, 23) * 60 + rand(0, 59);
        const dur = rand(2, 6) * 60 + rand(5, 59);
        question = `${fmtClock(dep)} + ${fmtDur(dur)} = ?`;
        answerMins = dep + dur;
        extra = { type: 'add', dep, dur };
      } else {
        const dep = rand(1, 22) * 60 + rand(0, 59);
        const sub2 = rand(0, 2) * 60 + rand(15, 59);
        question = `${fmtClock(dep)} − ${fmtDur(sub2)} = ?`;
        answerMins = dep - sub2;
        extra = { type: 'sub', dep, dur: sub2 };
      }

    } else if (difficulty === 4) {
      // Durée entre deux heures (temps de vol cale à cale)
      const dep = rand(5, 14) * 60 + rand(0, 59);
      const dur = rand(1, 9) * 60 + rand(5, 59);
      const arr = dep + dur;
      question = `Départ ${fmtClock(dep)} · Arrivée ${fmtClock(arr)}\nDurée du vol ?`;
      answerMins = dur;
      sub = 'Réponse : HHMM (ex : 2h35 → 0235)';
      extra = { type: 'dur', dep, arr };

    } else {
      // Fuseaux horaires : heure locale d'arrivée
      const offDep = rand(-2, 3);
      let offArr;
      do { offArr = rand(-5, 4); } while (offArr === offDep);
      const dep = rand(6, 22) * 60 + 5 * rand(0, 11);
      const dur = rand(2, 9) * 60 + 5 * rand(1, 11);
      const arrLocal = dep - offDep * 60 + dur + offArr * 60;
      question = `Décollage ${fmtClock(dep)} (${fmtOffset(offDep)})\nVol de ${fmtDur(dur)}\nArrivée en ${fmtOffset(offArr)} : heure locale ?`;
      answerMins = arrLocal;
      extra = { type: 'tz', dep, dur, offDep, offArr };
    }

    return {
      question,
      answer: toAnswer(Math.max(0, extra.type === 'dur' ? answerMins : ((answerMins % 1440) + 1440) % 1440)),
      extraData: { ...extra, sub },
    };
  },

  validate(userAnswer, correctAnswer) {
    const u = parseUser(userAnswer);
    const c = parseUser(correctAnswer);
    if (isNaN(u) || isNaN(c)) return { correct: false };
    // Comparaison mod 24 h pour les heures d'horloge, directe pour les durées
    return { correct: u === c || ((u % 1440) + 1440) % 1440 === ((c % 1440) + 1440) % 1440 };
  },

  renderQuestion(container, item) {
    const lines = item.question.split('\n')
      .map((l) => `<div>${l}</div>`)
      .join('');
    container.innerHTML = `
      <div class="question-display size-md" style="line-height:1.5">${lines}</div>
      <div class="question-label" style="margin-top:12px">${item.extraData.sub}</div>
    `;
  },

  getHint(item) {
    const d = item.extraData;
    const ans = fmtClock(parseUser(item.answer));
    if (d.type === 'add') return `Ajoutez d'abord les heures pleines, puis les minutes. Si les minutes dépassent 60, retirez 60 et ajoutez 1 h. Résultat : ${ans}`;
    if (d.type === 'sub') return `Retirez les heures, puis les minutes (empruntez 60 min si besoin). Résultat : ${ans}`;
    if (d.type === 'dur') return `Comptez d'abord jusqu'à l'heure pleine suivante, puis les heures entières, puis le reste. Durée : ${fmtDur(parseUser(item.answer))}`;
    if (d.type === 'tz') {
      const utcDep = fmtClock(d.dep - d.offDep * 60);
      return `Convertissez en UTC : ${fmtClock(d.dep)} − (${d.offDep}) = ${utcDep} UTC. Ajoutez le vol (${fmtDur(d.dur)}), puis appliquez ${fmtOffset(d.offArr)}. Arrivée : ${ans}`;
    }
    return null;
  },

  keyHandler() {},
};
