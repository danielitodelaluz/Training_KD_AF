// letter-gap.js — Écart de lettres
// Détermine l'écart (nombre de positions) entre deux lettres de l'alphabet.
// Ex. : J (10) et O (15) → écart 5. La paire est présentée dans un ordre
// aléatoire, donc l'exercice s'entraîne dans le sens croissant ET décroissant.
// Réponse numérique (l'écart est toujours ≥ 1). Auto-validation par le pavé.

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const rankOf = (letter) => ALPHABET.indexOf(letter) + 1;

// Tire une paire de lettres séparées d'un écart dans [minGap, maxGap],
// toutes deux comprises dans les positions 0..zoneMax. Ordre d'affichage
// aléatoire (croissant ou décroissant).
function makeGap(minGap, maxGap, zoneMax) {
  const gap = rand(minGap, Math.min(maxGap, zoneMax));
  const startIdx = rand(0, zoneMax - gap);
  const lowIdx = startIdx;
  const highIdx = startIdx + gap;
  const ascending = Math.random() < 0.5;
  const [firstIdx, secondIdx] = ascending ? [lowIdx, highIdx] : [highIdx, lowIdx];
  return {
    first: ALPHABET[firstIdx],
    second: ALPHABET[secondIdx],
    gap,
    ascending,
  };
}

export default {
  id: 'letter-gap',
  name: 'Écart de lettres',
  category: 'lettres',
  icon: '📏',
  isSequential: false,
  requiresSpecialInput: false,
  numpadExtras: [],

  getInputType() { return 'numeric'; },

  generate(difficulty) {
    // Par niveau : amplitude de l'écart + zone de l'alphabet autorisée
    let minGap, maxGap, zoneMax;
    if (difficulty === 1)      { minGap = 1; maxGap = 3;  zoneMax = 12; } // A-M, petits écarts
    else if (difficulty === 2) { minGap = 1; maxGap = 5;  zoneMax = 25; } // tout l'alphabet
    else if (difficulty === 3) { minGap = 3; maxGap = 8;  zoneMax = 25; }
    else if (difficulty === 4) { minGap = 5; maxGap = 15; zoneMax = 25; }
    else                       { minGap = 1; maxGap = 25; zoneMax = 25; } // écart libre

    const { first, second, gap, ascending } = makeGap(minGap, maxGap, zoneMax);

    return {
      question: `${first}   →   ${second}`,
      answer: String(gap),
      extraData: { first, second, gap, ascending },
    };
  },

  validate(userAnswer, correctAnswer) {
    const u = parseInt(userAnswer, 10);
    const c = parseInt(correctAnswer, 10);
    if (isNaN(u) || isNaN(c)) return { correct: false };
    return { correct: u === c };
  },

  renderQuestion(container, item) {
    container.innerHTML = `
      <div class="question-label">Écart entre les deux lettres ?</div>
      <div class="question-display" style="letter-spacing:0.1em">${item.question}</div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-top:10px">A = 1 … Z = 26</div>
    `;
  },

  getHint(item) {
    const { first, second, gap } = item.extraData;
    const r1 = rankOf(first);
    const r2 = rankOf(second);
    const hi = Math.max(r1, r2);
    const lo = Math.min(r1, r2);
    return `${first} est en position ${r1}, ${second} en position ${r2}. Écart : ${hi} − ${lo} = ${gap}.`;
  },

  keyHandler() {},
};
