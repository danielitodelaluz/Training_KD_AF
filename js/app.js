// app.js — Router SPA, gestion des écrans, logique Home/Summary/Progress
import { Storage } from './storage.js';
import { Engine } from './engine.js';
import { Numpad, Timer, Feedback, Toast, buildChoiceButtons, buildLetterGrid, drawLineChart, drawBarChart, drawSparkline, setProgressBar } from './ui.js';
import { registry } from './exercises/registry.js';
import { buildConfigScreen } from './exercise-config.js';
import { analyzeByOperation, buildRevisionRows } from './math-analysis.js';

// ============================================================
// ÉTAT GLOBAL
// ============================================================
const AppState = {
  pendingConfig: null,
  soloExerciseId: null,
};

// ============================================================
// ÉLÉMENTS DOM
// ============================================================
const screens = {
  home: document.getElementById('screen-home'),
  exercise: document.getElementById('screen-exercise'),
  summary: document.getElementById('screen-summary'),
  progress: document.getElementById('screen-progress'),
};

// ============================================================
// ROUTER
// ============================================================
function route() {
  const hash = location.hash.slice(1) || 'home';
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle('screen--active', key === hash);
  }
  if (hash === 'home') HomeScreen.onEnter();
  else if (hash === 'exercise') ExerciseScreen.onEnter();
  else if (hash === 'summary') SummaryScreen.onEnter();
  else if (hash === 'progress') ProgressScreen.onEnter();
}

window.addEventListener('hashchange', () => {
  // Abort session if navigating away from exercise
  if (Engine.isActive()) Engine.abort();
  route();
});
window.addEventListener('load', route);

// ============================================================
// HOME SCREEN
// ============================================================
const HomeScreen = {
  _settingsEl: null,

  onEnter() {
    this._render();
  },

  _render() {
    const settings = Storage.getSettings();

    // Rebuild exercise cards
    const grid = document.getElementById('home-exercise-list');
    if (!grid) return;
    grid.innerHTML = '';

    const categories = [
      { key: 'numerique', label: 'Calcul & Numérique' },
      { key: 'lettres', label: 'Lettres & Alphabet' },
      { key: 'memoire', label: 'Mémoire de travail' },
      { key: 'attention', label: 'Attention & Contrôle' },
      { key: 'raisonnement', label: 'Raisonnement' },
      { key: 'spatial', label: 'Spatial' },
    ];

    for (const cat of categories) {
      const exs = registry.filter((e) => e.category === cat.key);
      if (!exs.length) continue;

      const section = document.createElement('div');
      section.className = 'exercise-section';
      section.innerHTML = `<div class="exercise-section-title">${cat.label}</div>`;

      const catGrid = document.createElement('div');
      catGrid.className = 'exercise-grid';

      for (const ex of exs) {
        const lastSessions = Storage.getSessionsForExercise(ex.id).slice(-3);
        const avgScore = lastSessions.length
          ? Math.round(lastSessions.reduce((a, s) => a + (s.summary?.score ?? 0), 0) / lastSessions.length)
          : null;

        const selected = AppState.soloExerciseId === ex.id;

        const card = document.createElement('div');
        card.className = 'exercise-card' + (selected ? ' solo-selected' : '');
        card.dataset.exerciseId = ex.id;
        card.innerHTML = `
          <span class="card-icon">${ex.icon}</span>
          <div class="card-name">${ex.name}</div>
          <div class="card-perf">
            ${avgScore !== null ? `<span>Score: <b>${avgScore}</b></span>` : '<span>Jamais joué</span>'}
          </div>
        `;
        card.addEventListener('click', () => this._onCardClick(ex.id));
        catGrid.appendChild(card);
      }

      section.appendChild(catGrid);
      grid.appendChild(section);
    }

    // Config chips
    this._refreshConfigChips(settings);
  },

  _onCardClick(exerciseId) {
    AppState.soloExerciseId = exerciseId;
    this._render();
  },

  _refreshConfigChips(settings) {
    // Session mode tabs
    document.querySelectorAll('[data-session-mode]').forEach((el) => {
      el.classList.toggle('active', el.dataset.sessionMode === settings.sessionMode);
    });

    // Duration label + chips
    const isTimed = settings.sessionMode === 'timed';
    document.querySelectorAll('[data-duration]').forEach((el) => {
      el.classList.toggle('active', isTimed && parseInt(el.dataset.duration) === settings.duration);
      el.classList.toggle('hidden', !isTimed);
    });
    // Hide the "Durée" label when in count mode
    document.querySelectorAll('.config-label').forEach((el) => {
      if (el.nextElementSibling?.querySelector('[data-duration]')) {
        el.classList.toggle('hidden', !isTimed);
      }
    });

    // Count label + chips
    const countLabel = document.getElementById('count-label');
    if (countLabel) countLabel.classList.toggle('hidden', isTimed);
    document.querySelectorAll('[data-item-count]').forEach((el) => {
      el.classList.toggle('active', !isTimed && parseInt(el.dataset.itemCount) === settings.itemCount);
      el.classList.toggle('hidden', isTimed);
    });

  },

  start() {
    const settings = Storage.getSettings();

    if (!AppState.soloExerciseId) {
      Toast.show('Choisissez un exercice', 'error');
      return;
    }

    const duration_ms = settings.duration * 60 * 1000;

    AppState.pendingConfig = {
      exerciseId: AppState.soloExerciseId,
      mode: settings.sessionMode,
      duration_ms,
      itemCount: settings.itemCount,
      registry,
    };

    location.hash = '#exercise';
  },
};

// ============================================================
// EXERCISE SCREEN
// ============================================================
const ExerciseScreen = {
  _questionZone: null,
  _specialInputArea: null,
  _numpadArea: null,
  _currentExercise: null,
  _currentItem: null,
  _keyHandler: null,
  _itemCount: 0,

  onEnter() {
    if (!AppState.pendingConfig) { location.hash = '#home'; return; }

    this._questionZone = document.getElementById('exercise-question-zone');
    this._specialInputArea = document.getElementById('exercise-special-input');
    this._numpadArea = document.getElementById('numpad-area');
    this._itemCount = 0;

    // Wiring Engine callbacks
    Engine.onTimerTick = (remaining, elapsed) => {
      if (AppState.pendingConfig?.mode === 'timed') {
        Timer.setTime(remaining);
        const ratio = elapsed / AppState.pendingConfig.duration_ms;
        setProgressBar(document.getElementById('session-progress-fill'), ratio);
      }
    };

    Engine.onNextItem = (exercise, item) => {
      this._itemCount++;
      this._currentExercise = exercise;
      this._currentItem = item;
      this._renderItem(exercise, item);
    };

    Engine.onFeedback = (correct, correctAnswer, time_ms, exercise, item, userAnswer) => {
      // Compute hint if wrong
      let hint = null;
      if (!correct && exercise?.getHint) {
        try { hint = exercise.getHint(item, userAnswer); } catch (_) {}
      }

      const isTimed = AppState.pendingConfig?.mode === 'timed';
      // Show hint immediately only in count mode (timed → collect for summary)
      Feedback.show(correct, correctAnswer, isTimed ? null : hint);

      // Tag the item record with the hint for summary display
      if (!correct && hint) {
        const rec = Engine._items[Engine._items.length - 1];
        if (rec) rec.hint = hint;
      }

      Numpad.reset();

      // Streak display (fire emoji when ≥ 3 consecutive correct)
      const items = Engine._items;
      let streak = 0;
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].correct) streak++;
        else break;
      }
      const streakEl = document.getElementById('exercise-streak');
      if (streakEl) {
        if (streak >= 3) {
          streakEl.textContent = `🔥 ${streak}`;
          streakEl.classList.remove('hidden');
        } else {
          streakEl.classList.add('hidden');
        }
      }

      if (AppState.pendingConfig?.mode === 'count') {
        const done = Engine._items.length;
        const total = AppState.pendingConfig.itemCount;
        Timer.setCount(done, total);
        setProgressBar(document.getElementById('session-progress-fill'), done / total);
      }
    };

    Engine.onSequentialStart = (exercise) => {
      // UI setup only — engine.js calls startSequence() separately
      this._teardownKeyboard(); // évite les fuites de listeners
      Feedback.hide();
      document.getElementById('exercise-name-display').textContent = exercise.name;
      document.getElementById('exercise-icon-display').textContent = exercise.icon;
      Numpad.hide();
      this._specialInputArea.innerHTML = '';
      this._specialInputArea.classList.remove('hidden');
    };

    Engine.onSessionEnd = (record) => {
      Engine.lastSession = record;
      this._teardownKeyboard();
      location.hash = '#summary';
    };

    // En-tête + timer neutres pendant la configuration
    const ex = registry.find((e) => e.id === AppState.pendingConfig.exerciseId);
    if (!ex) { location.hash = '#home'; return; }
    document.getElementById('exercise-name-display').textContent = ex.name;
    document.getElementById('exercise-icon-display').textContent = ex.icon;
    Timer.clear();
    setProgressBar(document.getElementById('session-progress-fill'), 0);

    // Écran de réglages propre à l'exercice (sauf s'il gère le sien, comme
    // le calcul mental, ou n'a aucun critère configurable).
    if (ex.configSpec) {
      Numpad.hide();
      this._specialInputArea.classList.add('hidden');
      this._specialInputArea.innerHTML = '';
      Feedback.hide();
      buildConfigScreen(this._questionZone, ex, (params) => this._begin(params));
    } else {
      this._begin({});
    }
  },

  _begin(params) {
    // Setup numpad
    Numpad.init(this._numpadArea);
    Numpad.reset();
    Numpad.onConfirm = (val) => Engine.submit(val);

    // Initialize timer display
    if (AppState.pendingConfig.mode === 'timed') {
      Timer.setTime(AppState.pendingConfig.duration_ms);
    } else {
      Timer.setCount(0, AppState.pendingConfig.itemCount);
    }

    Engine.start({ ...AppState.pendingConfig, params });
  },

  // Garantit la présence de #question-content (recréé après un exercice séquentiel
  // qui aurait vidé toute la zone de question).
  _ensureContent() {
    let content = document.getElementById('question-content');
    if (!content) {
      const zone = document.getElementById('exercise-question-zone');
      zone.innerHTML = '';
      content = document.createElement('div');
      content.id = 'question-content';
      zone.appendChild(content);
    }
    return content;
  },

  _renderItem(exercise, item) {
    document.getElementById('exercise-name-display').textContent = exercise.name;
    document.getElementById('exercise-icon-display').textContent = exercise.icon;

    // Teardown previous keyboard handler
    this._teardownKeyboard();
    Feedback.hide();

    const zone = this._ensureContent();
    const special = this._specialInputArea;

    // Determine input type
    const inputType = exercise.requiresSpecialInput ? exercise.getInputType() : 'numeric';

    if (inputType === 'numeric') {
      Numpad.show();
      Numpad.reset();
      Numpad.showExtras(exercise.numpadExtras || []);
      // Auto-submit: by length for 1-2 digit positive integers, by delay otherwise
      const ans = item.answer || '';
      if (/^\d{1,2}$/.test(ans)) {
        Numpad.autoLength = ans.length;
      } else {
        Numpad.autoDelay = 650;
      }
      special.classList.add('hidden');
      special.innerHTML = '';
    } else {
      Numpad.hide();
      special.classList.remove('hidden');
      special.innerHTML = '';
    }

    // Render question
    exercise.renderQuestion(zone, item, {
      special,
      onAnswer: (val) => Engine.submit(val),
      numpad: Numpad,
    });

    // Gestionnaire clavier unique et additif : on appelle d'abord le keyHandler
    // spécifique à l'exercice (s'il existe), puis on route les touches du pavé
    // numérique pour les saisies numériques. Cela évite qu'un keyHandler vide
    // ne désactive la saisie clavier sur ordinateur.
    this._keyHandler = (e) => {
      if (location.hash !== '#exercise') return;
      if (exercise.keyHandler) exercise.keyHandler(e, (val) => Engine.submit(val));
      if (inputType === 'numeric') {
        if ('0123456789'.includes(e.key)) Numpad.press(e.key);
        else if (e.key === 'Backspace') Numpad.press('backspace');
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Numpad.press('confirm'); }
        else if (e.key === '-') Numpad.press('-');
        else if (e.key === '.') Numpad.press('.');
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  },

  _teardownKeyboard() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  },
};

// ============================================================
// SUMMARY SCREEN
// ============================================================
const SummaryScreen = {
  onEnter() {
    const record = Engine.lastSession;
    if (!record) { location.hash = '#home'; return; }

    const { summary, exerciseId } = record;
    const ex = registry.find((e) => e.id === exerciseId);

    // Score
    document.getElementById('summary-score').textContent = summary.score;
    document.getElementById('summary-exercise-name').textContent = ex?.name ?? exerciseId;

    // Stats grid
    document.getElementById('stat-accuracy').textContent = `${Math.round(summary.accuracy * 100)}%`;
    document.getElementById('stat-avg-time').textContent = `${(summary.avg_time_ms / 1000).toFixed(1)}s`;
    document.getElementById('stat-median-time').textContent = `${(summary.median_time_ms / 1000).toFixed(1)}s`;
    document.getElementById('stat-items-min').textContent = summary.items_per_min;

    // Weak exercises
    const weaks = Storage.getWeakExercises(registry, 3);
    const weakList = document.getElementById('summary-weak-list');
    weakList.innerHTML = '';
    for (const w of weaks) {
      const div = document.createElement('div');
      div.className = 'weak-item';
      div.innerHTML = `<span class="weak-icon">${w.icon}</span>
        <span class="weak-name">${w.name}</span>
        <span class="weak-score">${Math.round(w.avgScore)}/100</span>`;
      weakList.appendChild(div);
    }
    if (!weaks.length) {
      weakList.innerHTML = '<p class="text-muted" style="font-size:0.8rem;padding:8px 0">Continuez pour voir vos points faibles !</p>';
    }

    // Error review with hints (especially useful in timed mode)
    const errorItems = record.items.filter(i => !i.correct);
    const errorsEl = document.getElementById('summary-errors-list');
    const errorSection = document.getElementById('summary-errors-section');
    if (errorsEl && errorSection) {
      errorsEl.innerHTML = '';
      if (errorItems.length === 0) {
        errorSection.classList.add('hidden');
      } else {
        errorSection.classList.remove('hidden');
        for (const ei of errorItems.slice(0, 8)) {
          const div = document.createElement('div');
          div.className = 'error-review-item';
          const q = ei.question.replace(' = ?', '').replace(' + ? = 100', ' + □ = 100').replace('+?=1000','+ □ = 1000');
          div.innerHTML = `
            <div class="error-q">${q}</div>
            <div class="error-answers">
              <span class="error-user">Vous : <b>${ei.userAnswer || '—'}</b></span>
              <span class="error-correct">Attendu : <b>${ei.correctAnswer}</b></span>
            </div>
            ${ei.hint ? `<div class="error-hint">💡 ${ei.hint}</div>` : ''}
          `;
          errorsEl.appendChild(div);
        }
      }
    }
  },
};

// ============================================================
// HELPERS — ANALYSE CALCUL MENTAL
// ============================================================
const MATH_ID = 'math-trainer';
const MATH_OPS = ['+', '−', '+−', '×', '÷'];
const OP_LABEL = { '+': 'Additions', '−': 'Soustractions', '+−': 'Add./Sous.', '×': 'Multiplications', '÷': 'Divisions' };
const OP_COLOR = { '+': '#22c55e', '−': '#38bdf8', '+−': '#818cf8', '×': '#f59e0b', '÷': '#ef4444' };

function mathDurLabel(ms) {
  return ({ 30000: '30s', 60000: '1min', 120000: '2min', 300000: '5min' })[ms] || Math.round(ms / 1000) + 's';
}
function describeNumbers(nums) {
  const key = [...nums].sort((a, b) => a - b).join(',');
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i).join(',');
  if (key === range(1, 10)) return '1-10';
  if (key === range(11, 20)) return '11-20';
  if (key === range(1, 20)) return 'Tout';
  return nums.length + ' nb';
}
function cfgLabel(e) {
  const target = e.mode === 'time' ? mathDurLabel(e.dur) : `${e.rounds}Q`;
  const range = (e.min !== undefined && e.max !== undefined)
    ? `${e.min}…${e.max}`
    : describeNumbers(e.numbers || []);
  return `${target} · ${(e.ops || []).join('')} · ${range}`;
}
// Opérandes 1-20 impliqués dans une question (pour la grille de couverture).
// Priorité au champ `operands` de l'item ; sinon parsing de l'énoncé.
function mathOperands(item) {
  let out;
  if (Array.isArray(item.operands)) {
    out = item.operands;
  } else {
    const op = item.opType;
    const expr = String(item.question || '').replace('= ?', '').replace('=', '').trim();
    if (op === '×') out = expr.split('×').map((s) => parseInt(s, 10));
    else if (op === '÷') { const parts = expr.split('÷'); out = [parseInt(parts[1], 10), parseInt(item.correctAnswer, 10)]; }
    else out = expr.split(/[+−]/).map((s) => parseInt(s, 10));
  }
  return out.filter((v) => Number.isFinite(v) && v >= 1 && v <= 20);
}
function loadMathLog() {
  try { return JSON.parse(localStorage.getItem('psy0_math_log')) || []; }
  catch { return []; }
}
// Barres horizontales : rows = [{label, value, display, color}]
function buildHBars(container, rows) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  for (const r of rows) {
    const row = document.createElement('div');
    row.className = 'mp-hbar-row';
    const pct = Math.round((r.value / max) * 100);
    row.innerHTML = `
      <span class="mp-hbar-label">${r.label}</span>
      <span class="mp-hbar-track"><span class="mp-hbar-fill" style="width:${pct}%;background:${r.color || 'var(--accent)'}"></span></span>
      <span class="mp-hbar-val">${r.display}</span>`;
    container.appendChild(row);
  }
}

// ============================================================
// PROGRESS SCREEN
// ============================================================
const ProgressScreen = {
  _filterDays: 30,
  _filterExercise: 'all',
  _mathSelSig: null,

  onEnter() {
    this._render();
  },

  _render() {
    const sessions = this._filterDays === 0
      ? Storage.getSessions()
      : Storage.getRecentSessions(this._filterDays);

    // Overview
    const totalItems = sessions.reduce((a, s) => a + (s.summary?.total_items ?? 0), 0);
    const avgAccuracy = sessions.length
      ? Math.round(sessions.reduce((a, s) => a + (s.summary?.accuracy ?? 0), 0) / sessions.length * 100)
      : 0;
    const avgScore = sessions.length
      ? Math.round(sessions.reduce((a, s) => a + (s.summary?.score ?? 0), 0) / sessions.length)
      : 0;
    document.getElementById('prog-total-sessions').textContent = sessions.length;
    document.getElementById('prog-total-items').textContent = totalItems;
    document.getElementById('prog-avg-score').textContent = avgScore;

    // Weak banner
    const weaks = Storage.getWeakExercises(registry, 3);
    const banner = document.getElementById('weak-exercises-banner');
    const bannerList = document.getElementById('weak-exercises-list');
    if (weaks.length && sessions.length >= 3) {
      banner.classList.remove('hidden');
      bannerList.innerHTML = weaks
        .map((w) => `<div class="weak-item">
          <span class="weak-icon">${w.icon}</span>
          <span class="weak-name">${w.name}</span>
          <span class="weak-score">${Math.round(w.avgScore)}/100</span>
        </div>`)
        .join('');
    } else {
      banner.classList.add('hidden');
    }

    // ---- Section Calcul mental (prioritaire) ----
    const cutoffTs = this._filterDays === 0 ? 0 : Date.now() - this._filterDays * 86400000;
    const mathItems = [];
    for (const s of Storage.getSessions()) {
      if (new Date(s.date).getTime() < cutoffTs) continue;
      for (const it of (s.items || [])) {
        if (it && MATH_OPS.includes(it.opType)) mathItems.push(it);
      }
    }
    const mathLog = loadMathLog().filter((e) => (e.t || 0) >= cutoffTs);
    const mathRoot = document.getElementById('math-progress');
    if (mathRoot) this._renderMath(mathRoot, mathItems, mathLog);

    // Global accuracy chart (exclut le calcul mental — précision toujours 100 %)
    const globalCanvas = document.getElementById('chart-global-accuracy');
    if (globalCanvas) {
      const recentSessions = sessions.filter((s) => s.exerciseId !== MATH_ID).slice(-30);
      drawLineChart(
        globalCanvas,
        recentSessions.map((s) => Math.round(s.summary?.accuracy * 100 ?? 0)),
        { maxY: 100, minY: 0, color: '#6366f1',
          labels: recentSessions.map((s) => s.date.slice(5, 10)) }
      );
    }

    // Per-exercise list (le calcul mental a sa propre section détaillée)
    const list = document.getElementById('exercise-progress-list');
    list.innerHTML = '';

    for (const ex of registry) {
      if (ex.id === MATH_ID) continue;
      const exSessions = sessions.filter((s) => s.exerciseId === ex.id).slice(-20);
      const lastScore = exSessions.length
        ? Math.round(exSessions[exSessions.length - 1].summary?.score ?? 0)
        : null;
      const avgAcc = exSessions.length
        ? Math.round(exSessions.reduce((a, s) => a + (s.summary?.accuracy ?? 0), 0) / exSessions.length * 100)
        : null;
      const avgTime = exSessions.length
        ? Math.round(exSessions.reduce((a, s) => a + (s.summary?.avg_time_ms ?? 0), 0) / exSessions.length / 100) / 10
        : null;

      let badgeClass = 'avg', badgeText = '—';
      if (lastScore !== null) {
        badgeText = `${lastScore}/100`;
        badgeClass = lastScore >= 70 ? 'good' : lastScore >= 45 ? 'avg' : 'bad';
      }

      const item = document.createElement('div');
      item.className = 'exercise-progress-item';
      item.innerHTML = `
        <div class="ep-header">
          <span class="ep-icon">${ex.icon}</span>
          <span class="ep-name">${ex.name}</span>
          <span class="ep-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="ep-stats">
          ${avgAcc !== null ? `<span>Précision: <strong>${avgAcc}%</strong></span>` : ''}
          ${avgTime !== null ? `<span>Temps moy: <strong>${avgTime}s</strong></span>` : ''}
          <span>Sessions: <strong>${exSessions.length}</strong></span>
        </div>
        ${exSessions.length >= 2
          ? `<canvas class="ep-canvas" data-exercise-id="${ex.id}"></canvas>`
          : `<p class="ep-no-data">Pas encore assez de données</p>`}
      `;
      list.appendChild(item);
    }

    // Draw sparklines
    requestAnimationFrame(() => {
      document.querySelectorAll('.ep-canvas[data-exercise-id]').forEach((canvas) => {
        const id = canvas.dataset.exerciseId;
        const exSess = sessions.filter((s) => s.exerciseId === id).slice(-20);
        const values = exSess.map((s) => s.summary?.score ?? 0);
        drawSparkline(canvas, values);
      });
    });
  },

  // Analyse détaillée du calcul mental (configs, couverture, vitesse)
  _renderMath(root, items, log) {
    root.innerHTML = '';
    if (!items.length && !log.length) {
      root.innerHTML = `<div class="mp-empty">🔢 <b>Calcul mental</b><br>Joue une session pour débloquer ton analyse détaillée.</div>`;
      return;
    }

    const title = document.createElement('div');
    title.className = 'section-title';
    title.style.marginTop = '4px';
    title.textContent = '🔢 Calcul mental — analyse';
    root.appendChild(title);

    // ---- 0. À réviser — calculs les plus difficiles (motifs récurrents) ----
    if (items.length) {
      const analysis = analyzeByOperation(items);
      if (analysis.some((a) => a.pattern || a.slowFacts.length)) {
        const revCard = document.createElement('div');
        revCard.className = 'chart-card';
        revCard.innerHTML = `<div class="chart-card-title">🎯 À réviser — tes points de blocage</div>
          <div class="chart-card-sub">Séparé par opération, sur toute la période sélectionnée</div>`;
        buildRevisionRows(revCard, analysis);
        root.appendChild(revCard);
      }
    }

    // ---- 1. Configurations les plus jouées + progression ----
    if (log.length) {
      const bySig = {};
      for (const e of log) (bySig[e.sig] = bySig[e.sig] || []).push(e);
      const groups = Object.entries(bySig)
        .map(([sig, entries]) => ({ sig, entries, count: entries.length, last: entries[entries.length - 1] }))
        .sort((a, b) => b.count - a.count);

      if (this._mathSelSig == null || !bySig[this._mathSelSig]) this._mathSelSig = groups[0].sig;

      const card = document.createElement('div');
      card.className = 'chart-card';
      card.innerHTML = `<div class="chart-card-title">Configurations les plus jouées</div>
        <div class="chart-card-sub">Choisis un réglage pour voir sa progression</div>`;
      const chips = document.createElement('div');
      chips.className = 'mp-cfg-chips';
      groups.slice(0, 6).forEach((g) => {
        const c = document.createElement('button');
        c.className = 'mp-cfg-chip' + (g.sig === this._mathSelSig ? ' active' : '');
        c.innerHTML = `${cfgLabel(g.last)} <span class="mp-cfg-count">${g.count}×</span>`;
        c.addEventListener('click', () => { this._mathSelSig = g.sig; this._render(); });
        chips.appendChild(c);
      });
      card.appendChild(chips);

      const sel = bySig[this._mathSelSig];
      const qpms = sel.map((e) => e.qpm);
      const canvas = document.createElement('canvas');
      canvas.style.height = '120px';
      canvas.style.marginTop = '10px';
      card.appendChild(canvas);
      const cap = document.createElement('div');
      cap.className = 'mp-cap';
      const bestQ = Math.max(...qpms), lastQ = qpms[qpms.length - 1];
      cap.textContent = sel.length >= 2
        ? `${sel.length} sessions · dernière ${lastQ} rép./min · record ${bestQ} rép./min`
        : `1 session (${lastQ} rép./min) — rejoue cette config pour tracer la courbe`;
      card.appendChild(cap);
      root.appendChild(card);

      requestAnimationFrame(() => {
        const maxY = Math.max(...qpms, 1);
        drawLineChart(canvas, qpms, {
          maxY: Math.ceil(maxY * 1.15), minY: 0, color: '#6366f1',
          labels: [sel[0].date.slice(5), sel[sel.length - 1].date.slice(5)],
        });
      });
    }

    // ---- Agrégats par opération (couverture + vitesse) ----
    const byOp = {};
    for (const it of items) {
      const b = byOp[it.opType] || (byOp[it.opType] = { count: 0, sum: 0 });
      b.count++; b.sum += it.time_ms || 0;
    }
    const opRows = Object.entries(byOp).map(([op, b]) => ({ op, count: b.count, avg: b.sum / b.count }));

    // ---- 2. Couverture par opération ----
    if (opRows.length) {
      const covCard = document.createElement('div');
      covCard.className = 'chart-card';
      covCard.innerHTML = `<div class="chart-card-title">Couverture par opération</div>
        <div class="chart-card-sub">Combien de calculs de chaque type tu as travaillés</div>`;
      const hb = document.createElement('div');
      hb.className = 'mp-hbars';
      const sorted = [...opRows].sort((a, b) => b.count - a.count);
      buildHBars(hb, sorted.map((r) => ({
        label: OP_LABEL[r.op] || r.op, value: r.count, display: `${r.count}`, color: OP_COLOR[r.op],
      })));
      covCard.appendChild(hb);
      if (sorted.length >= 2) {
        const cap = document.createElement('div');
        cap.className = 'mp-cap';
        cap.innerHTML = `💪 Le plus : <b>${OP_LABEL[sorted[0].op]}</b> · 🎯 Le moins : <b>${OP_LABEL[sorted[sorted.length - 1].op]}</b>`;
        covCard.appendChild(cap);
      }
      root.appendChild(covCard);
    }

    // ---- 3. Couverture des nombres 1-20 ----
    const byNum = {};
    for (let i = 1; i <= 20; i++) byNum[i] = 0;
    for (const it of items) for (const nn of mathOperands(it)) byNum[nn]++;
    const totalNum = Object.values(byNum).reduce((a, b) => a + b, 0);
    if (totalNum > 0) {
      const numCard = document.createElement('div');
      numCard.className = 'chart-card';
      numCard.innerHTML = `<div class="chart-card-title">Couverture des nombres (1 à 20)</div>
        <div class="chart-card-sub">Intensité = fréquence de travail · rouge = délaissé</div>`;
      const grid = document.createElement('div');
      grid.className = 'mp-numgrid';
      const maxN = Math.max(...Object.values(byNum), 1);
      const used = Object.values(byNum).filter((c) => c > 0).sort((a, b) => a - b);
      const lowThresh = used.length ? used[Math.floor(used.length * 0.25)] : 0;
      for (let i = 1; i <= 20; i++) {
        const c = byNum[i];
        const cell = document.createElement('div');
        const weak = c === 0 || c <= lowThresh;
        cell.className = 'mp-numcell' + (weak ? ' weak' : '');
        const intensity = c === 0 ? 0 : 0.15 + 0.85 * (c / maxN);
        cell.style.background = c === 0 ? 'transparent' : `rgba(99,102,241,${intensity.toFixed(2)})`;
        cell.innerHTML = `<span class="mp-numcell-n">${i}</span><span class="mp-numcell-c">${c}</span>`;
        grid.appendChild(cell);
      }
      numCard.appendChild(grid);
      const least = Object.entries(byNum).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([n]) => n);
      const cap = document.createElement('div');
      cap.className = 'mp-cap';
      cap.innerHTML = `🎯 À travailler davantage : <b>${least.join(', ')}</b>`;
      numCard.appendChild(cap);
      root.appendChild(numCard);
    }

    // ---- 4. Vitesse par opération ----
    if (opRows.length) {
      const spCard = document.createElement('div');
      spCard.className = 'chart-card';
      spCard.innerHTML = `<div class="chart-card-title">Vitesse par opération</div>
        <div class="chart-card-sub">Temps moyen de réponse · plus court = mieux maîtrisé</div>`;
      const hb = document.createElement('div');
      hb.className = 'mp-hbars';
      const sorted = [...opRows].sort((a, b) => a.avg - b.avg);
      buildHBars(hb, sorted.map((r) => ({
        label: OP_LABEL[r.op] || r.op, value: r.avg, display: `${(r.avg / 1000).toFixed(2)}s`, color: OP_COLOR[r.op],
      })));
      spCard.appendChild(hb);
      if (sorted.length >= 2) {
        const cap = document.createElement('div');
        cap.className = 'mp-cap';
        cap.innerHTML = `⚡ Le plus rapide : <b>${OP_LABEL[sorted[0].op]}</b> · 🐌 Le plus lent : <b>${OP_LABEL[sorted[sorted.length - 1].op]}</b>`;
        spCard.appendChild(cap);
      }
      root.appendChild(spCard);
    }
  },

  setFilter(key, value) {
    if (key === 'days') this._filterDays = value;
    if (key === 'exercise') this._filterExercise = value;
    this._render();
  },
};

// ============================================================
// BINDINGS GLOBAUX
// ============================================================
function bindAll() {
  // --- HOME ---
  document.getElementById('btn-start')?.addEventListener('click', () => HomeScreen.start());
  document.getElementById('btn-progress')?.addEventListener('click', () => { location.hash = '#progress'; });

  // Session mode
  document.querySelectorAll('[data-session-mode]').forEach((el) => {
    el.addEventListener('click', () => {
      Storage.saveSettings({ sessionMode: el.dataset.sessionMode });
      HomeScreen._refreshConfigChips(Storage.getSettings());
    });
  });

  // Duration
  document.querySelectorAll('[data-duration]').forEach((el) => {
    el.addEventListener('click', () => {
      Storage.saveSettings({ duration: parseInt(el.dataset.duration) });
      HomeScreen._refreshConfigChips(Storage.getSettings());
    });
  });

  // Item count
  document.querySelectorAll('[data-item-count]').forEach((el) => {
    el.addEventListener('click', () => {
      Storage.saveSettings({ itemCount: parseInt(el.dataset.itemCount) });
      HomeScreen._refreshConfigChips(Storage.getSettings());
    });
  });

  // --- EXERCISE ---
  document.getElementById('btn-stop-session')?.addEventListener('click', () => {
    if (confirm('Arrêter la session en cours ?')) {
      Engine.abort();
      location.hash = '#home';
    }
  });

  // --- SUMMARY ---
  document.getElementById('btn-retry')?.addEventListener('click', () => {
    if (AppState.pendingConfig) location.hash = '#exercise';
    else location.hash = '#home';
  });
  document.getElementById('btn-home-from-summary')?.addEventListener('click', () => {
    location.hash = '#home';
  });

  // --- PROGRESS ---
  document.querySelectorAll('[data-filter-days]').forEach((el) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-days]').forEach((e) => e.classList.remove('active'));
      el.classList.add('active');
      ProgressScreen.setFilter('days', parseInt(el.dataset.filterDays));
    });
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    Storage.exportJSON();
    Toast.show('Données exportées', 'success');
  });

  document.getElementById('btn-import')?.addEventListener('click', () => {
    document.getElementById('import-file-input')?.click();
  });

  document.getElementById('import-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = Storage.importJSON(ev.target.result);
        Toast.show(`${result.imported} session(s) importée(s)`, 'success');
        ProgressScreen._render();
      } catch (err) {
        Toast.show('Erreur : ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (confirm('Supprimer TOUTES vos données ? Cette action est irréversible.')) {
      Storage.reset();
      Toast.show('Données réinitialisées', 'success');
      ProgressScreen._render();
    }
  });

  // Timer init
  Timer.init(document.getElementById('session-timer'));
  Feedback.init(document.getElementById('feedback-overlay'));
  Toast.init(document.getElementById('app-toast'));
}

// ============================================================
// INIT
// ============================================================
bindAll();
// Register service worker (chemin relatif → indépendant du sous-dossier d'hébergement)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
