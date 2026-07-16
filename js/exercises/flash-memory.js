// flash-memory.js — Mémoire flash (grille 4×4)

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];

function pickUnique(arr, count) {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function pickIndices(total, count) {
  const indices = Array.from({ length: total }, (_, i) => i);
  return pickUnique(indices, count);
}

export default {
  id: 'flash-memory',
  name: 'Mémoire flash',
  category: 'memoire',
  icon: '⚡',
  isSequential: true,
  requiresSpecialInput: false,
  numpadExtras: [],

  configSpec: {
    intro: 'Mémorisez les cases allumées en un éclair',
    params: [
      { id: 'count', label: 'Cases', type: 'stepper', min: 3, max: 8, def: 5 },
      { id: 'colors', label: 'Couleurs', type: 'chips', def: 1,
        note: 'Plusieurs couleurs = plus d\'informations à retenir',
        options: [{ v: 1, l: 'Une' }, { v: 3, l: '3' }, { v: 6, l: '6' }] },
      { id: 'display', label: 'Affichage', type: 'chips', def: 1000,
        options: [{ v: 1500, l: '1,5s' }, { v: 1000, l: '1s' }, { v: 600, l: '0,6s' }] },
    ],
  },

  _timers: [],

  getInputType() { return 'none'; },

  generate(_difficulty) {
    return { question: 'Mémoire flash', answer: '0' };
  },

  validate(userAnswer, correctAnswer) {
    return { correct: userAnswer === correctAnswer };
  },

  renderQuestion(_container, _item, _ctx) {
    // Not used for sequential exercises
  },

  startSequence(params, onComplete) {
    this._timers = [];

    const count = params.count ?? 5;
    const numColors = params.colors ?? 1;
    const displayMs = params.display ?? 1000;

    // Pick which cells to light and what colors to use
    const litIndices = pickIndices(16, count);
    const usedColors = COLORS.slice(0, numColors);

    // Assign colors to lit cells
    const cellColors = {}; // index -> color
    litIndices.forEach((idx, i) => {
      cellColors[idx] = usedColors[i % usedColors.length];
    });

    const questionZone = document.getElementById('exercise-question-zone');
    const specialInput = document.getElementById('exercise-special-input');
    if (!questionZone) return;

    questionZone.innerHTML = '';
    if (specialInput) specialInput.innerHTML = '';

    // Instruction
    const instrEl = document.createElement('div');
    instrEl.className = 'question-hint';
    instrEl.style.cssText = 'text-align:center;color:#94a3b8;font-size:0.9rem;margin-bottom:10px;';
    instrEl.textContent = 'Mémorisez les cellules allumées !';
    questionZone.appendChild(instrEl);

    // Build 4×4 grid
    const gridEl = document.createElement('div');
    gridEl.className = 'flash-grid';
    gridEl.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;max-width:260px;margin:0 auto;';

    const cellEls = [];
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'flash-cell';
      cell.dataset.index = String(i);
      cell.style.cssText = 'width:56px;height:56px;border-radius:8px;cursor:default;transition:background 0.15s,border-color 0.15s;border:2px solid transparent;';

      // Show lit state during display phase
      if (cellColors[i]) {
        cell.style.background = cellColors[i];
        cell.style.borderColor = cellColors[i];
      } else {
        cell.style.background = '#334155';
        cell.style.borderColor = '#475569';
      }
      gridEl.appendChild(cell);
      cellEls.push(cell);
    }
    questionZone.appendChild(gridEl);

    const selectedIndices = new Set();

    const hideAndAsk = () => {
      instrEl.textContent = 'Cliquez sur les cellules qui étaient allumées';

      // Gray out all cells
      cellEls.forEach((cell, i) => {
        cell.style.background = '#334155';
        cell.style.borderColor = '#475569';
        cell.style.cursor = 'pointer';

        cell.addEventListener('click', () => {
          const idx = parseInt(cell.dataset.index);
          if (selectedIndices.has(idx)) {
            selectedIndices.delete(idx);
            cell.style.background = '#334155';
            cell.style.borderColor = '#475569';
            cell.classList.remove('selected');
          } else {
            selectedIndices.add(idx);
            cell.style.background = '#6366f1';
            cell.style.borderColor = '#818cf8';
            cell.classList.add('selected');
          }
        });
      });

      // Add validate button in special input
      if (specialInput) {
        const validateBtn = document.createElement('button');
        validateBtn.className = 'choice-btn';
        validateBtn.textContent = 'Valider ✓';
        validateBtn.style.cssText = 'padding:12px 32px;font-size:1.1rem;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;margin-top:8px;';
        validateBtn.addEventListener('click', () => finalize());
        specialInput.appendChild(validateBtn);
      }
    };

    const finalize = () => {
      const correctSet = new Set(litIndices);
      const userSet = selectedIndices;

      // Compute score
      let hits = 0;
      let falseAlarms = 0;
      userSet.forEach(idx => {
        if (correctSet.has(idx)) hits++;
        else falseAlarms++;
      });
      const misses = count - hits;

      const correct = hits === count && falseAlarms === 0;
      const partial = !correct && hits > 0 && falseAlarms === 0 && misses === 0;
      // More nuanced: partial if more than half correct
      const partialFlag = !correct && (hits / count) >= 0.5 && falseAlarms <= 1;

      // Show results on cells
      cellEls.forEach((cell, i) => {
        const wasLit = correctSet.has(i);
        const wasSelected = userSet.has(i);
        if (wasLit && wasSelected) {
          cell.style.background = '#22c55e';
          cell.style.borderColor = '#86efac';
        } else if (wasLit && !wasSelected) {
          cell.style.background = '#f59e0b';
          cell.style.borderColor = '#fcd34d';
        } else if (!wasLit && wasSelected) {
          cell.style.background = '#ef4444';
          cell.style.borderColor = '#fca5a5';
        }
      });

      if (specialInput) {
        specialInput.innerHTML = `<div style="text-align:center;font-size:1rem;color:#94a3b8;padding:8px;">${hits}/${count} correctes${falseAlarms > 0 ? `, ${falseAlarms} erreur(s)` : ''}</div>`;
      }

      const item = {
        question: `Flash ${count} cellules`,
        correctAnswer: [...litIndices].sort((a, b) => a - b).join(','),
        userAnswer: [...userSet].sort((a, b) => a - b).join(','),
        correct,
        partial: partialFlag,
        time_ms: displayMs,
      };

      const doneTimer = setTimeout(() => onComplete([item]), 1200);
      this._timers.push(doneTimer);
    };

    // After display phase, hide and ask
    const displayTimer = setTimeout(hideAndAsk, displayMs);
    this._timers.push(displayTimer);
  },

  cleanup() {
    for (const t of this._timers) clearTimeout(t);
    this._timers = [];
  },
};
