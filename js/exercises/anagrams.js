// anagrams.js — Anagrammes de mots français

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const WORDS = {
  1: [
    { w: 'CHAT', cat: 'Animal' }, { w: 'VENT', cat: 'Nature' }, { w: 'ROSE', cat: 'Fleur' },
    { w: 'LUNE', cat: 'Astronomie' }, { w: 'BOIS', cat: 'Nature' }, { w: 'LION', cat: 'Animal' },
    { w: 'OURS', cat: 'Animal' }, { w: 'MIEL', cat: 'Aliment' }, { w: 'PIED', cat: 'Corps' },
    { w: 'DENT', cat: 'Corps' }, { w: 'BASE', cat: 'Général' }, { w: 'FOND', cat: 'Général' },
    { w: 'TOUR', cat: 'Architecture' }, { w: 'PORT', cat: 'Lieu' }, { w: 'SAGE', cat: 'Qualité' },
    { w: 'NUIT', cat: 'Temps' }, { w: 'LAIT', cat: 'Aliment' }, { w: 'TOIT', cat: 'Construction' },
  ],
  2: [
    { w: 'AVION', cat: 'Transport' }, { w: 'NUAGE', cat: 'Météo' }, { w: 'PLUME', cat: 'Oiseau' },
    { w: 'CARTE', cat: 'Objet' }, { w: 'CRANE', cat: 'Corps' }, { w: 'GLOBE', cat: 'Géographie' },
    { w: 'TABLE', cat: 'Meuble' }, { w: 'FORET', cat: 'Nature' }, { w: 'FLEUR', cat: 'Plante' },
    { w: 'VERRE', cat: 'Objet' }, { w: 'CHAMP', cat: 'Nature' }, { w: 'PISTE', cat: 'Sport/Aviation' },
    { w: 'CABLE', cat: 'Technique' }, { w: 'TIGRE', cat: 'Animal' }, { w: 'DELTA', cat: 'Aviation' },
    { w: 'ARBRE', cat: 'Nature' }, { w: 'BRISE', cat: 'Météo' }, { w: 'ORAGE', cat: 'Météo' },
    { w: 'CARPE', cat: 'Animal' }, { w: 'BLANC', cat: 'Couleur' },
  ],
  3: [
    { w: 'PILOTE', cat: 'Métier' }, { w: 'ORANGE', cat: 'Fruit' }, { w: 'JARDIN', cat: 'Lieu' },
    { w: 'DESERT', cat: 'Géographie' }, { w: 'CERISE', cat: 'Fruit' }, { w: 'GIRAFE', cat: 'Animal' },
    { w: 'MARCHE', cat: 'Action' }, { w: 'TOMATE', cat: 'Légume' }, { w: 'BALCON', cat: 'Architecture' },
    { w: 'RACINE', cat: 'Botanique' }, { w: 'RADEAU', cat: 'Transport' }, { w: 'BROCHE', cat: 'Objet' },
    { w: 'VERGER', cat: 'Lieu' }, { w: 'CHEMIN', cat: 'Lieu' }, { w: 'BARQUE', cat: 'Transport' },
  ],
  4: [
    { w: 'MACHINE', cat: 'Technique' }, { w: 'COURAGE', cat: 'Qualité' }, { w: 'JOURNAL', cat: 'Média' },
    { w: 'SERPENT', cat: 'Animal' }, { w: 'FROMAGE', cat: 'Aliment' }, { w: 'MOUETTE', cat: 'Oiseau' },
    { w: 'CABINET', cat: 'Lieu' }, { w: 'SILENCE', cat: 'Sensation' }, { w: 'SPIRALE', cat: 'Forme' },
    { w: 'PARFAIT', cat: 'Qualité' }, { w: 'REVOLTE', cat: 'Action' }, { w: 'COLOMBE', cat: 'Oiseau' },
    { w: 'BARRAGE', cat: 'Construction' }, { w: 'PLATEAU', cat: 'Géographie' },
  ],
  5: [
    { w: 'BROUSSE', cat: 'Géographie' }, { w: 'TORNADE', cat: 'Météo' }, { w: 'CIRCUIT', cat: 'Technique' },
    { w: 'AURORE', cat: 'Météo' }, { w: 'MOUETTE', cat: 'Oiseau' }, { w: 'REVOLTE', cat: 'Histoire' },
    { w: 'PARCOURS', cat: 'Action' }, { w: 'COULEUR', cat: 'Vision' }, { w: 'SERVEUR', cat: 'Métier' },
    { w: 'LECTURE', cat: 'Action' }, { w: 'ENVOLÉE', cat: 'Aviation' }, { w: 'ROULEAU', cat: 'Objet' },
  ],
};

// Tous les mots regroupés par longueur réelle (7 = 7 lettres et plus)
const ALL_ENTRIES = Object.values(WORDS).flat();
const POOL_BY_LEN = {
  4: ALL_ENTRIES.filter((e) => e.w.length === 4),
  5: ALL_ENTRIES.filter((e) => e.w.length === 5),
  6: ALL_ENTRIES.filter((e) => e.w.length === 6),
  7: ALL_ENTRIES.filter((e) => e.w.length >= 7),
};

// Remove duplicate used words within a session by keeping them as class state
let _usedWords = new Set();

export default {
  id: 'anagrams',
  name: 'Anagrammes',
  category: 'lettres',
  icon: '🔀',
  isSequential: false,
  requiresSpecialInput: true,
  numpadExtras: [],

  configSpec: {
    intro: 'Reconstituez le mot français mélangé',
    params: [
      { id: 'lengths', label: 'Longueurs', type: 'multi', def: [5, 6],
        options: [{ v: 4, l: '4' }, { v: 5, l: '5' }, { v: 6, l: '6' }, { v: 7, l: '7+' }] },
    ],
  },

  // Mutable state shared between renderQuestion and keyHandler
  _tiles: null,
  _built: null,
  _wordLen: 0,
  _rerender: null,
  _onAnswer: null,

  getInputType() { return 'tiles'; },

  generate(params) {
    const lengths = params.lengths && params.lengths.length ? params.lengths : [5, 6];
    const pool = lengths.flatMap((len) => POOL_BY_LEN[len] || []);
    if (!pool.length) pool.push(...POOL_BY_LEN[5]);
    let entry;
    let attempts = 0;
    do {
      entry = pick(pool);
      attempts++;
    } while (_usedWords.has(entry.w) && attempts < pool.length);
    _usedWords.add(entry.w);
    if (_usedWords.size > 30) _usedWords.clear();

    const word = entry.w;
    let scrambled;
    let tries = 0;
    do {
      scrambled = shuffle(word.split('')).join('');
      tries++;
    } while (scrambled === word && tries < 20);

    return {
      question: `Anagramme : ${scrambled}`,
      answer: word,
      extraData: { word, scrambled, category: entry.cat },
    };
  },

  validate(userAnswer, correctAnswer) {
    return { correct: userAnswer.toUpperCase() === correctAnswer.toUpperCase() };
  },

  renderQuestion(container, item, ctx) {
    const { scrambled, word, category } = item.extraData;
    container.innerHTML = '';

    const catEl = document.createElement('div');
    catEl.className = 'question-label';
    catEl.textContent = `Catégorie : ${category}`;
    container.appendChild(catEl);

    const hint = document.createElement('div');
    hint.className = 'anagram-scrambled';
    hint.textContent = scrambled;
    container.appendChild(hint);

    // Built word display
    const builtDisplay = document.createElement('div');
    builtDisplay.className = 'anagram-built';
    container.appendChild(builtDisplay);

    // Tile state (each tile has { char, id, used })
    const tiles = scrambled.split('').map((char, i) => ({ char, id: i, used: false }));
    const built = [];
    this._tiles = tiles;
    this._built = built;
    this._wordLen = word.length;
    this._onAnswer = ctx.onAnswer;

    const renderBuilt = () => {
      builtDisplay.innerHTML = '';
      for (let i = 0; i < word.length; i++) {
        const slot = document.createElement('div');
        slot.className = 'anagram-slot' + (built[i] ? ' filled' : '');
        slot.textContent = built[i]?.char ?? '';
        builtDisplay.appendChild(slot);
      }
    };

    const tilesEl = document.createElement('div');
    tilesEl.className = 'anagram-tiles';
    container.appendChild(tilesEl);

    const renderTiles = () => {
      tilesEl.innerHTML = '';
      tiles.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'anagram-tile' + (t.used ? ' used' : '');
        btn.textContent = t.char;
        btn.disabled = t.used;
        btn.addEventListener('click', () => {
          if (t.used) return;
          t.used = true;
          built.push(t);
          renderBuilt();
          renderTiles();
          if (built.length === word.length) {
            ctx.onAnswer(built.map(x => x.char).join(''));
          }
        });
        tilesEl.appendChild(btn);
      });
    };

    this._rerender = () => { renderBuilt(); renderTiles(); };
    renderBuilt();
    renderTiles();

    // Backspace in special area
    ctx.special.innerHTML = '';
    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-secondary btn-full';
    backBtn.style.minHeight = '52px';
    backBtn.textContent = '⌫ Effacer';
    backBtn.addEventListener('click', () => {
      if (built.length === 0) return;
      const t = built.pop();
      t.used = false;
      renderBuilt();
      renderTiles();
    });
    ctx.special.appendChild(backBtn);
  },

  getHint(item, userAnswer) {
    return `Le mot était : ${item.answer}. ${item.extraData.scrambled} → ${item.answer}`;
  },

  keyHandler(e, submitFn) {
    if (!this._tiles) return;
    if (/^[a-zA-ZÀ-ÿ]$/.test(e.key)) {
      const letter = e.key.toUpperCase();
      const tile = this._tiles.find(t => !t.used && t.char === letter);
      if (tile) {
        tile.used = true;
        this._built.push(tile);
        this._rerender?.();
        if (this._built.length === this._wordLen) {
          submitFn(this._built.map(t => t.char).join(''));
        }
      }
    } else if (e.key === 'Backspace') {
      if (this._built && this._built.length > 0) {
        const t = this._built.pop();
        t.used = false;
        this._rerender?.();
      }
    }
  },

  cleanup() {
    this._tiles = null;
    this._built = null;
    this._rerender = null;
    this._onAnswer = null;
  },
};
