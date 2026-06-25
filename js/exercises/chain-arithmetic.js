// chain-arithmetic.js — Calcul mental en chaîne
// Additions et soustractions enchaînées sur N termes configurables.
// isSequential : gère config → rounds chronométrés → résumé.
// Auto-valide dès que la saisie correspond à la bonne réponse.
// Si la saisie est incorrecte : rien ne se passe.

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function makeExpression(numTerms, maxVal) {
  const nums = [rand(1, maxVal)];
  const ops = [];
  let total = nums[0];
  for (let i = 1; i < numTerms; i++) {
    const op = Math.random() < 0.5 ? '+' : '−';
    const n = rand(1, maxVal);
    nums.push(n);
    ops.push(op);
    total = op === '+' ? total + n : total - n;
  }
  const str = nums.map((n, i) => i === 0 ? `${n}` : `${ops[i - 1]} ${n}`).join('  ');
  return { result: total, str };
}

export default {
  id: 'chain-arithmetic',
  name: 'Calcul en chaîne',
  category: 'numerique',
  icon: '🔗',
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

    const DEFAULTS = {
      1: { terms: 2, maxVal: 9,  rounds: 8  },
      2: { terms: 3, maxVal: 9,  rounds: 8  },
      3: { terms: 3, maxVal: 19, rounds: 12 },
      4: { terms: 4, maxVal: 19, rounds: 12 },
      5: { terms: 5, maxVal: 29, rounds: 20 },
    };
    const cfg = { ...DEFAULTS[Math.min(difficulty, 5)] };

    const flush  = () => { for (const t of this._timers) clearTimeout(t); this._timers = []; };
    const rmKey  = () => {
      if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
    };
    const hideNp = () => { if (si) { si.classList.add('hidden'); si.innerHTML = ''; } };

    // ── CONFIG ───────────────────────────────────────────────────────────
    const showConfig = () => {
      flush(); rmKey(); hideNp();
      qz.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'cha-config';
      qz.appendChild(wrap);

      const h = document.createElement('div');
      h.innerHTML = `<div class="cha-config-title">🔗 Calcul en chaîne</div>
        <div class="cha-config-sub">Additions &amp; soustractions enchaînées</div>`;
      wrap.appendChild(h);

      const mkStepper = (label, key, min, max) => {
        const row = document.createElement('div');
        row.className = 'cha-cfg-row';
        const lbl = document.createElement('div');
        lbl.className = 'cha-cfg-lbl';
        lbl.textContent = label;
        const ctrl = document.createElement('div');
        ctrl.className = 'cha-stepper';
        const minus = document.createElement('button');
        minus.className = 'cha-step-btn';
        minus.textContent = '−';
        const val = document.createElement('div');
        val.className = 'cha-step-val';
        val.textContent = cfg[key];
        const plus = document.createElement('button');
        plus.className = 'cha-step-btn';
        plus.textContent = '+';
        minus.addEventListener('click', () => { cfg[key] = Math.max(min, cfg[key] - 1); val.textContent = cfg[key]; });
        plus.addEventListener('click',  () => { cfg[key] = Math.min(max, cfg[key] + 1); val.textContent = cfg[key]; });
        ctrl.append(minus, val, plus);
        row.append(lbl, ctrl);
        wrap.appendChild(row);
      };
      mkStepper('Termes', 'terms', 2, 7);

      const mkChips = (label, key, opts) => {
        const row = document.createElement('div');
        row.className = 'cha-cfg-row';
        const lbl = document.createElement('div');
        lbl.className = 'cha-cfg-lbl';
        lbl.textContent = label;
        const chips = document.createElement('div');
        chips.className = 'cha-chips';
        opts.forEach(opt => {
          const c = document.createElement('button');
          c.className = 'cha-chip' + (cfg[key] === opt.v ? ' active' : '');
          c.textContent = opt.l;
          c.addEventListener('click', () => {
            cfg[key] = opt.v;
            chips.querySelectorAll('.cha-chip').forEach(x => x.classList.remove('active'));
            c.classList.add('active');
          });
          chips.appendChild(c);
        });
        row.append(lbl, chips);
        wrap.appendChild(row);
      };
      mkChips('Valeurs',   'maxVal', [{ v:9, l:'1–9' }, { v:19, l:'1–19' }, { v:29, l:'1–29' }]);
      mkChips('Questions', 'rounds', [{ v:8, l:'8'   }, { v:12, l:'12'   }, { v:20, l:'20'   }]);

      const prev = document.createElement('div');
      prev.className = 'cha-preview';
      prev.textContent = `Ex : ${makeExpression(cfg.terms, cfg.maxVal).str} = ?`;
      wrap.appendChild(prev);

      const startBtn = document.createElement('button');
      startBtn.className = 'btn btn-primary btn-full';
      startBtn.style.marginTop = '16px';
      startBtn.textContent = '▶ Commencer';
      startBtn.addEventListener('click', () => runExercise());
      wrap.appendChild(startBtn);
    };

    // ── ROUNDS ───────────────────────────────────────────────────────────
    const runExercise = () => {
      flush(); rmKey();
      const items = [];
      let roundNum = 0;
      let buf = '';
      let t0 = 0;
      let expr = null;
      let locked = false;

      // ── Question zone : compteur + expression + saisie + feedback ──────
      qz.innerHTML = '';
      const screen = document.createElement('div');
      screen.className = 'cha-screen';
      qz.appendChild(screen);

      const counterEl = document.createElement('div');
      counterEl.className = 'cha-counter';
      screen.appendChild(counterEl);

      const exprEl = document.createElement('div');
      exprEl.className = 'cha-expr';
      screen.appendChild(exprEl);

      const inputEl = document.createElement('div');
      inputEl.className = 'cha-input';
      inputEl.setAttribute('aria-live', 'polite');
      screen.appendChild(inputEl);

      const fbEl = document.createElement('div');
      fbEl.className = 'cha-fb';
      screen.appendChild(fbEl);

      // ── Pavé numérique plein écran dans exercise-special-input ─────────
      if (si) {
        si.classList.remove('hidden');
        si.innerHTML = '';
        const npGrid = document.createElement('div');
        npGrid.className = 'numpad-grid';
        ['7','8','9','4','5','6','1','2','3','−','0','⌫'].forEach(k => {
          const b = document.createElement('button');
          b.className = k === '⌫' ? 'numpad-key numpad-key--backspace'
                      : k === '−' ? 'numpad-key numpad-key--neg'
                      : 'numpad-key';
          b.textContent = k;
          b.addEventListener('click', () => {
            if (k === '⌫') bksp();
            else if (k === '−') minus();
            else digit(k);
          });
          npGrid.appendChild(b);
        });
        si.appendChild(npGrid);
      }

      // Auto-valide dès que buf === réponse attendue ; sinon rien.
      const autoCheck = () => {
        if (locked || !buf || buf === '-') return;
        if (parseInt(buf, 10) === expr.result) submit();
      };

      const digit = d => {
        if (locked || buf.replace('-', '').length >= 4) return;
        buf += d;
        inputEl.textContent = buf;
        autoCheck();
      };
      const bksp = () => {
        if (locked) return;
        buf = buf.slice(0, -1);
        if (buf === '-') buf = '';
        inputEl.textContent = buf;
      };
      const minus = () => {
        if (locked || buf !== '') return;
        buf = '-';
        inputEl.textContent = buf;
      };
      const submit = () => {
        locked = true;
        const ms = Math.round(performance.now() - t0);
        items.push({
          question: `${expr.str} = ?`,
          correctAnswer: String(expr.result),
          userAnswer: buf,
          correct: true,
          partial: false,
          time_ms: ms,
          difficulty,
        });
        fbEl.textContent = `✓  ${(ms / 1000).toFixed(2)}s`;
        fbEl.className = 'cha-fb cha-fb--ok';
        const t = setTimeout(() => roundNum >= cfg.rounds ? showSummary(items) : next(), 700);
        this._timers.push(t);
      };

      this._keyHandler = e => {
        if (e.key >= '0' && e.key <= '9') digit(e.key);
        else if (e.key === 'Backspace') { e.preventDefault(); bksp(); }
        else if (e.key === '-') minus();
        // Pas de Enter : la validation est automatique sur bonne réponse uniquement
      };
      document.addEventListener('keydown', this._keyHandler);

      const next = () => {
        roundNum++;
        expr = makeExpression(cfg.terms, cfg.maxVal);
        buf = ''; locked = false;
        inputEl.textContent = '';
        fbEl.textContent = ''; fbEl.className = 'cha-fb';
        counterEl.textContent = `${roundNum} / ${cfg.rounds}`;
        exprEl.style.fontSize = cfg.terms <= 2 ? '2rem' : cfg.terms <= 4 ? '1.7rem' : '1.4rem';
        exprEl.textContent = `${expr.str}  =`;
        t0 = performance.now();
      };

      next();
    };

    // ── SUMMARY ──────────────────────────────────────────────────────────
    const showSummary = items => {
      flush(); rmKey(); hideNp();
      const n = items.length;
      const times = items.map(i => i.time_ms);
      const avg = Math.round(times.reduce((a, b) => a + b, 0) / n);
      const best = Math.min(...times);
      const worst = Math.max(...times);
      const maxT = worst || 1;

      qz.innerHTML = '';
      const s = document.createElement('div');
      s.className = 'cha-summary';
      qz.appendChild(s);

      const ttl = document.createElement('div');
      ttl.className = 'cha-summary-title';
      ttl.textContent = 'Résultats';
      s.appendChild(ttl);

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
      recap.textContent = `${n} questions · ${cfg.terms} termes · max ${cfg.maxVal}`;
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
        b.className = cls; b.textContent = txt;
        b.addEventListener('click', fn);
        btns.appendChild(b);
      };
      mkBtn('btn btn-secondary', '🔄 Rejouer',   () => runExercise());
      mkBtn('btn btn-secondary', '⚙ Configurer', () => showConfig());
      mkBtn('btn btn-primary',   '✓ Terminer',   () => { this.cleanup(); onComplete(items); });
      s.appendChild(btns);
    };

    showConfig();
  },

  cleanup() {
    const si = document.getElementById('exercise-special-input');
    if (si) { si.classList.add('hidden'); si.innerHTML = ''; }
    for (const t of this._timers) clearTimeout(t);
    this._timers = [];
    if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
  },
};
