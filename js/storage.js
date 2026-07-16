// storage.js — Persistance localStorage + export/import JSON
// Toutes les opérations sont synchrones.

const KEYS = {
  sessions: 'psy0_sessions',
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

  // --- Paramètres ---
  getSettings() {
    const defaults = {
      sessionMode: 'timed',
      duration: 5,
      itemCount: 20,
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
      version: 2,
      exported: new Date().toISOString(),
      sessions: this.getSessions(),
      settings: this.getSettings(),
      // Configs de difficulté par exercice (clés psy0_excfg_* et psy0_math_*)
      configs: this._exportConfigs(),
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

    if (data.settings && typeof data.settings === 'object') {
      write(KEYS.settings, data.settings);
    }
    if (data.configs && typeof data.configs === 'object') {
      for (const [k, v] of Object.entries(data.configs)) {
        try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
      }
    }

    return { imported: newSessions.length, skipped: validSessions.length - newSessions.length };
  },

  // Toutes les clés de configuration de difficulté par exercice
  _exportConfigs() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('psy0_excfg_') || k.startsWith('psy0_math_'))) {
        try { out[k] = JSON.parse(localStorage.getItem(k)); } catch {}
      }
    }
    return out;
  },

  reset() {
    // Supprime sessions, réglages et toutes les configs par exercice
    const toRemove = [KEYS.sessions, KEYS.settings];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('psy0_excfg_') || k.startsWith('psy0_math_'))) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
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
        return { id, ex, name: ex?.name ?? id, icon: ex?.icon ?? '❓', avgScore, sessions: ss.length };
      })
      // Ignore les sessions d'exercices retirés de l'app
      .filter((e) => e.ex && e.sessions >= 1)
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
