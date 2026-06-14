// storage.js — Persistance localStorage + export/import JSON
// Toutes les opérations sont synchrones.

const KEYS = {
  sessions: 'psy0_sessions',
  difficulty: 'psy0_difficulty',
  settings: 'psy0_settings',
};

const MAX_SESSIONS = 500;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      // Supprimer les 20 sessions les plus anciennes
      const sessions = read(KEYS.sessions, []);
      sessions.splice(0, 20);
      localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export const Storage = {
  // --- Sessions ---
  getSessions() {
    return read(KEYS.sessions, []);
  },

  addSession(record) {
    const sessions = this.getSessions();
    sessions.push(record);
    // Limiter à MAX_SESSIONS
    if (sessions.length > MAX_SESSIONS) sessions.splice(0, sessions.length - MAX_SESSIONS);
    write(KEYS.sessions, sessions);
  },

  getSessionsForExercise(exerciseId) {
    return this.getSessions().filter((s) => s.exerciseId === exerciseId);
  },

  getRecentSessions(limitDays = 30) {
    const cutoff = Date.now() - limitDays * 86400000;
    return this.getSessions().filter((s) => new Date(s.date).getTime() >= cutoff);
  },

  // --- Difficulté ---
  getDifficulty(exerciseId) {
    const map = read(KEYS.difficulty, {});
    return map[exerciseId] ?? 1;
  },

  setDifficulty(exerciseId, level) {
    const map = read(KEYS.difficulty, {});
    map[exerciseId] = Math.max(1, Math.min(5, level));
    write(KEYS.difficulty, map);
  },

  getAllDifficulties() {
    return read(KEYS.difficulty, {});
  },

  // --- Paramètres ---
  getSettings() {
    const defaults = {
      sessionMode: 'timed',
      duration: 5,
      itemCount: 20,
      startDifficulty: 'adaptive',
      selectedExercises: [],
    };
    return { ...defaults, ...read(KEYS.settings, {}) };
  },

  saveSettings(obj) {
    const current = this.getSettings();
    write(KEYS.settings, { ...current, ...obj });
  },

  // --- Export / Import ---
  exportJSON() {
    const data = {
      version: 1,
      exported: new Date().toISOString(),
      sessions: this.getSessions(),
      difficulty: read(KEYS.difficulty, {}),
      settings: this.getSettings(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cogpilote-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importJSON(jsonStr) {
    let data;
    try {
      data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    } catch {
      throw new Error('JSON invalide');
    }

    if (!data.version || !Array.isArray(data.sessions)) {
      throw new Error('Format de fichier invalide');
    }

    // Validation légère de chaque session
    const validSessions = data.sessions.filter(
      (s) => s.id && s.date && s.exerciseId && Array.isArray(s.items)
    );

    // Merge idempotent : ignorer les sessions déjà présentes
    const existing = this.getSessions();
    const existingIds = new Set(existing.map((s) => s.id));
    const newSessions = validSessions.filter((s) => !existingIds.has(s.id));
    const merged = [...existing, ...newSessions];
    merged.sort((a, b) => new Date(a.date) - new Date(b.date));
    write(KEYS.sessions, merged);

    if (data.difficulty && typeof data.difficulty === 'object') {
      write(KEYS.difficulty, data.difficulty);
    }
    if (data.settings && typeof data.settings === 'object') {
      write(KEYS.settings, data.settings);
    }

    return { imported: newSessions.length, skipped: validSessions.length - newSessions.length };
  },

  reset() {
    localStorage.removeItem(KEYS.sessions);
    localStorage.removeItem(KEYS.difficulty);
    localStorage.removeItem(KEYS.settings);
  },

  // --- Statistiques globales ---
  getWeakExercises(registry, count = 3) {
    const sessions = this.getSessions();
    if (sessions.length === 0) return [];

    const byExercise = {};
    for (const session of sessions) {
      if (!byExercise[session.exerciseId]) byExercise[session.exerciseId] = [];
      byExercise[session.exerciseId].push(session);
    }

    const scored = Object.entries(byExercise)
      .map(([id, ss]) => {
        const recent = ss.slice(-10);
        const avgScore = recent.reduce((a, s) => a + (s.summary?.score ?? 0), 0) / recent.length;
        const ex = registry.find((e) => e.id === id);
        return { id, name: ex?.name ?? id, icon: ex?.icon ?? '❓', avgScore, sessions: ss.length };
      })
      .filter((e) => e.sessions >= 1)
      .sort((a, b) => a.avgScore - b.avgScore);

    return scored.slice(0, count);
  },

  getOverallStats() {
    const sessions = this.getSessions();
    if (sessions.length === 0) return { totalSessions: 0, totalItems: 0, avgAccuracy: 0, avgScore: 0 };
    const totalItems = sessions.reduce((a, s) => a + (s.summary?.total_items ?? 0), 0);
    const avgAccuracy = sessions.reduce((a, s) => a + (s.summary?.accuracy ?? 0), 0) / sessions.length;
    const avgScore = sessions.reduce((a, s) => a + (s.summary?.score ?? 0), 0) / sessions.length;
    return { totalSessions: sessions.length, totalItems, avgAccuracy, avgScore };
  },
};
