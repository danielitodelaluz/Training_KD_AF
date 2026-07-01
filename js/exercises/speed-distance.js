// speed-distance.js — Vitesse · Distance · Temps
// Calcul mental aéronautique : règle des 60 (kt ÷ 60 = NM/min),
// taux de descente, plan à 300 ft/NM, consommation carburant.
// Toutes les réponses sont des entiers.

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default {
  id: 'speed-distance',
  name: 'Vitesse · Distance · Temps',
  category: 'aviation',
  icon: '✈️',
  isSequential: false,
  requiresSpecialInput: false,
  numpadExtras: [],

  getInputType() { return 'numeric'; },

  generate(difficulty) {
    let question, answer, unit, hintData;

    if (difficulty === 1) {
      // Vitesses multiples de 60 → NM/min entier
      const perMin = rand(1, 8);
      const kt = perMin * 60;
      const t = pick([10, 15, 20, 30, 45, 60]);
      question = `À ${kt} kt, quelle distance en ${t} min ?`;
      answer = perMin * t;
      unit = 'NM';
      hintData = { kt, perMin, t, type: 'dist' };

    } else if (difficulty === 2) {
      if (Math.random() < 0.5) {
        const perMin = rand(2, 8);
        const kt = perMin * 60;
        question = `${kt} kt = combien de NM par minute ?`;
        answer = perMin;
        unit = 'NM/min';
        hintData = { kt, perMin, type: 'permin' };
      } else {
        const perMin = rand(2, 8);
        const t = rand(3, 12);
        question = `À ${perMin * 60} kt, temps pour parcourir ${perMin * t} NM ?`;
        answer = t;
        unit = 'min';
        hintData = { kt: perMin * 60, perMin, t, type: 'time' };
      }

    } else if (difficulty === 3) {
      // Vitesses multiples de 30 (NM/min en x,5)
      const perMinHalf = pick([3, 5, 7, 9, 11, 13]); // demi-NM par minute × 2
      const kt = perMinHalf * 30;
      const t = 2 * rand(2, 8); // temps pair → distance entière
      const dist = (perMinHalf * t) / 2;
      if (Math.random() < 0.5) {
        question = `À ${kt} kt, quelle distance en ${t} min ?`;
        answer = dist;
        unit = 'NM';
        hintData = { kt, perMin: perMinHalf / 2, t, type: 'dist' };
      } else {
        question = `À ${kt} kt, temps pour parcourir ${dist} NM ?`;
        answer = t;
        unit = 'min';
        hintData = { kt, perMin: perMinHalf / 2, t, type: 'time' };
      }

    } else if (difficulty === 4) {
      // Retrouver la vitesse
      const perMin = rand(2, 8);
      const t = rand(3, 10);
      question = `${perMin * t} NM parcourus en ${t} min : vitesse sol ?`;
      answer = perMin * 60;
      unit = 'kt';
      hintData = { kt: perMin * 60, perMin, t, type: 'speed' };

    } else {
      // Descente, plan 300 ft/NM, carburant
      const v = pick(['vs', 'slope', 'fuel']);
      if (v === 'vs') {
        const t = rand(2, 8);
        const rate = pick([500, 1000, 1500, 2000]);
        question = `${t * rate} ft à perdre, taux ${rate} ft/min :\ntemps de descente ?`;
        answer = t;
        unit = 'min';
        hintData = { type: 'vs', rate };
      } else if (v === 'slope') {
        const dist = rand(10, 40);
        question = `Plan standard 300 ft/NM :\ndistance pour perdre ${dist * 300} ft ?`;
        answer = dist;
        unit = 'NM';
        hintData = { type: 'slope' };
      } else {
        const perMin = pick([10, 15, 20, 25, 30, 40]);
        const t = pick([60, 80, 90, 100, 120, 150]);
        const h = Math.floor(t / 60), m = t % 60;
        question = `Débit ${perMin} kg/min, vol de ${h}h${String(m).padStart(2, '0')} :\ncarburant consommé ?`;
        answer = perMin * t;
        unit = 'kg';
        hintData = { type: 'fuel', perMin, t };
      }
    }

    return {
      question,
      answer: String(answer),
      extraData: { unit, hintData },
    };
  },

  validate(userAnswer, correctAnswer) {
    const u = parseInt(userAnswer, 10);
    const c = parseInt(correctAnswer, 10);
    if (isNaN(u) || isNaN(c)) return { correct: false };
    return { correct: u === c };
  },

  renderQuestion(container, item) {
    const lines = item.question.split('\n').map((l) => `<div>${l}</div>`).join('');
    container.innerHTML = `
      <div class="question-display size-md" style="line-height:1.5">${lines}</div>
      <div class="question-label" style="margin-top:12px">Réponse en ${item.extraData.unit}</div>
    `;
  },

  getHint(item) {
    const d = item.extraData.hintData;
    const ans = item.answer;
    if (!d) return null;
    switch (d.type) {
      case 'dist':   return `Règle des 60 : ${d.kt} kt ÷ 60 = ${d.perMin} NM/min. ${d.perMin} × ${d.t} min = ${ans} NM.`;
      case 'time':   return `${d.kt} kt = ${d.perMin} NM/min. Distance ÷ ${d.perMin} = ${ans} min.`;
      case 'permin': return `Divisez les nœuds par 60 : ${d.kt} ÷ 60 = ${ans} NM/min.`;
      case 'speed':  return `${d.perMin * d.t} NM ÷ ${d.t} min = ${d.perMin} NM/min, soit ${d.perMin} × 60 = ${ans} kt.`;
      case 'vs':     return `Altitude à perdre ÷ taux : le résultat est ${ans} min.`;
      case 'slope':  return `Plan 300 ft/NM : divisez les ft par 300 (ou ft ÷ 1000 × 3,33). Résultat : ${ans} NM.`;
      case 'fuel':   return `${d.perMin} kg/min × ${d.t} min = ${ans} kg. Convertissez d'abord les heures en minutes.`;
      default:       return null;
    }
  },

  keyHandler() {},
};
