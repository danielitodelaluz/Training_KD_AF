// app.js — Router SPA, gestion des écrans, logique Home/Summary/Progress
import { Storage } from './storage.js';
import { Engine } from './engine.js';
import { Numpad, Timer, Feedback, Toast, buildChoiceButtons, buildLetterGrid, drawLineChart, drawBarChart, drawSparkline, setProgressBar } from './ui.js';
import { registry } from './exercises/registry.js';

// ============================================================
// ÉTAT GLOBAL
// ============================================================
const AppState = {
  pendingConfig: null,
  mixedMode: false,
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
        const difficulty = Storage.getDifficulty(ex.id);

        const selected = AppState.mixedMode
          ? settings.selectedExercises.includes(ex.id)
          : AppState.soloExerciseId === ex.id;

        const card = document.createElement('div');
        card.className = 'exercise-card' +
          (AppState.mixedMode ? ' mixed-mode' : '') +
          (selected ? (AppState.mixedMode ? ' selected' : ' solo-selected') : '');
        card.dataset.exerciseId = ex.id;
        card.innerHTML = `
          <div class="card-checkbox"></div>
          <span class="card-icon">${ex.icon}</span>
          <div class="card-name">${ex.name}</div>
          <div class="card-perf">
            ${avgScore !== null ? `<span>Score: <b>${avgScore}</b></span>` : '<span>Jamais joué</span>'}
          </div>
          <div class="card-diff">N${difficulty}</div>
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
    const settings = Storage.getSettings();

    if (AppState.mixedMode) {
      const sel = new Set(settings.selectedExercises);
      if (sel.has(exerciseId)) sel.delete(exerciseId);
      else sel.add(exerciseId);
      Storage.saveSettings({ selectedExercises: [...sel] });
    } else {
      AppState.soloExerciseId = exerciseId;
    }
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

    // Difficulty chips
    document.querySelectorAll('[data-difficulty]').forEach((el) => {
      el.classList.toggle('active', el.dataset.difficulty === String(settings.startDifficulty));
    });

    // Mixed mode hint
    const hint = document.getElementById('mixed-mode-hint');
    if (hint) {
      hint.classList.toggle('visible', AppState.mixedMode);
      if (AppState.mixedMode) {
        const sel = settings.selectedExercises.length;
        hint.textContent = sel
          ? `${sel} exercice${sel > 1 ? 's' : ''} sélectionné${sel > 1 ? 's' : ''} — mode interleaving`
          : 'Cochez des exercices pour le mode mixte';
      }
    }

    // Mixed mode toggle
    const mixBtn = document.getElementById('btn-mixed-toggle');
    if (mixBtn) mixBtn.textContent = AppState.mixedMode ? '🔀 Mixte ✓' : '🔀 Mixte';
    if (mixBtn) mixBtn.classList.toggle('active', AppState.mixedMode);
  },

  start() {
    const settings = Storage.getSettings();

    let exerciseIds;
    if (AppState.mixedMode) {
      exerciseIds = settings.selectedExercises;
      if (!exerciseIds.length) {
        Toast.show('Sélectionnez au moins un exercice', 'error');
        return;
      }
    } else {
      if (!AppState.soloExerciseId) {
        Toast.show('Choisissez un exercice', 'error');
        return;
      }
      exerciseIds = [AppState.soloExerciseId];
    }

    const duration_ms = settings.duration * 60 * 1000;

    AppState.pendingConfig = {
      exerciseIds,
      mode: settings.sessionMode,
      duration_ms,
      itemCount: settings.itemCount,
      startDifficulty: settings.startDifficulty,
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

    Engine.onFeedback = (correct, correctAnswer, time_ms) => {
      Feedback.show(correct, correctAnswer);
      Numpad.reset();
      if (AppState.pendingConfig?.mode === 'count') {
        const done = Engine._items.length;
        const total = AppState.pendingConfig.itemCount;
        Timer.setCount(done, total);
        setProgressBar(document.getElementById('session-progress-fill'), done / total);
      }
    };

    Engine.onSequentialStart = (exercise) => {
      // UI setup only — engine.js calls startSequence() separately
      this._teardownKeyboard(); // évite les fuites de listeners en mode mixte
      Feedback.hide();
      const level = Engine.getCurrentDifficulty(exercise.id);
      document.getElementById('exercise-name-display').textContent = `${exercise.name} · N${level}`;
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
    setProgressBar(document.getElementById('session-progress-fill'), 0);

    Engine.start(AppState.pendingConfig);
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
    // Update header (nom + niveau adaptatif courant)
    const level = Engine.getCurrentDifficulty(exercise.id);
    document.getElementById('exercise-name-display').textContent = `${exercise.name} · N${level}`;
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
    document.getElementById('summary-exercise-name').textContent =
      exerciseId === 'mixed' ? 'Session mixte' : (ex?.name ?? exerciseId);

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

    // Difficulty evolution
    const diffEl = document.getElementById('stat-difficulty');
    if (diffEl) diffEl.textContent = `N${summary.difficulty_start}→N${summary.difficulty_end}`;
  },
};

// ============================================================
// PROGRESS SCREEN
// ============================================================
const ProgressScreen = {
  _filterDays: 30,
  _filterExercise: 'all',

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

    // Global accuracy chart
    const globalCanvas = document.getElementById('chart-global-accuracy');
    if (globalCanvas) {
      const recentSessions = sessions.slice(-30);
      drawLineChart(
        globalCanvas,
        recentSessions.map((s) => Math.round(s.summary?.accuracy * 100 ?? 0)),
        { maxY: 100, minY: 0, color: '#6366f1',
          labels: recentSessions.map((s) => s.date.slice(5, 10)) }
      );
    }

    // Per-exercise list
    const list = document.getElementById('exercise-progress-list');
    list.innerHTML = '';

    for (const ex of registry) {
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
  document.getElementById('btn-mixed-toggle')?.addEventListener('click', () => {
    AppState.mixedMode = !AppState.mixedMode;
    if (!AppState.mixedMode) AppState.soloExerciseId = null;
    HomeScreen._render();
  });

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

  // Difficulty
  document.querySelectorAll('[data-difficulty]').forEach((el) => {
    el.addEventListener('click', () => {
      Storage.saveSettings({ startDifficulty: el.dataset.difficulty === 'adaptive' ? 'adaptive' : parseInt(el.dataset.difficulty) });
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
// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/calculateur_horaires/sw.js').catch(() => {});
}
