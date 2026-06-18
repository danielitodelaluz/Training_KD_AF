// letter-bubbles.js — Bulles de lettres (mode exploration + mode chrono)
// Mode Exploration : bulles déplaçables librement, clic dans l'ordre sans chrono
// Mode Chrono     : 3 rounds chronométrés (comportement original)

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function pickLetters(count, scattered) {
  if (!scattered) {
    const start = rand(0, 26 - count);
    return ALPHABET.slice(start, start + count).split('');
  }
  const pool = ALPHABET.split('');
  const chosen = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen;
}

function layoutPositions(count, areaW, areaH, diameter) {
  const positions = [];
  const minDist = diameter + 8;
  let attempts = 0;
  while (positions.length < count && attempts < 2000) {
    attempts++;
    const x = rand(0, areaW - diameter);
    const y = rand(0, areaH - diameter);
    const cx = x + diameter / 2, cy = y + diameter / 2;
    const ok = positions.every((p) => {
      const dx = (p.x + diameter / 2) - cx;
      const dy = (p.y + diameter / 2) - cy;
      return Math.hypot(dx, dy) >= minDist;
    });
    if (ok) positions.push({ x, y });
  }
  while (positions.length < count) {
    positions.push({ x: rand(0, areaW - diameter), y: rand(0, areaH - diameter) });
  }
  return positions;
}

const CONFIGS = {
  1: { count: 5, diameter: 66, scattered: false, directions: ['asc'] },
  2: { count: 5, diameter: 62, scattered: false, directions: ['asc', 'desc'] },
  3: { count: 6, diameter: 58, scattered: true,  directions: ['asc', 'desc'] },
  4: { count: 6, diameter: 54, scattered: true,  directions: ['asc', 'desc'] },
  5: { count: 7, diameter: 50, scattered: true,  directions: ['asc', 'desc'] },
};

const ROUNDS = 3;

// ── Bubble DOM factory ─────────────────────────────────────────────────────
function makeBubble(letter, D, x, y, orderNum, draggable) {
  const el = document.createElement('div');
  el.dataset.letter = letter;
  el.dataset.done = '0';
  el.style.cssText = [
    'position:absolute',
    `left:${x}px`, `top:${y}px`,
    `width:${D}px`, `height:${D}px`,
    'border-radius:50%',
    'background:linear-gradient(145deg,#273449,#1e293b)',
    'border:2.5px solid #475569',
    'color:#e2e8f0',
    `font-size:${Math.round(D * 0.42)}px`,
    'font-weight:800',
    draggable ? 'cursor:grab' : 'cursor:pointer',
    'user-select:none',
    '-webkit-tap-highlight-color:transparent',
    'touch-action:none',
    'transition:background 0.13s,border-color 0.13s,box-shadow 0.15s,transform 0.1s',
    'display:flex', 'align-items:center', 'justify-content:center',
    'flex-direction:column',
    'z-index:1',
    'box-shadow:0 3px 8px rgba(0,0,0,0.45)',
  ].join(';');

  const letterEl = document.createElement('span');
  letterEl.textContent = letter;
  letterEl.style.cssText = 'pointer-events:none;line-height:1;';
  el.appendChild(letterEl);

  // Order badge (shown when "Voir ordre" is toggled)
  const orderEl = document.createElement('span');
  orderEl.dataset.orderBadge = '1';
  orderEl.textContent = orderNum;
  orderEl.style.cssText = [
    `font-size:${Math.round(D * 0.21)}px`,
    'color:#94a3b8',
    'display:none',
    'line-height:1',
    'margin-top:1px',
    'pointer-events:none',
  ].join(';');
  el.appendChild(orderEl);

  return el;
}

// ── Pointer drag attachment ────────────────────────────────────────────────
function attachDrag(bubble, container, areaW, areaH, D, onDragEnd) {
  let sx, sy, sl, st, wasDragged;

  bubble.addEventListener('pointerdown', (e) => {
    if (bubble.dataset.done === '1') return;
    e.preventDefault();
    wasDragged = false;
    sx = e.clientX; sy = e.clientY;
    sl = parseInt(bubble.style.left, 10);
    st = parseInt(bubble.style.top, 10);
    bubble.style.cursor = 'grabbing';
    bubble.style.zIndex = '10';
    bubble.style.transform = 'scale(1.08)';
    bubble.setPointerCapture(e.pointerId);
  });

  bubble.addEventListener('pointermove', (e) => {
    if (!(e.buttons & 1)) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.hypot(dx, dy) > 6) wasDragged = true;
    if (!wasDragged) return;
    bubble.style.left = Math.max(0, Math.min(areaW - D, sl + dx)) + 'px';
    bubble.style.top  = Math.max(0, Math.min(areaH - D, st + dy)) + 'px';
  });

  bubble.addEventListener('pointerup', () => {
    bubble.style.cursor = 'grab';
    bubble.style.zIndex = '1';
    bubble.style.transform = '';
    onDragEnd(wasDragged);
    wasDragged = false;
  });

  bubble.addEventListener('pointercancel', () => {
    bubble.style.cursor = 'grab';
    bubble.style.zIndex = '1';
    bubble.style.transform = '';
  });
}

// ── Bubble colour helpers ──────────────────────────────────────────────────
function setBubbleDone(b)  {
  b.style.background = 'linear-gradient(145deg,#16a34a,#22c55e)';
  b.style.borderColor = '#86efac';
  b.style.color = '#fff';
  b.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.35), 0 3px 8px rgba(0,0,0,0.4)';
  b.style.transform = 'scale(0.9)';
}
function setBubbleError(b) {
  b.style.background = 'linear-gradient(145deg,#b91c1c,#ef4444)';
  b.style.borderColor = '#fca5a5';
}
function setBubbleIdle(b)  {
  b.style.background = 'linear-gradient(145deg,#273449,#1e293b)';
  b.style.borderColor = '#475569';
  b.style.color = '#e2e8f0';
  b.style.transform = '';
  b.style.boxShadow = '0 3px 8px rgba(0,0,0,0.45)';
}
function setBubbleNext(b)  {
  b.style.boxShadow = '0 0 0 3px #6366f1, 0 0 22px rgba(99,102,241,0.7), 0 3px 8px rgba(0,0,0,0.4)';
}
function clearBubbleGlow(b) {
  b.style.boxShadow = '0 3px 8px rgba(0,0,0,0.45)';
}

// ══════════════════════════════════════════════════════════════════════════
export default {
  id: 'letter-bubbles',
  name: 'Bulles de lettres',
  category: 'attention',
  icon: '🫧',
  isSequential: true,
  requiresSpecialInput: false,
  numpadExtras: [],

  _timers: [],
  _keyHandler: null,

  getInputType() { return 'none'; },
  generate()     { return { question: 'Bulles de lettres', answer: '' }; },
  validate(u, c) { return { correct: u === c }; },
  renderQuestion() {},

  // ── Entry point ──────────────────────────────────────────────────────────
  startSequence(difficulty, onComplete) {
    this._timers = [];
    const cfg = CONFIGS[difficulty] || CONFIGS[1];

    const questionZone = document.getElementById('exercise-question-zone');
    const specialInput = document.getElementById('exercise-special-input');
    document.getElementById('numpad-area')?.classList.add('hidden');
    if (specialInput) { specialInput.classList.add('hidden'); specialInput.innerHTML = ''; }
    if (!questionZone) return;

    this._showModeChoice(questionZone, cfg, difficulty, onComplete);
  },

  // ── Mode choice screen ───────────────────────────────────────────────────
  _showModeChoice(qz, cfg, difficulty, onComplete) {
    qz.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'lb-choice-wrap';
    wrap.innerHTML = `
      <div class="lb-choice-icon">🫧</div>
      <div class="lb-choice-title">Bulles de lettres</div>
      <div class="lb-choice-desc">
        Cliquez les bulles dans le bon ordre le plus vite possible.<br>
        Commencez par explorer pour vous entraîner sans pression.
      </div>
      <button class="lb-mode-btn lb-mode-explore" id="lb-btn-explore">
        <span class="lb-mode-btn-icon">🕹</span>
        <span>
          <strong>Mode Exploration</strong>
          <small>Déplacez les bulles, entraînez-vous librement</small>
        </span>
      </button>
      <button class="lb-mode-btn lb-mode-timed" id="lb-btn-timed">
        <span class="lb-mode-btn-icon">⏱</span>
        <span>
          <strong>Mode Chrono</strong>
          <small>${ROUNDS} rounds chronométrés</small>
        </span>
      </button>
    `;
    qz.appendChild(wrap);

    const startTimed = () => this._startTimedRounds(difficulty, cfg, qz, onComplete);
    document.getElementById('lb-btn-explore').addEventListener('click', () => {
      this._startSandbox(difficulty, cfg, qz, startTimed);
    });
    document.getElementById('lb-btn-timed').addEventListener('click', startTimed);
  },

  // ── Sandbox (exploration) mode ───────────────────────────────────────────
  _startSandbox(difficulty, cfg, qz, onPlayTimed) {
    this._clearTimers();
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }

    const areaW = Math.min((qz.clientWidth || 360) - 16, 360);
    const areaH = 310;
    const D = cfg.diameter;

    let letters, direction, expected, idx, bubbles, showOrder, playArea;

    const highlightNext = () => {
      if (!bubbles) return;
      Object.values(bubbles).forEach(b => {
        if (b.dataset.done !== '1') clearBubbleGlow(b);
      });
      if (idx < expected.length) {
        const nb = bubbles[expected[idx]];
        if (nb && nb.dataset.done !== '1') setBubbleNext(nb);
      }
    };

    const handleClick = (letter) => {
      const b = bubbles[letter];
      if (!b || b.dataset.done === '1') return;
      const exp = expected[idx];
      if (letter === exp) {
        b.dataset.done = '1';
        setBubbleDone(b);
        idx++;
        const statusEl = qz.querySelector('#lb-sand-status');
        if (idx >= expected.length) {
          if (statusEl) { statusEl.textContent = '✓ Parfait ! Toutes les bulles dans l\'ordre.'; statusEl.style.color = '#22c55e'; }
        } else {
          highlightNext();
        }
      } else {
        setBubbleError(b);
        const t = setTimeout(() => {
          if (b.dataset.done !== '1') setBubbleIdle(b);
        }, 380);
        this._timers.push(t);
      }
    };

    const buildScene = () => {
      qz.innerHTML = '';

      // Header
      const header = document.createElement('div');
      header.className = 'lb-sand-header';
      header.innerHTML = `
        <div class="lb-sand-dir">
          Ordre ${direction === 'asc' ? 'alphabétique (A→Z)' : 'inverse (Z→A)'}
        </div>
        <div class="lb-sand-sub">Glisse les bulles · Clique dans l'ordre</div>
        <div id="lb-sand-status" class="lb-sand-status"></div>
      `;
      qz.appendChild(header);

      // Play area
      playArea = document.createElement('div');
      playArea.style.cssText = `position:relative;width:${areaW}px;height:${areaH}px;margin:0 auto;touch-action:none;border-radius:12px;background:rgba(15,23,42,0.6);border:1px solid #334155;overflow:hidden;`;
      qz.appendChild(playArea);

      bubbles = {};
      const positions = layoutPositions(cfg.count, areaW, areaH, D);

      letters.forEach((letter, i) => {
        const orderNum = expected.indexOf(letter) + 1;
        const b = makeBubble(letter, D, positions[i].x, positions[i].y, orderNum, true);

        let wasThisDragged = false;
        attachDrag(b, playArea, areaW, areaH, D, (dragged) => { wasThisDragged = dragged; });

        b.addEventListener('click', () => {
          if (wasThisDragged) { wasThisDragged = false; return; }
          handleClick(letter);
        });

        playArea.appendChild(b);
        bubbles[letter] = b;
      });

      if (showOrder) {
        Object.values(bubbles).forEach(b => {
          const badge = b.querySelector('[data-order-badge]');
          if (badge) badge.style.display = 'block';
        });
      }

      highlightNext();

      // Controls
      const controls = document.createElement('div');
      controls.className = 'lb-sand-controls';
      controls.innerHTML = `
        <button class="lb-ctrl-btn" id="lb-btn-new">🔄 Nouveau</button>
        <button class="lb-ctrl-btn lb-ctrl-hint" id="lb-btn-hint">${showOrder ? '🙈 Masquer' : '👁 Voir ordre'}</button>
        <button class="lb-ctrl-btn lb-ctrl-reset" id="lb-btn-reset">📍 Réinitialiser</button>
        <button class="lb-ctrl-btn lb-ctrl-play" id="lb-btn-play">⏱ Jouer</button>
      `;
      qz.appendChild(controls);

      document.getElementById('lb-btn-new').addEventListener('click', () => newGame());
      document.getElementById('lb-btn-hint').addEventListener('click', () => {
        showOrder = !showOrder;
        Object.values(bubbles).forEach(b => {
          if (b.dataset.done === '1') return;
          const badge = b.querySelector('[data-order-badge]');
          if (badge) badge.style.display = showOrder ? 'block' : 'none';
        });
        const btn = document.getElementById('lb-btn-hint');
        if (btn) btn.textContent = showOrder ? '🙈 Masquer' : '👁 Voir ordre';
      });
      document.getElementById('lb-btn-reset').addEventListener('click', () => {
        // Re-scatter only; preserve click state (done bubbles stay done)
        const positions2 = layoutPositions(cfg.count, areaW, areaH, D);
        Object.keys(bubbles).forEach((letter, i) => {
          bubbles[letter].style.left = positions2[i].x + 'px';
          bubbles[letter].style.top  = positions2[i].y + 'px';
        });
        highlightNext();
      });
      document.getElementById('lb-btn-play').addEventListener('click', () => {
        this.cleanup();
        onPlayTimed();
      });
    };

    const newGame = () => {
      letters = pickLetters(cfg.count, cfg.scattered);
      const sorted = [...letters].sort();
      direction = pick(cfg.directions);
      expected = direction === 'asc' ? sorted : [...sorted].reverse();
      idx = 0;
      showOrder = false;
      buildScene();
    };

    newGame();

    this._keyHandler = (e) => {
      if (/^[a-zA-Z]$/.test(e.key)) handleClick(e.key.toUpperCase());
    };
    document.addEventListener('keydown', this._keyHandler);
  },

  // ── Timed rounds (original behaviour) ───────────────────────────────────
  _startTimedRounds(difficulty, cfg, qz, onComplete) {
    this._clearTimers();
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }

    const items = [];
    let roundNum = 0;
    const current = {
      bubbleByLetter: {}, expected: [], expectedIndex: 0,
      errors: 0, locked: true, startTime: 0, direction: 'asc',
    };

    const handleSelect = (letter) => {
      if (current.locked) return;
      const exp = current.expected[current.expectedIndex];
      const b = current.bubbleByLetter[letter];
      if (!b || b.dataset.done === '1') return;

      if (letter === exp) {
        b.dataset.done = '1';
        setBubbleDone(b);
        // clear glow on all others
        Object.values(current.bubbleByLetter).forEach(x => { if (x.dataset.done !== '1') clearBubbleGlow(x); });
        current.expectedIndex++;
        if (current.expectedIndex >= current.expected.length) {
          finishRound();
        } else {
          const nb = current.bubbleByLetter[current.expected[current.expectedIndex]];
          if (nb && nb.dataset.done !== '1') setBubbleNext(nb);
        }
      } else {
        setBubbleError(b);
        const t = setTimeout(() => {
          if (b.dataset.done !== '1') setBubbleIdle(b);
        }, 350);
        this._timers.push(t);
        current.errors++;
      }
    };

    const finishRound = () => {
      current.locked = true;
      const time_ms = Math.round(performance.now() - current.startTime);
      const correct = current.errors === 0;
      items.push({
        question: `${current.expected.length} bulles, ordre ${current.direction === 'asc' ? 'alphabétique' : 'inverse'}`,
        correctAnswer: current.expected.join(''),
        userAnswer: correct ? current.expected.join('') : `${current.errors} erreur(s)`,
        correct, partial: !correct, time_ms, difficulty,
      });
      const status = document.getElementById('lb-status');
      if (status) {
        status.textContent = correct ? `✓ Round réussi en ${(time_ms / 1000).toFixed(1)}s` : `Terminé — ${current.errors} erreur(s)`;
        status.style.color = correct ? '#22c55e' : '#f59e0b';
      }
      const t = setTimeout(startRound, 900);
      this._timers.push(t);
    };

    const startRound = () => {
      if (roundNum >= ROUNDS) { this.cleanup(); onComplete(items); return; }
      roundNum++;

      const letters = pickLetters(cfg.count, cfg.scattered);
      const sorted = [...letters].sort();
      const direction = pick(cfg.directions);
      const expected = direction === 'asc' ? sorted : [...sorted].reverse();

      Object.assign(current, {
        expected, direction, expectedIndex: 0, errors: 0,
        bubbleByLetter: {}, locked: true,
      });

      const areaW = Math.min((qz.clientWidth || 360) - 16, 360);
      const areaH = 310;
      const D = cfg.diameter;

      qz.innerHTML = `
        <div style="text-align:center;margin-bottom:8px;">
          <div style="font-size:1rem;font-weight:700;color:#e2e8f0;">
            Ordre ${direction === 'asc' ? 'alphabétique (A→Z)' : 'inverse (Z→A)'}
          </div>
          <div style="font-size:0.78rem;color:#94a3b8;margin-top:2px;">
            Round ${roundNum}/${ROUNDS} — cliquez vite et dans l'ordre
          </div>
          <div id="lb-status" style="font-size:0.82rem;min-height:1.1em;margin-top:4px;font-weight:600;"></div>
        </div>
      `;

      const playArea = document.createElement('div');
      playArea.style.cssText = `position:relative;width:${areaW}px;height:${areaH}px;margin:0 auto;border-radius:12px;background:rgba(15,23,42,0.6);border:1px solid #334155;overflow:hidden;`;
      qz.appendChild(playArea);

      const positions = layoutPositions(cfg.count, areaW, areaH, D);
      letters.forEach((letter, i) => {
        const b = makeBubble(letter, D, positions[i].x, positions[i].y, 0, false);
        b.addEventListener('click', () => handleSelect(letter));
        playArea.appendChild(b);
        current.bubbleByLetter[letter] = b;
      });

      const t = setTimeout(() => {
        current.locked = false;
        current.startTime = performance.now();
        // Highlight first expected bubble
        const nb = current.bubbleByLetter[expected[0]];
        if (nb) setBubbleNext(nb);
      }, 350);
      this._timers.push(t);
    };

    this._keyHandler = (e) => {
      if (/^[a-zA-Z]$/.test(e.key)) handleSelect(e.key.toUpperCase());
    };
    document.addEventListener('keydown', this._keyHandler);

    startRound();
  },

  // ── Helpers ──────────────────────────────────────────────────────────────
  _clearTimers() {
    for (const t of this._timers) clearTimeout(t);
    this._timers = [];
  },

  cleanup() {
    this._clearTimers();
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  },
};
