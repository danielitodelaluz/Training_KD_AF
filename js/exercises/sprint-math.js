// sprint-math.js — Sprint de calcul
// Contre-la-montre élémentaire : additions, soustractions et multiplications
// de base mélangées. Le chrono total ne compte que le temps de réflexion
// (les pauses de feedback sont exclues). Auto-validation sur bonne réponse ;
// une saisie fausse ne fait rien. Record personnel par configuration.

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const BEST_KEY = 'psy0_sprint_best';

function makeQuestion(ops) {
  const op = pick(ops);
  if (op === '+') {
    const a = rand(1, 9), b = rand(1, 9);
    return { str: `${a} + ${b}`, result: a + b };
  }
  if (op === '−') {
    // Résultat toujours ≥ 0
    const a = rand(2, 9), b = rand(1, a);
    return { str: `${a} − ${b}`, result: a - b };
  }
  const a = rand(2, 9), b = rand(2, 9);
  return { str: `${a} × ${b}`, result: a * b };
}

function loadBest(key) {
  try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}')[key] ?? null; }
  catch (_) { return null; }
}

function saveBest(key, ms) {
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
    all[key] = ms;
    localStorage.setItem(BEST_KEY, JSON.stringify(all));
  } catch (_) {}
}

export default {
  id: 'sprint-math',
  name: 'Sprint de calcul',
  category: 'numerique',
  icon: '⚡',
  isSequential: true,
  requiresSpecialInput: false,
  numpadExtras: [],
  _timers: [],
  _keyHandler: null,

  getInputType() { return 'none'; },
  generate() { return { question: '', answer: '' }; },
  validate(u, c) { return { correct: u === c }; },
  renderQuestion() {},

  startSequence(difficulty, onComplete) {
    this.cleanup();
    const qz = document.getElementById('exercise-question-zone');
    const si = document.getElementById('exercise-special-input');
    document.getElementById('numpad-area')?.classList.add('hidden');
    if (!qz) return;

    const cfg = {
      ops: ['+', '−', '×'],
      rounds: difficulty <= 2 ? 10 : difficulty <= 4 ? 20 : 30,
    };

    const flush  = () => { for (const t of this._timers) clearTimeout(t); this._timers = []; };
    const rmKey  = () => {
      if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
    };
    const hideNp = () => { if (si) { si.classList.add('hidden'); si.innerHTML = ''; } };
    const cfgKey = () => `${[...cfg.ops].sort().join('')}-${cfg.rounds}`;
    const fmtS   = (ms) => `${(ms / 1000).toFixed(1)}s`;

    // ── CONFIG ───────────────────────────────────────────────────────────
    const showConfig = () => {
      flush(); rmKey(); hideNp();
      qz.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'cha-config';
      qz.appendChild(wrap);

      const h = document.createElement('div');
      h.innerHTML = `<div class="cha-config-title">⚡ Sprint de calcul</div>
        <div class="cha-config-sub">Le plus vite possible, sans erreur — seules les bonnes réponses passent</div>`;
      wrap.appendChild(h);

      // Opérations (multi-sélection, au moins une)
      const opsRow = document.createElement('div');
      opsRow.className = 'cha-cfg-row';
      const opsLbl = document.createElement('div');
      opsLbl.className = 'cha-cfg-lbl';
      opsLbl.textContent = 'Opérations';
      const opsChips = document.createElement('div');
      opsChips.className = 'cha-chips';
      ['+', '−', '×'].forEach((op) => {
        const c = document.createElement('button');
        c.className = 'cha-chip' + (cfg.ops.includes(op) ? ' active' : '');
        c.textContent = op;
        c.style.minWidth = '44px';
        c.addEventListener('click', () => {
          if (cfg.ops.includes(op)) {
            if (cfg.ops.length === 1) return; // toujours au moins une opération
            cfg.ops = cfg.ops.filter((o) => o !== op);
            c.classList.remove('active');
          } else {
            cfg.ops.push(op);
            c.classList.add('active');
          }
          refreshBest();
        });
        opsChips.appendChild(c);
      });
      opsRow.append(opsLbl, opsChips);
      wrap.appendChild(opsRow);

      // Nombre de questions
      const nRow = document.createElement('div');
      nRow.className = 'cha-cfg-row';
      const nLbl = document.createElement('div');
      nLbl.className = 'cha-cfg-lbl';
      nLbl.textContent = 'Questions';
      const nChips = document.createElement('div');
      nChips.className = 'cha-chips';
      [10, 20, 30].forEach((n) => {
        const c = document.createElement('button');
        c.className = 'cha-chip' + (cfg.rounds === n ? ' active' : '');
        c.textContent = n;
        c.addEventListener('click', () => {
          cfg.rounds = n;
          nChips.querySelectorAll('.cha-chip').forEach((x) => x.classList.remove('active'));
          c.classList.add('active');
          refreshBest();
        });
        nChips.appendChild(c);
      });
      nRow.append(nLbl, nChips);
      wrap.appendChild(nRow);

      // Record pour cette configuration
      const bestEl = document.createElement('div');
      bestEl.className = 'cha-preview';
      wrap.appendChild(bestEl);
      const refreshBest = () => {
        const b = loadBest(cfgKey());
        bestEl.textContent = b !== null ? `🏆 Record : ${fmtS(b)}` : 'Pas encore de record — à vous de jouer !';
      };
      refreshBest();

      const startBtn = document.createElement('button');
      startBtn.className = 'btn btn-primary btn-full';
      startBtn.style.marginTop = '16px';
      startBtn.textContent = '▶ GO';
      startBtn.addEventListener('click', () => runSprint());
      wrap.appendChild(startBtn);
    };

    // ── SPRINT ───────────────────────────────────────────────────────────
    const runSprint = () => {
      flush(); rmKey();
      const items = [];
      let roundNum = 0;
      let buf = '';
      let t0 = 0;
      let q = null;
      let locked = false;
      let totalMs = 0; // somme des temps de réflexion (feedback exclu)

      qz.innerHTML = '';
      const screen = document.createElement('div');
      screen.className = 'cha-screen';
      qz.appendChild(screen);

      const headRow = document.createElement('div');
      headRow.style.cssText = 'display:flex;justify-content:space-between;width:100%;padding:0 4px;';
      const counterEl = document.createElement('div');
      counterEl.className = 'cha-counter';
      counterEl.style.alignSelf = 'auto';
      const clockEl = document.createElement('div');
      clockEl.className = 'cha-counter';
      clockEl.style.cssText = 'align-self:auto;color:var(--accent);font-variant-numeric:tabular-nums;';
      headRow.append(counterEl, clockEl);
      screen.appendChild(headRow);

      const exprEl = document.createElement('div');
      exprEl.className = 'cha-expr';
      exprEl.style.fontSize = '2.4rem';
      screen.appendChild(exprEl);

      const inputEl = document.createElement('div');
      inputEl.className = 'cha-input';
      inputEl.setAttribute('aria-live', 'polite');
      screen.appendChild(inputEl);

      const fbEl = document.createElement('div');
      fbEl.className = 'cha-fb';
      screen.appendChild(fbEl);

      // Chrono total en direct
      const tick = setInterval(() => {
        clockEl.textContent = fmtS(totalMs + (locked || !t0 ? 0 : performance.now() - t0));
      }, 100);
      this._timers.push(tick);

      // Pavé numérique plein écran (chiffres uniquement : résultats toujours ≥ 0)
      if (si) {
        si.classList.remove('hidden');
        si.innerHTML = '';
        const npGrid = document.createElement('div');
        npGrid.className = 'numpad-grid';
        ['7', '8', '9', '4', '5', '6', '1', '2', '3', '', '0', '⌫'].forEach((k) => {
          const b = document.createElement('button');
          if (k === '') {
            b.className = 'numpad-key';
            b.style.visibility = 'hidden';
          } else {
            b.className = k === '⌫' ? 'numpad-key numpad-key--backspace' : 'numpad-key';
            b.textContent = k;
            b.addEventListener('click', () => (k === '⌫' ? bksp() : digit(k)));
          }
          npGrid.appendChild(b);
        });
        si.appendChild(npGrid);
      }

      const autoCheck = () => {
        if (locked || !buf) return;
        if (parseInt(buf, 10) === q.result) submit();
      };
      const digit = (d) => {
        if (locked || buf.length >= 3) return;
        buf += d;
        inputEl.textContent = buf;
        autoCheck();
      };
      const bksp = () => {
        if (locked) return;
        buf = buf.slice(0, -1);
        inputEl.textContent = buf;
      };
      const submit = () => {
        locked = true;
        const ms = Math.round(performance.now() - t0);
        totalMs += ms;
        items.push({
          question: `${q.str} = ?`,
          correctAnswer: String(q.result),
          userAnswer: buf,
          correct: true,
          partial: false,
          time_ms: ms,
          difficulty,
        });
        fbEl.textContent = `✓ ${(ms / 1000).toFixed(2)}s`;
        fbEl.className = 'cha-fb cha-fb--ok';
        const t = setTimeout(() => (roundNum >= cfg.rounds ? showSummary(items, totalMs) : next()), 250);
        this._timers.push(t);
      };

      this._keyHandler = (e) => {
        if (e.key >= '0' && e.key <= '9') digit(e.key);
        else if (e.key === 'Backspace') { e.preventDefault(); bksp(); }
        // Pas de Enter : la validation est automatique sur bonne réponse uniquement
      };
      document.addEventListener('keydown', this._keyHandler);

      const next = () => {
        roundNum++;
        q = makeQuestion(cfg.ops);
        buf = '';
        locked = false;
        inputEl.textContent = '';
        fbEl.textContent = '';
        fbEl.className = 'cha-fb';
        counterEl.textContent = `${roundNum} / ${cfg.rounds}`;
        exprEl.textContent = `${q.str}  =`;
        t0 = performance.now();
      };

      next();
    };

    // ── RÉSUMÉ ───────────────────────────────────────────────────────────
    const showSummary = (items, totalMs) => {
      flush(); rmKey(); hideNp();
      const n = items.length;
      const times = items.map((i) => i.time_ms);
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / n);
      const best = Math.min(...times);
      const worst = Math.max(...times);
      const maxT = worst || 1;

      const key = cfgKey();
      const prevBest = loadBest(key);
      const isRecord = prevBest === null || totalMs < prevBest;
      if (isRecord) saveBest(key, totalMs);

      qz.innerHTML = '';
      const s = document.createElement('div');
      s.className = 'cha-summary';
      qz.appendChild(s);

      const hero = document.createElement('div');
      hero.style.cssText = 'text-align:center;';
      hero.innerHTML = `
        <div style="font-size:2.6rem;font-weight:900;color:var(--accent);font-variant-numeric:tabular-nums;">${fmtS(totalMs)}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;">
          ${isRecord ? '🏆 Nouveau record !' : `Record : ${fmtS(prevBest)}`}
        </div>`;
      s.appendChild(hero);

      const stats = document.createElement('div');
      stats.className = 'cha-stats';
      [
        { v: `${n}/${n}`, l: 'Correct', accent: true },
        { v: `${(avg / 1000).toFixed(2)}s`, l: 'Moyenne' },
        { v: `${(best / 1000).toFixed(2)}s`, l: 'Meilleur', accent: true },
        { v: `${(worst / 1000).toFixed(2)}s`, l: 'Pire' },
      ].forEach(({ v, l, accent }) => {
        const c = document.createElement('div');
        c.className = 'cha-stat';
        c.innerHTML = `<div class="cha-stat-v${accent ? ' good' : ''}">${v}</div><div class="cha-stat-l">${l}</div>`;
        stats.appendChild(c);
      });
      s.appendChild(stats);

      const recap = document.createElement('div');
      recap.className = 'cha-recap';
      recap.textContent = `${n} questions · opérations : ${cfg.ops.join(' ')}`;
      s.appendChild(recap);

      const chartWrap = document.createElement('div');
      chartWrap.className = 'cha-chart';
      const chartTitle = document.createElement('div');
      chartTitle.className = 'cha-chart-title';
      chartTitle.textContent = 'Temps par question';
      chartWrap.appendChild(chartTitle);
      const bars = document.createElement('div');
      bars.className = 'cha-bars';
      items.forEach((item, i) => {
        const h = Math.max(4, Math.round((item.time_ms / maxT) * 60));
        const b = document.createElement('div');
        b.className = 'cha-bar';
        b.style.height = h + 'px';
        b.title = `Q${i + 1}: ${(item.time_ms / 1000).toFixed(2)}s`;
        bars.appendChild(b);
      });
      chartWrap.appendChild(bars);
      s.appendChild(chartWrap);

      const btns = document.createElement('div');
      btns.className = 'cha-summary-btns';
      const mkBtn = (cls, txt, fn) => {
        const b = document.createElement('button');
        b.className = cls;
        b.textContent = txt;
        b.addEventListener('click', fn);
        btns.appendChild(b);
      };
      mkBtn('btn btn-secondary', '🔄 Rejouer',   () => runSprint());
      mkBtn('btn btn-secondary', '⚙ Configurer', () => showConfig());
      mkBtn('btn btn-primary',   '✓ Terminer',   () => { this.cleanup(); onComplete(items); });
      s.appendChild(btns);
    };

    showConfig();
  },

  cleanup() {
    const si = document.getElementById('exercise-special-input');
    if (si) { si.classList.add('hidden'); si.innerHTML = ''; }
    for (const t of this._timers) { clearTimeout(t); clearInterval(t); }
    this._timers = [];
    if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
  },
};
