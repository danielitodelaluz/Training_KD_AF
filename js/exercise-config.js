// exercise-config.js — Réglages de difficulté par exercice
// Chaque exercice déclare un `configSpec` décrivant ses critères propres ;
// ce module construit l'écran de réglages correspondant (même style que le
// calcul mental), persiste les choix par exercice et les restitue.
//
// Types de paramètres acceptés dans configSpec.params :
//   { id, label, type:'chips',   options:[{v,l}], def }        → choix unique
//   { id, label, type:'multi',   options:[{v,l}], def:[…] }    → choix multiple (au moins 1)
//   { id, label, type:'stepper', min, max, def }               → valeur numérique
// Champ optionnel `note` : ligne d'aide affichée sous la rangée.

const KEY_PREFIX = 'psy0_excfg_';

function loadJSON(key, fb) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fb; }
  catch { return fb; }
}
function saveJSON(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}

// Paramètres effectifs d'un exercice : choix sauvegardés validés contre le
// spec, complétés par les valeurs par défaut.
export function loadParams(exercise) {
  const spec = exercise.configSpec;
  if (!spec) return {};
  const saved = loadJSON(KEY_PREFIX + exercise.id, {});
  const params = {};
  for (const p of spec.params) {
    const s = saved[p.id];
    if (p.type === 'chips') {
      params[p.id] = p.options.some((o) => o.v === s) ? s : p.def;
    } else if (p.type === 'multi') {
      const arr = Array.isArray(s) ? s.filter((v) => p.options.some((o) => o.v === v)) : null;
      params[p.id] = arr && arr.length ? arr : [...p.def];
    } else if (p.type === 'stepper') {
      const n = parseInt(s, 10);
      params[p.id] = Number.isFinite(n) ? Math.max(p.min, Math.min(p.max, n)) : p.def;
    }
  }
  return params;
}

export function saveParams(exercise, params) {
  saveJSON(KEY_PREFIX + exercise.id, params);
}

// Construit l'écran de réglages dans `zone`, puis appelle onStart(params)
// au clic sur GO (après persistance et remise à zéro des styles de la zone).
export function buildConfigScreen(zone, exercise, onStart) {
  const spec = exercise.configSpec;
  const params = loadParams(exercise);

  zone.innerHTML = '';
  zone.style.overflowY = 'auto';
  zone.style.justifyContent = 'flex-start';

  const wrap = document.createElement('div');
  wrap.className = 'cha-config';
  wrap.style.width = '100%';
  zone.appendChild(wrap);

  const h = document.createElement('div');
  h.innerHTML = `<div class="cha-config-title">${exercise.icon} ${exercise.name}</div>` +
    (spec.intro ? `<div class="cha-config-sub">${spec.intro}</div>` : '');
  wrap.appendChild(h);

  for (const p of spec.params) {
    const row = document.createElement('div');
    row.className = 'cha-cfg-row';
    const lbl = document.createElement('div');
    lbl.className = 'cha-cfg-lbl';
    lbl.textContent = p.label;
    row.appendChild(lbl);

    if (p.type === 'stepper') {
      const ctrl = document.createElement('div');
      ctrl.className = 'cha-stepper';
      const minus = document.createElement('button');
      minus.className = 'cha-step-btn';
      minus.textContent = '−';
      const val = document.createElement('div');
      val.className = 'cha-step-val';
      val.textContent = params[p.id];
      const plus = document.createElement('button');
      plus.className = 'cha-step-btn';
      plus.textContent = '+';
      minus.addEventListener('click', () => { params[p.id] = Math.max(p.min, params[p.id] - 1); val.textContent = params[p.id]; });
      plus.addEventListener('click',  () => { params[p.id] = Math.min(p.max, params[p.id] + 1); val.textContent = params[p.id]; });
      ctrl.append(minus, val, plus);
      row.appendChild(ctrl);

    } else {
      const chips = document.createElement('div');
      chips.className = 'cha-chips';
      const btns = [];
      const isActive = (v) => p.type === 'multi' ? params[p.id].includes(v) : params[p.id] === v;
      const refresh = () => btns.forEach(({ el, v }) => el.classList.toggle('active', isActive(v)));
      for (const opt of p.options) {
        const c = document.createElement('button');
        c.className = 'cha-chip';
        c.textContent = opt.l;
        c.addEventListener('click', () => {
          if (p.type === 'multi') {
            if (params[p.id].includes(opt.v)) {
              if (params[p.id].length === 1) return; // au moins un choix
              params[p.id] = params[p.id].filter((v) => v !== opt.v);
            } else {
              params[p.id] = [...params[p.id], opt.v];
            }
          } else {
            params[p.id] = opt.v;
          }
          refresh();
        });
        btns.push({ el: c, v: opt.v });
        chips.appendChild(c);
      }
      refresh();
      row.appendChild(chips);
    }
    wrap.appendChild(row);

    if (p.note) {
      const note = document.createElement('div');
      note.style.cssText = 'font-size:0.7rem;color:var(--text-muted);padding:4px 0 0;text-align:right;';
      note.textContent = p.note;
      wrap.appendChild(note);
    }
  }

  const startBtn = document.createElement('button');
  startBtn.className = 'btn btn-primary btn-full';
  startBtn.style.marginTop = '16px';
  startBtn.textContent = '▶ GO';
  startBtn.addEventListener('click', () => {
    saveParams(exercise, params);
    zone.style.overflowY = '';
    zone.style.justifyContent = '';
    zone.innerHTML = '';
    onStart(params);
  });
  wrap.appendChild(startBtn);
}
