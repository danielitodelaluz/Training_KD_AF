// letter-gap.js — Écart de lettres
// Détermine l'écart (nombre de positions) entre deux lettres de l'alphabet.
// Ex. : J (10) et O (15) → écart 5. La paire est présentée dans un ordre
// aléatoire, donc l'exercice s'entraîne dans le sens croissant ET décroissant.
// Réponse numérique (l'écart est toujours ≥ 1). Auto-validation par le pavé.

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const rankOf = (letter) => ALPHABET.indexOf(letter) + 1;

// Tire une paire de lettres séparées d'un écart dans [minGap, maxGap],
// toutes deux comprises dans les positions 0..zoneMax.
function makeGap(minGap, maxGap, zoneMax, ascending) {
  const gap = rand(minGap, Math.min(maxGap, zoneMax));
  const startIdx = rand(0, zoneMax - gap);
  const lowIdx = startIdx;
  const highIdx = startIdx + gap;
  const [firstIdx, secondIdx] = ascending ? [lowIdx, highIdx] : [highIdx, lowIdx];
  return {
    first: ALPHABET[firstIdx],
    second: ALPHABET[secondIdx],
    gap,
    ascending,
  };
}

const AMPLITUDES = {
  small: [1, 3],
  medium: [4, 8],
  large: [9, 15],
  free: [1, 25],
};

export default {
  id: 'letter-gap',
  name: 'Écart de lettres',
  category: 'lettres',
  icon: '📏',
  isSequential: false,
  requiresSpecialInput: false,
  numpadExtras: [],

  configSpec: {
    intro: 'Trouvez l\'écart de positions entre les deux lettres',
    params: [
      { id: 'amplitude', label: 'Écart', type: 'chips', def: 'free',
        options: [{ v: 'small', l: '1-3' }, { v: 'medium', l: '4-8' }, { v: 'large', l: '9-15' }, { v: 'free', l: 'Libre' }] },
      { id: 'zone', label: 'Zone', type: 'chips', def: 'all',
        options: [{ v: 'am', l: 'A–M' }, { v: 'all', l: 'A–Z' }] },
      { id: 'direction', label: 'Sens affiché', type: 'chips', def: 'mix',
        options: [{ v: 'asc', l: 'Croissant' }, { v: 'desc', l: 'Décroissant' }, { v: 'mix', l: 'Mixte' }] },
    ],
  },

  getInputType() { return 'numeric'; },

  generate(params) {
    const [minGap, maxGap] = AMPLITUDES[params.amplitude] ?? AMPLITUDES.free;
    const zoneMax = params.zone === 'am' ? 12 : 25;
    const ascending = params.direction === 'asc' ? true
      : params.direction === 'desc' ? false
      : Math.random() < 0.5;

    const { first, second, gap } = makeGap(minGap, maxGap, zoneMax, ascending);

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
