// engine.js — Moteur de session et scoring
// La difficulté est choisie par l'utilisateur via l'écran de réglages de
// chaque exercice (configSpec) : le moteur transmet simplement `params`
// à generate()/startSequence(), sans niveau global ni adaptation.
import { Storage } from './storage.js';

const FEEDBACK_DELAY = 900;   // ms d'affichage du feedback

export const Engine = {
  // Etat de session
  _active: false,
  _config: null,
  _exercise: null,
  _params: {},
  _items: [],
  _startTime: 0,
  _itemStartTime: 0,
  _sessionTimer: null,
  _elapsed: 0,

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
    // config: { exerciseId, mode, duration_ms, itemCount, params, registry }
    this._active = true;
    this._config = config;
    this._items = [];
    this._elapsed = 0;
    this._startTime = performance.now();
    this._trackedTimers = new Set();
    this._locked = false;
    this._isSequential = false;
    this._params = config.params || {};

    this._exercise = config.registry.find((e) => e.id === config.exerciseId);
    if (!this._exercise) { this._active = false; return; }

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
    const exercise = this._exercise;
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
    };
    this._items.push(record);

    if (this.onFeedback) this.onFeedback(correct, item.answer, time_ms, exercise, item, String(userAnswer));

    this._track(setTimeout(() => this._nextItem(), FEEDBACK_DELAY));
  },

  // Appelé par les exercices séquentiels quand ils ont terminé
  resumeFromSequential(items) {
    this._isSequential = false;
    for (const item of items) this._items.push(item);
    this._track(setTimeout(() => this._nextItem(), 300));
  },

  abort() {
    this._active = false;
    this._isSequential = false;
    clearInterval(this._sessionTimer);
    for (const t of this._trackedTimers) clearTimeout(t);
    this._trackedTimers.clear();

    // Nettoyage de l'exercice courant
    if (this._exercise?.cleanup) this._exercise.cleanup();
  },

  isActive() {
    return this._active;
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

    const exercise = this._exercise;

    if (exercise.isSequential) {
      this._isSequential = true;
      if (this.onSequentialStart) this.onSequentialStart(exercise);
      exercise.startSequence(this._params, (items) => this.resumeFromSequential(items));
    } else {
      const item = exercise.generate(this._params);
      this._currentItem = item;
      this._itemStartTime = performance.now();
      if (this.onNextItem) this.onNextItem(exercise, item);
    }
  },

  _endSession() {
    if (!this._active) return;
    this._active = false;
    clearInterval(this._sessionTimer);
    for (const t of this._trackedTimers) clearTimeout(t);
    this._trackedTimers.clear();

    const summary = this._computeSummary();
    const record = {
      id: this._generateId(),
      date: new Date().toISOString(),
      exerciseId: this._exercise.id,
      mode: this._config.mode,
      params: this._params,
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
               total_items: 0, correct_items: 0 };
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

    return { accuracy, avg_time_ms, median_time_ms, items_per_min, score,
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
  _currentItem: null,
};
