// engine.js — Moteur de session, difficulté adaptative, scoring
import { Storage } from './storage.js';

// Seuils de difficulté adaptative (modifiables ici)
const ADAPT_WINDOW = 8;       // nombre d'items dans la fenêtre glissante
const ADAPT_UP_THRESHOLD = 0.85;   // accuracy >= seuil → augmenter
const ADAPT_DOWN_THRESHOLD = 0.40; // accuracy <= seuil → diminuer
const ADAPT_MIN_ITEMS = 6;    // minimum d'items avant d'évaluer

const FEEDBACK_DELAY = 900;   // ms d'affichage du feedback

export const Engine = {
  // Etat de session
  _active: false,
  _config: null,
  _exercise: null,    // exercice courant (mode single)
  _exercises: [],     // liste pour le mode mixte
  _items: [],
  _startTime: 0,
  _itemStartTime: 0,
  _sessionTimer: null,
  _elapsed: 0,
  _lastExerciseId: null,

  // Difficulté par exercice (en mémoire, persistée à la fin)
  _diffState: {},

  // Timers trackés pour abort propre
  _trackedTimers: new Set(),

  // Callbacks (définis par app.js)
  onTimerTick: null,      // (remaining_ms, elapsed_ms) => void
  onNextItem: null,       // (exercise, item) => void
  onFeedback: null,       // (correct, correctAnswer, time_ms) => void
  onSessionEnd: null,     // (sessionRecord) => void
  onSequentialStart: null,// (exercise) => void

  lastSession: null,

  // --- API publique ---

  start(config) {
    // config: { exerciseIds, mode, duration_ms, itemCount, startDifficulty, registry }
    this._active = true;
    this._config = config;
    this._items = [];
    this._elapsed = 0;
    this._startTime = performance.now();
    this._lastExerciseId = null;
    this._trackedTimers = new Set();
    this._locked = false;
    this._isSequential = false;

    const { registry, exerciseIds, startDifficulty } = config;
    this._exercises = exerciseIds.map((id) => registry.find((e) => e.id === id)).filter(Boolean);

    // Initialiser la difficulté
    this._diffState = {};
    for (const ex of this._exercises) {
      const baseLevel =
        startDifficulty === 'adaptive'
          ? Storage.getDifficulty(ex.id)
          : parseInt(startDifficulty) || 1;
      this._diffState[ex.id] = {
        level: Math.max(1, Math.min(5, baseLevel)),
        window: [],
      };
    }

    // Démarrer le timer
    if (config.mode === 'timed') {
      this._sessionTimer = setInterval(() => {
        this._elapsed = performance.now() - this._startTime;
        if (this.onTimerTick) this.onTimerTick(config.duration_ms - this._elapsed, this._elapsed);
        if (this._elapsed >= config.duration_ms) this._endSession();
      }, 500);
      this._trackedTimers.add(this._sessionTimer);
    }

    this._nextItem();
  },

  submit(userAnswer) {
    // _locked empêche une double soumission pendant l'affichage du feedback.
    if (!this._active || this._isSequential || this._locked) return;
    this._locked = true;
    const exercise = this._currentExercise;
    const item = this._currentItem;
    const time_ms = Math.round(performance.now() - this._itemStartTime);

    const { correct, partial = false } = exercise.validate(String(userAnswer).trim(), String(item.answer).trim());

    const record = {
      question: item.question,
      correctAnswer: String(item.answer),
      userAnswer: String(userAnswer),
      correct,
      partial,
      time_ms,
      difficulty: this._diffState[exercise.id].level,
    };
    this._items.push(record);

    this._updateDifficulty(exercise.id, correct);

    if (this.onFeedback) this.onFeedback(correct, item.answer, time_ms, exercise, item, String(userAnswer));

    const t = this._track(setTimeout(() => this._nextItem(), FEEDBACK_DELAY));
  },

  // Appelé par les exercices séquentiels quand ils ont terminé
  resumeFromSequential(items) {
    this._isSequential = false;
    for (const item of items) this._items.push(item);
    const t = this._track(setTimeout(() => this._nextItem(), 300));
  },

  abort() {
    this._active = false;
    this._isSequential = false;
    clearInterval(this._sessionTimer);
    for (const t of this._trackedTimers) clearTimeout(t);
    this._trackedTimers.clear();

    // Nettoyage de l'exercice courant
    const ex = this._currentExercise;
    if (ex?.cleanup) ex.cleanup();
  },

  isActive() {
    return this._active;
  },

  getCurrentDifficulty(exerciseId) {
    return this._diffState[exerciseId]?.level ?? 1;
  },

  // --- Interne ---

  _nextItem() {
    if (!this._active) return;
    this._locked = false;

    // Vérifier la condition de fin en mode count
    if (this._config.mode === 'count' && this._items.length >= this._config.itemCount) {
      this._endSession();
      return;
    }

    // Vérifier la condition de fin en mode timed (double vérification)
    if (this._config.mode === 'timed' && performance.now() - this._startTime >= this._config.duration_ms) {
      this._endSession();
      return;
    }

    // Choisir l'exercice
    const exercise = this._pickExercise();
    this._currentExercise = exercise;
    this._lastExerciseId = exercise.id;

    const difficulty = this._diffState[exercise.id].level;

    if (exercise.isSequential) {
      this._isSequential = true;
      if (this.onSequentialStart) this.onSequentialStart(exercise);
      exercise.startSequence(difficulty, (items) => this.resumeFromSequential(items));
    } else {
      const item = exercise.generate(difficulty);
      this._currentItem = item;
      this._itemStartTime = performance.now();
      if (this.onNextItem) this.onNextItem(exercise, item);
    }
  },

  _pickExercise() {
    if (this._exercises.length === 1) return this._exercises[0];

    // En mode mixte : ne pas répéter le même exercice consécutivement
    const candidates = this._exercises.filter((e) => e.id !== this._lastExerciseId);
    return candidates[Math.floor(Math.random() * candidates.length)];
  },

  _updateDifficulty(exerciseId, correct) {
    const state = this._diffState[exerciseId];
    if (!state) return;

    state.window.push(correct);
    if (state.window.length > ADAPT_WINDOW) state.window.shift();

    if (state.window.length < ADAPT_MIN_ITEMS) return;

    const accuracy = state.window.filter(Boolean).length / state.window.length;

    if (accuracy >= ADAPT_UP_THRESHOLD && state.level < 5) {
      state.level++;
      state.window = [];
    } else if (accuracy <= ADAPT_DOWN_THRESHOLD && state.level > 1) {
      state.level--;
      state.window = [];
    }
  },

  _endSession() {
    if (!this._active) return;
    this._active = false;
    clearInterval(this._sessionTimer);
    for (const t of this._trackedTimers) clearTimeout(t);
    this._trackedTimers.clear();

    // Persister les niveaux de difficulté
    for (const [id, state] of Object.entries(this._diffState)) {
      Storage.setDifficulty(id, state.level);
    }

    const summary = this._computeSummary();
    const record = {
      id: this._generateId(),
      date: new Date().toISOString(),
      exerciseId: this._exercises.length === 1 ? this._exercises[0].id : 'mixed',
      mode: this._config.mode,
      items: this._items,
      summary,
    };

    Storage.addSession(record);
    this.lastSession = record;

    if (this.onSessionEnd) this.onSessionEnd(record);
  },

  _computeSummary() {
    const items = this._items;
    if (items.length === 0) {
      return { accuracy: 0, avg_time_ms: 0, median_time_ms: 0, items_per_min: 0, score: 0,
               difficulty_start: 1, difficulty_end: 1, total_items: 0, correct_items: 0 };
    }

    const correct = items.filter((i) => i.correct).length;
    const accuracy = correct / items.length;
    const times = items.map((i) => i.time_ms).sort((a, b) => a - b);
    const avg_time_ms = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const median_time_ms = times[Math.floor(times.length / 2)];
    const elapsed_min = (performance.now() - this._startTime) / 60000;
    const items_per_min = elapsed_min > 0 ? Math.round(items.length / elapsed_min) : 0;

    const speedFactor = Math.min(1, 3000 / Math.max(avg_time_ms, 100));
    const score = Math.round(accuracy * speedFactor * 100);

    const diffStart = items[0]?.difficulty ?? 1;
    const diffEnd = items[items.length - 1]?.difficulty ?? diffStart;

    return { accuracy, avg_time_ms, median_time_ms, items_per_min, score,
             difficulty_start: diffStart, difficulty_end: diffEnd,
             total_items: items.length, correct_items: correct };
  },

  _track(timerId) {
    this._trackedTimers.add(timerId);
    return timerId;
  },

  _generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  },

  _isSequential: false,
  _locked: false,
  _currentExercise: null,
  _currentItem: null,
};
