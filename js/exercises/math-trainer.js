// math-trainer.js — Calcul mental (tout-en-un)
// Remplace les anciens exercices de calcul pur. Entièrement configurable :
// mode durée (score à battre) ou nombre de questions (temps à battre),
// opérations + − × ÷ combinables, 2-5 termes (additions/soustractions),
// nombres autorisés de 1 à 20 (presets 1-10 / 11-20 / Tout).
// Divisions toujours exactes (générées à l'envers). Résultats négatifs
// permis (touche −). Auto-validation sur bonne réponse uniquement.
// Records par configuration + historique de progression (rép./min).

import { analyzeByOperation, loadHistoryMathItems, buildRevisionRows } from '../math-analysis.js';

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const CFG_KEY  = 'psy0_math_cfg';
const BEST_KEY = 'psy0_math_best';
const HIST_KEY = 'psy0_math_hist';
const LOG_KEY  = 'psy0_math_log';  // journal enrichi par session (pour la page Progression)

const DUR_OPTS   = [{ v: 30000, l: '30s' }, { v: 60000, l: '1 min' }, { v: 120000, l: '2 min' }, { v: 300000, l: '5 min' }];
const ROUND_OPTS = [10, 20, 30];
const ALL_NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

function loadJSON(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
  catch (_) { return fallback; }
}
function saveJSON(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) {}
}

function defaultCfg() {
  return { mode: 'time', dur: 60000, rounds: 20, ops: ['+', '−', '×'], terms: 2, numbers: ALL_NUMBERS.slice(0, 10) };
}

function normalizeCfg(raw) {
  const def = defaultCfg();
  if (!raw || typeof raw !== 'object') return def;
  const cfg = { ...def, ...raw };
  if (cfg.mode !== 'time' && cfg.mode !== 'count') cfg.mode = def.mode;
  if (!DUR_OPTS.some((o) => o.v === cfg.dur)) cfg.dur = def.dur;
  if (!ROUND_OPTS.includes(cfg.rounds)) cfg.rounds = def.rounds;
  cfg.ops = Array.isArray(cfg.ops) ? cfg.ops.filter((o) => ['+', '−', '×', '÷'].includes(o)) : def.ops;
  if (!cfg.ops.length) cfg.ops = def.ops;
  cfg.terms = Math.max(2, Math.min(5, parseInt(cfg.terms) || 2));
  cfg.numbers = Array.isArray(cfg.numbers) ? [...new Set(cfg.numbers.filter((n) => ALL_NUMBERS.includes(n)))].sort((a, b) => a - b) : def.numbers;
  if (!cfg.numbers.length) cfg.numbers = def.numbers;
  return cfg;
}

// Signature de configuration → clé de record
function cfgSignature(cfg) {
  const mask = cfg.numbers.reduce((m, n) => m | (1 << n), 0);
  const target = cfg.mode === 'time' ? `T${cfg.dur}` : `Q${cfg.rounds}`;
  return `${target}|${[...cfg.ops].sort().join('')}|${cfg.terms}|${mask}`;
}

// Génère une question. Divisions exactes par construction, ×/÷ à 2 termes,
// mélange +/− dans une même expression quand les deux sont cochés.
function makeQuestion(cfg) {
  const types = [];
  if (cfg.ops.includes('+') || cfg.ops.includes('−')) types.push('add');
  if (cfg.ops.includes('×')) types.push('mul');
  if (cfg.ops.includes('÷')) types.push('div');
  const type = pick(types);
  const nums = cfg.numbers;

  if (type === 'add') {
    const signs = ['+', '−'].filter((o) => cfg.ops.includes(o));
    const first = pick(nums);
    let total = first;
    let str = String(first);
    for (let i = 1; i < cfg.terms; i++) {
      const o = pick(signs);
      const n = pick(nums);
      total += o === '+' ? n : -n;
      str += ` ${o} ${n}`;
    }
    return { str, result: total, type: signs.join('') };
  }

  if (type === 'mul') {
    const a = pick(nums), b = pick(nums);
    return { str: `${a} × ${b}`, result: a * b, type: '×' };
  }

  // Division exacte : on tire diviseur et quotient, on affiche le produit
  const pool = nums.filter((n) => n >= 2);
  const d = pick(pool.length ? pool : nums);
  const q = pick(nums);
  return { str: `${d * q} ÷ ${d}`, result: q, type: '÷' };
}

const TYPE_LABELS = { '+': 'Additions', '−': 'Soustractions', '+−': 'Add./Sous.', '×': 'Multiplications', '÷': 'Divisions' };

export default {
  id: 'math-trainer',
  name: 'Calcul mental',
  category: 'numerique',
  icon: '🔢',
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

    const cfg = normalizeCfg(loadJSON(CFG_KEY, null));

    const flush  = () => { for (const t of this._timers) { clearTimeout(t); clearInterval(t); } this._timers = []; };
    const rmKey  = () => {
      if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
    };
    const hideNp = () => { if (si) { si.classList.add('hidden'); si.innerHTML = ''; } };
    const fmtS   = (ms) => `${(ms / 1000).toFixed(1)}s`;

    // ── CONFIG ───────────────────────────────────────────────────────────
    const showConfig = () => {
      flush(); rmKey(); hideNp();
      qz.innerHTML = '';
      // Config plus haute que l'écran : rendre la zone défilable, ancrée en haut
      qz.style.overflowY = 'auto';
      qz.style.justifyContent = 'flex-start';
      const wrap = document.createElement('div');
      wrap.className = 'cha-config';
      wrap.style.width = '100%';
      qz.appendChild(wrap);

      const h = document.createElement('div');
      h.innerHTML = `<div class="cha-config-title">🔢 Calcul mental</div>
        <div class="cha-config-sub">Seules les bonnes réponses passent — la vitesse fait le score</div>`;
      wrap.appendChild(h);

      const mkRow = (label) => {
        const row = document.createElement('div');
        row.className = 'cha-cfg-row';
        const lbl = document.createElement('div');
        lbl.className = 'cha-cfg-lbl';
        lbl.textContent = label;
        row.appendChild(lbl);
        wrap.appendChild(row);
        return row;
      };
      const mkChip = (label, active, onClick) => {
        const c = document.createElement('button');
        c.className = 'cha-chip' + (active ? ' active' : '');
        c.textContent = label;
        c.addEventListener('click', onClick);
        return c;
      };

      // Affichage du record — défini AVANT les rangées qui appellent refreshBest()
      // (sinon ReferenceError en zone morte temporelle → écran tronqué sans bouton GO)
      const bestEl = document.createElement('div');
      bestEl.className = 'cha-preview';
      bestEl.style.marginTop = '12px';
      const refreshBest = () => {
        const b = loadJSON(BEST_KEY, {})[cfgSignature(cfg)];
        if (b == null) bestEl.textContent = 'Pas encore de record pour cette configuration';
        else bestEl.textContent = cfg.mode === 'time' ? `🏆 Record : ${b} bonnes réponses` : `🏆 Record : ${fmtS(b)}`;
      };

      // Mode : durée ou nombre de questions
      const modeRow = mkRow('Mode');
      const modeChips = document.createElement('div');
      modeChips.className = 'cha-chips';
      const targetRow = mkRow('Objectif');
      const targetChips = document.createElement('div');
      targetChips.className = 'cha-chips';
      targetRow.appendChild(targetChips);

      const renderTarget = () => {
        targetChips.innerHTML = '';
        if (cfg.mode === 'time') {
          DUR_OPTS.forEach((o) => targetChips.appendChild(mkChip(o.l, cfg.dur === o.v, () => { cfg.dur = o.v; renderTarget(); refreshBest(); })));
        } else {
          ROUND_OPTS.forEach((n) => targetChips.appendChild(mkChip(`${n} questions`, cfg.rounds === n, () => { cfg.rounds = n; renderTarget(); refreshBest(); })));
        }
      };
      const renderMode = () => {
        modeChips.innerHTML = '';
        modeChips.appendChild(mkChip('⏱ Durée', cfg.mode === 'time', () => { cfg.mode = 'time'; renderMode(); renderTarget(); refreshBest(); }));
        modeChips.appendChild(mkChip('🔢 Questions', cfg.mode === 'count', () => { cfg.mode = 'count'; renderMode(); renderTarget(); refreshBest(); }));
      };
      modeRow.appendChild(modeChips);
      renderMode();
      renderTarget();

      // Opérations (multi-sélection)
      const opsRow = mkRow('Opérations');
      const opsChips = document.createElement('div');
      opsChips.className = 'cha-chips';
      ['+', '−', '×', '÷'].forEach((op) => {
        const c = mkChip(op, cfg.ops.includes(op), () => {
          if (cfg.ops.includes(op)) {
            if (cfg.ops.length === 1) return;
            cfg.ops = cfg.ops.filter((o) => o !== op);
            c.classList.remove('active');
          } else {
            cfg.ops.push(op);
            c.classList.add('active');
          }
          refreshBest();
        });
        c.style.minWidth = '42px';
        opsChips.appendChild(c);
      });
      opsRow.appendChild(opsChips);

      // Termes (2-5, additions/soustractions uniquement)
      const termsRow = mkRow('Termes');
      const stepper = document.createElement('div');
      stepper.className = 'cha-stepper';
      const minus = document.createElement('button');
      minus.className = 'cha-step-btn';
      minus.textContent = '−';
      const val = document.createElement('div');
      val.className = 'cha-step-val';
      val.textContent = cfg.terms;
      const plus = document.createElement('button');
      plus.className = 'cha-step-btn';
      plus.textContent = '+';
      minus.addEventListener('click', () => { cfg.terms = Math.max(2, cfg.terms - 1); val.textContent = cfg.terms; refreshBest(); });
      plus.addEventListener('click',  () => { cfg.terms = Math.min(5, cfg.terms + 1); val.textContent = cfg.terms; refreshBest(); });
      stepper.append(minus, val, plus);
      termsRow.appendChild(stepper);

      const termsNote = document.createElement('div');
      termsNote.style.cssText = 'font-size:0.7rem;color:var(--text-muted);padding:4px 0 0;text-align:right;';
      termsNote.textContent = 'Multiplications et divisions restent à 2 termes';
      wrap.appendChild(termsNote);

      // Nombres autorisés : presets + grille 1-20
      const numsLblRow = document.createElement('div');
      numsLblRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:11px 0 8px;gap:8px;';
      const numsLbl = document.createElement('div');
      numsLbl.className = 'cha-cfg-lbl';
      numsLbl.textContent = 'Nombres';
      const presets = document.createElement('div');
      presets.className = 'cha-chips';
      numsLblRow.append(numsLbl, presets);
      wrap.appendChild(numsLblRow);

      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:6px;';
      wrap.appendChild(grid);

      const numBtns = {};
      const renderNums = () => {
        ALL_NUMBERS.forEach((n) => {
          numBtns[n].classList.toggle('active', cfg.numbers.includes(n));
        });
        refreshBest();
      };
      ALL_NUMBERS.forEach((n) => {
        const c = document.createElement('button');
        c.className = 'cha-chip';
        c.textContent = n;
        c.style.cssText = 'text-align:center;padding:6px 0;';
        c.addEventListener('click', () => {
          if (cfg.numbers.includes(n)) {
            if (cfg.numbers.length === 1) return; // au moins un nombre
            cfg.numbers = cfg.numbers.filter((x) => x !== n);
          } else {
            cfg.numbers = [...cfg.numbers, n].sort((a, b) => a - b);
          }
          renderNums();
        });
        numBtns[n] = c;
        grid.appendChild(c);
      });

      const applyPreset = (list) => { cfg.numbers = [...list]; renderNums(); };
      const p1 = mkChip('1-10',  false, () => applyPreset(ALL_NUMBERS.slice(0, 10)));
      const p2 = mkChip('11-20', false, () => applyPreset(ALL_NUMBERS.slice(10)));
      const p3 = mkChip('Tout',  false, () => applyPreset(ALL_NUMBERS));
      presets.append(p1, p2, p3);
      renderNums();

      // Record pour cette configuration (élément créé plus haut)
      wrap.appendChild(bestEl);
      refreshBest();

      // Progression (rép./min sur les dernières sessions)
      const hist = loadJSON(HIST_KEY, []);
      const chartWrap = document.createElement('div');
      chartWrap.className = 'cha-chart';
      chartWrap.style.marginTop = '10px';
      const chartTitle = document.createElement('div');
      chartTitle.className = 'cha-chart-title';
      chartTitle.textContent = '📈 Progression — réponses par minute';
      chartWrap.appendChild(chartTitle);
      if (hist.length >= 2) {
        const bars = document.createElement('div');
        bars.className = 'cha-bars';
        const recent = hist.slice(-15);
        const maxV = Math.max(...recent.map((e) => e.qpm), 1);
        recent.forEach((e) => {
          const b = document.createElement('div');
          b.className = 'cha-bar';
          b.style.height = Math.max(4, Math.round((e.qpm / maxV) * 60)) + 'px';
          b.title = `${e.d} — ${e.qpm} rép./min`;
          bars.appendChild(b);
        });
        chartWrap.appendChild(bars);
        const last = recent[recent.length - 1];
        const cap = document.createElement('div');
        cap.style.cssText = 'font-size:0.68rem;color:var(--text-muted);text-align:center;margin-top:4px;';
        cap.textContent = `Dernière session : ${last.qpm} rép./min · ${hist.length} session${hist.length > 1 ? 's' : ''} au total`;
        chartWrap.appendChild(cap);
      } else {
        const empty = document.createElement('div');
        empty.style.cssText = 'font-size:0.75rem;color:var(--text-muted);text-align:center;padding:8px 0;';
        empty.textContent = 'Jouez au moins 2 sessions pour voir votre progression';
        chartWrap.appendChild(empty);
      }
      wrap.appendChild(chartWrap);

      const startBtn = document.createElement('button');
      startBtn.className = 'btn btn-primary btn-full';
      startBtn.style.marginTop = '14px';
      startBtn.textContent = '▶ GO';
      startBtn.addEventListener('click', () => {
        saveJSON(CFG_KEY, cfg);
        runSession();
      });
      wrap.appendChild(startBtn);
    };

    // ── SESSION ───────────────────────────────────────────────────────────
    const runSession = () => {
      flush(); rmKey();
      qz.style.overflowY = '';
      qz.style.justifyContent = '';
      const items = [];
      let roundNum = 0;
      let buf = '';
      let t0 = 0;
      let q = null;
      let locked = false;
      let totalMs = 0;     // temps de réflexion cumulé (feedback exclu)
      let corrections = 0; // appuis ⌫
      let ended = false;

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
      screen.appendChild(exprEl);

      const inputEl = document.createElement('div');
      inputEl.className = 'cha-input';
      inputEl.setAttribute('aria-live', 'polite');
      screen.appendChild(inputEl);

      const fbEl = document.createElement('div');
      fbEl.className = 'cha-fb';
      screen.appendChild(fbEl);

      const activeMs = () => totalMs + (locked || !t0 ? 0 : performance.now() - t0);

      // Horloge : compte à rebours (durée) ou chrono cumulé (questions)
      const tick = setInterval(() => {
        if (ended) return;
        if (cfg.mode === 'time') {
          const left = cfg.dur - activeMs();
          if (left <= 0) { finish(); return; }
          clockEl.textContent = fmtS(Math.max(0, left));
          clockEl.style.color = left < 10000 ? 'var(--error)' : 'var(--accent)';
        } else {
          clockEl.textContent = fmtS(activeMs());
        }
      }, 100);
      this._timers.push(tick);

      // Pavé plein écran avec touche − (résultats négatifs possibles)
      if (si) {
        si.classList.remove('hidden');
        si.innerHTML = '';
        const npGrid = document.createElement('div');
        npGrid.className = 'numpad-grid';
        ['7', '8', '9', '4', '5', '6', '1', '2', '3', '−', '0', '⌫'].forEach((k) => {
          const b = document.createElement('button');
          b.className = k === '⌫' ? 'numpad-key numpad-key--backspace'
                      : k === '−' ? 'numpad-key numpad-key--neg'
                      : 'numpad-key';
          b.textContent = k;
          b.addEventListener('click', () => {
            if (k === '⌫') bksp();
            else if (k === '−') minusKey();
            else digit(k);
          });
          npGrid.appendChild(b);
        });
        si.appendChild(npGrid);
      }

      const autoCheck = () => {
        if (locked || !buf || buf === '-') return;
        if (parseInt(buf, 10) === q.result) submit();
      };
      const digit = (d) => {
        if (locked || ended || buf.replace('-', '').length >= 4) return;
        buf += d;
        inputEl.textContent = buf;
        autoCheck();
      };
      const bksp = () => {
        if (locked || ended || !buf) return;
        corrections++;
        buf = buf.slice(0, -1);
        inputEl.textContent = buf;
      };
      const minusKey = () => {
        if (locked || ended || buf !== '') return;
        buf = '-';
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
          opType: q.type,
        });
        fbEl.textContent = `✓ ${(ms / 1000).toFixed(2)}s`;
        fbEl.className = 'cha-fb cha-fb--ok';
        const done = cfg.mode === 'count' && roundNum >= cfg.rounds;
        const t = setTimeout(() => (done ? finish() : next()), 250);
        this._timers.push(t);
      };

      this._keyHandler = (e) => {
        if (e.key >= '0' && e.key <= '9') digit(e.key);
        else if (e.key === 'Backspace') { e.preventDefault(); bksp(); }
        else if (e.key === '-') minusKey();
        // Pas de Enter : validation automatique sur bonne réponse uniquement
      };
      document.addEventListener('keydown', this._keyHandler);

      const next = () => {
        if (ended) return;
        roundNum++;
        q = makeQuestion(cfg);
        buf = '';
        locked = false;
        inputEl.textContent = '';
        fbEl.textContent = '';
        fbEl.className = 'cha-fb';
        counterEl.textContent = cfg.mode === 'count' ? `${roundNum} / ${cfg.rounds}` : `${items.length} ✓`;
        exprEl.style.fontSize = cfg.terms <= 2 ? '2.2rem' : cfg.terms <= 4 ? '1.8rem' : '1.5rem';
        exprEl.textContent = `${q.str}  =`;
        t0 = performance.now();
      };

      const finish = () => {
        if (ended) return;
        ended = true;
        showSummary(items, totalMs, corrections);
      };

      next();
    };

    // ── RÉSUMÉ ───────────────────────────────────────────────────────────
    const showSummary = (items, totalMs, corrections) => {
      flush(); rmKey(); hideNp();
      const n = items.length;
      const sig = cfgSignature(cfg);
      const bests = loadJSON(BEST_KEY, {});
      const prev = bests[sig] ?? null;

      // Score / record selon le mode
      let heroMain, heroSub, isRecord;
      if (cfg.mode === 'time') {
        isRecord = prev === null || n > prev;
        heroMain = `${n}`;
        heroSub = `bonne${n > 1 ? 's' : ''} réponse${n > 1 ? 's' : ''} en ${DUR_OPTS.find((o) => o.v === cfg.dur)?.l ?? fmtS(cfg.dur)}`;
      } else {
        isRecord = prev === null || totalMs < prev;
        heroMain = fmtS(totalMs);
        heroSub = `pour ${n} questions`;
      }
      if (isRecord && n > 0) {
        bests[sig] = cfg.mode === 'time' ? n : totalMs;
        saveJSON(BEST_KEY, bests);
      }

      // Historique de progression (rép./min, commun aux deux modes)
      const qpm = totalMs > 0 ? Math.round((n / (totalMs / 60000)) * 10) / 10 : 0;
      if (n > 0) {
        const hist = loadJSON(HIST_KEY, []);
        hist.push({ d: new Date().toISOString().slice(5, 10), qpm });
        saveJSON(HIST_KEY, hist.slice(-30));

        // Journal enrichi pour la page Progression : réglages + métriques.
        const avgMs = Math.round(totalMs / n);
        const log = loadJSON(LOG_KEY, []);
        log.push({
          t: Date.now(),
          date: new Date().toISOString().slice(0, 10),
          sig,
          mode: cfg.mode,
          dur: cfg.dur,
          rounds: cfg.rounds,
          ops: [...cfg.ops],
          terms: cfg.terms,
          numbers: [...cfg.numbers],
          n,
          totalMs,
          qpm,
          avgMs,
        });
        saveJSON(LOG_KEY, log.slice(-300));
      }

      qz.innerHTML = '';
      qz.style.overflowY = 'auto';
      qz.style.justifyContent = 'flex-start';
      const s = document.createElement('div');
      s.className = 'cha-summary';
      s.style.width = '100%';
      qz.appendChild(s);

      const recordLine = isRecord && n > 0
        ? '🏆 Nouveau record !'
        : prev !== null ? `Record : ${cfg.mode === 'time' ? prev + ' réponses' : fmtS(prev)}` : '';
      const hero = document.createElement('div');
      hero.style.cssText = 'text-align:center;';
      hero.innerHTML = `
        <div style="font-size:2.6rem;font-weight:900;color:var(--accent);font-variant-numeric:tabular-nums;">${heroMain}</div>
        <div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px;">${heroSub}</div>
        <div style="font-size:0.8rem;color:${isRecord && n > 0 ? 'var(--success)' : 'var(--text-muted)'};margin-top:4px;font-weight:700;">${recordLine}</div>`;
      s.appendChild(hero);

      if (n > 0) {
        const times = items.map((i) => i.time_ms);
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / n);
        const best = Math.min(...times);

        const stats = document.createElement('div');
        stats.className = 'cha-stats';
        [
          { v: `${qpm}`, l: 'Rép./min', accent: true },
          { v: `${(avg / 1000).toFixed(2)}s`, l: 'Moyenne' },
          { v: `${(best / 1000).toFixed(2)}s`, l: 'Meilleur', accent: true },
          { v: `${corrections}`, l: 'Corrections' },
        ].forEach(({ v, l, accent }) => {
          const c = document.createElement('div');
          c.className = 'cha-stat';
          c.innerHTML = `<div class="cha-stat-v${accent ? ' good' : ''}">${v}</div><div class="cha-stat-l">${l}</div>`;
          stats.appendChild(c);
        });
        s.appendChild(stats);

        // Bilan par opération : forces et faiblesses
        const byType = {};
        items.forEach((it) => {
          (byType[it.opType] = byType[it.opType] || []).push(it.time_ms);
        });
        const typeStats = Object.entries(byType).map(([type, ts]) => ({
          type,
          avg: Math.round(ts.reduce((a, b) => a + b, 0) / ts.length),
          count: ts.length,
        })).sort((a, b) => a.avg - b.avg);

        if (typeStats.length >= 1) {
          const bilan = document.createElement('div');
          bilan.className = 'cha-chart';
          const bt = document.createElement('div');
          bt.className = 'cha-chart-title';
          bt.textContent = 'Bilan par opération';
          bilan.appendChild(bt);
          typeStats.forEach((ts, i) => {
            const row = document.createElement('div');
            const isBest = typeStats.length > 1 && i === 0;
            const isWorst = typeStats.length > 1 && i === typeStats.length - 1;
            const color = isBest ? 'var(--success)' : isWorst ? 'var(--error)' : 'var(--text)';
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;margin-bottom:5px;font-size:0.82rem;';
            row.innerHTML = `
              <span style="font-weight:700;color:${color};">${isBest ? '💪 ' : isWorst ? '🎯 ' : ''}${TYPE_LABELS[ts.type] ?? ts.type}</span>
              <span style="font-variant-numeric:tabular-nums;color:var(--text-muted);">${(ts.avg / 1000).toFixed(2)}s en moy. · ${ts.count} question${ts.count > 1 ? 's' : ''}</span>`;
            bilan.appendChild(row);
          });
          if (typeStats.length > 1) {
            const legend = document.createElement('div');
            legend.style.cssText = 'font-size:0.68rem;color:var(--text-muted);text-align:center;margin-top:2px;';
            legend.textContent = '💪 point fort · 🎯 à travailler';
            bilan.appendChild(legend);
          }
          s.appendChild(bilan);
        }

        // À réviser : calculs les plus difficiles (session + historique)
        const analysis = analyzeByOperation([...loadHistoryMathItems(), ...items]);
        if (analysis.length) {
          const rev = document.createElement('div');
          rev.className = 'cha-chart';
          const rt = document.createElement('div');
          rt.className = 'cha-chart-title';
          rt.textContent = '🎯 À réviser — tes points de blocage';
          rev.appendChild(rt);
          if (buildRevisionRows(rev, analysis)) s.appendChild(rev);
        }

        // Temps par question
        const maxT = Math.max(...times) || 1;
        const chartWrap = document.createElement('div');
        chartWrap.className = 'cha-chart';
        const chartTitle = document.createElement('div');
        chartTitle.className = 'cha-chart-title';
        chartTitle.textContent = 'Temps par question';
        chartWrap.appendChild(chartTitle);
        const bars = document.createElement('div');
        bars.className = 'cha-bars';
        items.forEach((item, i) => {
          const b = document.createElement('div');
          b.className = 'cha-bar';
          b.style.height = Math.max(4, Math.round((item.time_ms / maxT) * 60)) + 'px';
          b.title = `${item.question.replace(' = ?', '')} — ${(item.time_ms / 1000).toFixed(2)}s`;
          bars.appendChild(b);
        });
        chartWrap.appendChild(bars);
        s.appendChild(chartWrap);
      }

      const btns = document.createElement('div');
      btns.className = 'cha-summary-btns';
      const mkBtn = (cls, txt, fn) => {
        const b = document.createElement('button');
        b.className = cls;
        b.textContent = txt;
        b.addEventListener('click', fn);
        btns.appendChild(b);
      };
      mkBtn('btn btn-secondary', '⚙ Configurer', () => showConfig());
      mkBtn('btn btn-primary',   '✓ Terminer',   () => { this.cleanup(); onComplete(items); });
      s.appendChild(btns);
    };

    showConfig();
  },

  cleanup() {
    const si = document.getElementById('exercise-special-input');
    if (si) { si.classList.add('hidden'); si.innerHTML = ''; }
    const qz = document.getElementById('exercise-question-zone');
    if (qz) { qz.style.overflowY = ''; qz.style.justifyContent = ''; }
    for (const t of this._timers) { clearTimeout(t); clearInterval(t); }
    this._timers = [];
    if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
  },
};
