// math-analysis.js — Analyse de difficulté du calcul mental
// Repère, par opération (+ − × ÷), les calculs qui prennent le plus de temps
// et surtout les MOTIFS récurrents (ex. « la table de 9 te ralentit ») plutôt
// que des lenteurs ponctuelles. Partagé entre le résumé de fin d'exercice
// (math-trainer.js) et la page Progression (app.js).

export const MATH_OPS = ['+', '−', '+−', '×', '÷'];
export const OP_LABEL = {
  '+': 'Additions',
  '−': 'Soustractions',
  '+−': 'Additions & soustractions',
  '×': 'Multiplications',
  '÷': 'Divisions',
};

// Opérandes impliqués dans une question de calcul mental (négatifs inclus).
// Priorité au champ `operands` stocké dans l'item ; sinon on retombe sur un
// parsing de l'énoncé (données anciennes, positives uniquement).
// × → les deux facteurs · ÷ → diviseur + quotient (pas le dividende) · +/− → les termes.
export function mathOperands(item) {
  if (Array.isArray(item.operands)) return item.operands.filter((v) => Number.isFinite(v));
  const op = item.opType;
  const expr = String(item.question || '').replace('= ?', '').replace('=', '').trim();
  let out = [];
  if (op === '×') {
    out = expr.split('×').map((s) => parseInt(s, 10));
  } else if (op === '÷') {
    const parts = expr.split('÷');
    out = [parseInt(parts[1], 10), parseInt(item.correctAnswer, 10)];
  } else {
    out = expr.split(/[+−]/).map((s) => parseInt(s, 10));
  }
  return out.filter((v) => Number.isFinite(v));
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

// Récupère tous les items de calcul mental de l'historique des sessions.
export function loadHistoryMathItems() {
  try {
    const sessions = JSON.parse(localStorage.getItem('psy0_sessions')) || [];
    const items = [];
    for (const s of sessions) {
      for (const it of (s.items || [])) {
        if (it && MATH_OPS.includes(it.opType)) items.push(it);
      }
    }
    return items;
  } catch {
    return [];
  }
}

// Analyse par opération. Retourne un tableau (une entrée par opération ayant
// assez de données), triée du plus problématique au moins problématique.
//   { opType, label, count, medianMs,
//     pattern: { value, meanMs, count, ratio } | null,  // opérande récurrent lent
//     slowFacts: [{ q, meanMs, count }] }               // calculs précis les plus lents
export function analyzeByOperation(items, opts = {}) {
  const minGroup = opts.minGroup ?? 5;   // items mini pour analyser une opération
  const minOperand = opts.minOperand ?? 3; // occurrences mini pour valider un motif
  const ratioThreshold = opts.ratioThreshold ?? 1.2; // lenteur relative mini

  const groups = {};
  for (const it of items) {
    if (!MATH_OPS.includes(it.opType) || !Number.isFinite(it.time_ms)) continue;
    (groups[it.opType] = groups[it.opType] || []).push(it);
  }

  const result = [];
  for (const op of MATH_OPS) {
    const g = groups[op];
    if (!g || g.length < minGroup) continue;

    const med = median(g.map((i) => i.time_ms)) || 1;

    // Motif : opérande (1-20) systématiquement associé à des temps élevés.
    const byNum = {};
    for (const it of g) {
      for (const nOp of mathOperands(it)) {
        (byNum[nOp] = byNum[nOp] || []).push(it.time_ms);
      }
    }
    let pattern = null;
    for (const [v, ts] of Object.entries(byNum)) {
      if (ts.length < minOperand) continue;
      const m = mean(ts);
      const ratio = m / med;
      if (ratio >= ratioThreshold && (!pattern || m > pattern.meanMs)) {
        pattern = { value: +v, meanMs: Math.round(m), count: ts.length, ratio };
      }
    }

    // Calculs précis les plus lents (agrégés par énoncé, plus lents que la médiane).
    const byQ = {};
    for (const it of g) {
      const q = String(it.question).replace(' = ?', '').trim();
      (byQ[q] = byQ[q] || []).push(it.time_ms);
    }
    const slowFacts = Object.entries(byQ)
      .map(([q, ts]) => ({ q, meanMs: Math.round(mean(ts)), count: ts.length }))
      .filter((f) => f.meanMs > med)
      .sort((a, b) => b.meanMs - a.meanMs)
      .slice(0, 3);

    result.push({
      opType: op,
      label: OP_LABEL[op],
      count: g.length,
      medianMs: Math.round(med),
      pattern,
      slowFacts,
    });
  }

  // Les opérations avec un motif détecté d'abord, puis par lenteur médiane.
  return result.sort((a, b) => {
    if (!!b.pattern !== !!a.pattern) return b.pattern ? 1 : -1;
    return b.medianMs - a.medianMs;
  });
}

function patternPhrase(op, value) {
  if (op === '×' || op === '÷') return `La table de ${value}`;
  return `Les calculs avec ${value}`;
}

// Construit les cartes « À réviser » (une par opération) dans `container`.
// Styles inline (variables CSS) pour être identique dans le résumé d'exercice
// et sur la page Progression. Retourne true si au moins une carte a été ajoutée.
export function buildRevisionRows(container, analysis) {
  const groups = analysis.filter((a) => a.pattern || a.slowFacts.length);
  if (!groups.length) return false;

  for (const a of groups) {
    const card = document.createElement('div');
    card.style.cssText = 'background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:6px;';

    const head = document.createElement('div');
    head.style.cssText = 'font-weight:800;font-size:0.82rem;color:var(--text);margin-bottom:3px;';
    head.textContent = a.label;
    card.appendChild(head);

    if (a.pattern) {
      const p = document.createElement('div');
      p.style.cssText = 'font-size:0.78rem;color:#fca5a5;font-weight:600;line-height:1.4;';
      p.textContent = `🔁 ${patternPhrase(a.opType, a.pattern.value)} te ralentit — ${(a.pattern.meanMs / 1000).toFixed(1)}s (×${a.pattern.ratio.toFixed(1)} la médiane)`;
      card.appendChild(p);
    }
    if (a.slowFacts.length) {
      const f = document.createElement('div');
      f.style.cssText = 'font-size:0.74rem;color:var(--text-muted);margin-top:3px;line-height:1.4;';
      f.textContent = 'Plus lents : ' + a.slowFacts
        .map((sf) => `${sf.q} (${(sf.meanMs / 1000).toFixed(1)}s${sf.count > 1 ? ' ×' + sf.count : ''})`)
        .join('  ·  ');
      card.appendChild(f);
    }
    container.appendChild(card);
  }
  return true;
}
