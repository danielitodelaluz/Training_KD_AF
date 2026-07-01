// horizon.js — Horizon artificiel
// Lecture d'un indicateur d'assiette dessiné en Canvas : sens du virage,
// assiette (montée/descente), puis estimation de l'angle d'inclinaison.
// La maquette (jaune) est fixe ; l'horizon bascule à l'opposé du roulis.
import { buildChoiceButtons } from '../ui.js';

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const SKY = '#2f6fd0';
const GROUND = '#8a5a1e';
const PITCH_PX_PER_DEG = 3.2;

// Dessine l'instrument. bank > 0 = virage à droite, pitch > 0 = montée.
function drawAI(canvas, bankDeg, pitchDeg) {
  const size = 210;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const c = size / 2;
  const R = c - 6;

  // Fond + découpe circulaire
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(c, c);
  // Virage à droite → l'horizon apparaît incliné côté droit vers le haut
  ctx.rotate(-bankDeg * Math.PI / 180);
  // Montée → la barre d'horizon descend sous la maquette
  const off = pitchDeg * PITCH_PX_PER_DEG;

  ctx.fillStyle = SKY;
  ctx.fillRect(-size, -size, size * 2, size + off);
  ctx.fillStyle = GROUND;
  ctx.fillRect(-size, off, size * 2, size * 2);

  // Ligne d'horizon
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-size, off);
  ctx.lineTo(size, off);
  ctx.stroke();

  // Échelle de tangage (±10°)
  ctx.lineWidth = 1.5;
  for (const d of [-10, 10]) {
    const y = off + d * PITCH_PX_PER_DEG;
    ctx.beginPath();
    ctx.moveTo(-22, y);
    ctx.lineTo(22, y);
    ctx.stroke();
  }

  // Index de roulis (triangle solidaire de l'horizon, pointe vers le haut)
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(0, -R + 4);
  ctx.lineTo(-7, -R + 18);
  ctx.lineTo(7, -R + 18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Graduations d'inclinaison fixes (10, 20, 30, 45, 60°)
  ctx.strokeStyle = '#e2e8f0';
  for (const a of [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]) {
    const major = a === 0 || Math.abs(a) === 30 || Math.abs(a) === 60;
    const len = major ? 12 : 7;
    const rad = a * Math.PI / 180;
    const sx = c + (R - len) * Math.sin(rad);
    const sy = c - (R - len) * Math.cos(rad);
    const ex = c + R * Math.sin(rad);
    const ey = c - R * Math.cos(rad);
    ctx.lineWidth = major ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  // Maquette avion fixe (jaune)
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(c - 52, c);
  ctx.lineTo(c - 16, c);
  ctx.lineTo(c - 8, c + 8);
  ctx.moveTo(c + 52, c);
  ctx.lineTo(c + 16, c);
  ctx.lineTo(c + 8, c + 8);
  ctx.stroke();
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(c, c, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Cerclage
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(c, c, R + 1.5, 0, Math.PI * 2);
  ctx.stroke();
}

const COMBO_OPTIONS = [
  { label: 'Gauche · Montée',   value: 'g-m' },
  { label: 'Droite · Montée',   value: 'd-m' },
  { label: 'Gauche · Descente', value: 'g-d' },
  { label: 'Droite · Descente', value: 'd-d' },
];

export default {
  id: 'horizon',
  name: 'Horizon artificiel',
  category: 'aviation',
  icon: '🛩️',
  isSequential: false,
  requiresSpecialInput: true,
  numpadExtras: [],

  _options: [],

  getInputType() { return 'choice'; },

  generate(difficulty) {
    let bank = 0, pitch = 0, prompt, options, answer;

    if (difficulty === 1) {
      bank = pick([-1, 1]) * rand(20, 45);
      prompt = 'Sens du virage ?';
      options = [
        { label: 'Virage à GAUCHE', value: 'gauche' },
        { label: 'Virage à DROITE', value: 'droite' },
      ];
      answer = bank > 0 ? 'droite' : 'gauche';

    } else if (difficulty === 2) {
      pitch = pick([-1, 1]) * rand(5, 15);
      prompt = 'Assiette ?';
      options = [
        { label: 'MONTÉE', value: 'montee' },
        { label: 'DESCENTE', value: 'descente' },
      ];
      answer = pitch > 0 ? 'montee' : 'descente';

    } else if (difficulty === 3 || difficulty === 4) {
      // D4 : angles faibles, lecture plus fine
      const bMin = difficulty === 3 ? 15 : 5;
      const bMax = difficulty === 3 ? 45 : 14;
      const pMin = difficulty === 3 ? 6 : 3;
      const pMax = difficulty === 3 ? 15 : 6;
      bank = pick([-1, 1]) * rand(bMin, bMax);
      pitch = pick([-1, 1]) * rand(pMin, pMax);
      prompt = 'Attitude de l\'avion ?';
      options = COMBO_OPTIONS;
      answer = `${bank > 0 ? 'd' : 'g'}-${pitch > 0 ? 'm' : 'd'}`;

    } else {
      // D5 : estimer l'angle d'inclinaison sur les graduations
      const mag = pick([15, 30, 45, 60]);
      bank = pick([-1, 1]) * mag;
      prompt = `Angle d'inclinaison (virage à ${bank > 0 ? 'droite' : 'gauche'}) ?`;
      options = [15, 30, 45, 60].map((m) => ({ label: `${m}°`, value: String(m) }));
      answer = String(mag);
    }

    return {
      question: prompt,
      answer,
      extraData: { bank, pitch, prompt, options },
    };
  },

  validate(userAnswer, correctAnswer) {
    return { correct: userAnswer === correctAnswer };
  },

  renderQuestion(container, item, ctx) {
    const { bank, pitch, prompt, options } = item.extraData;
    container.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'horizon-wrap';
    const canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    container.appendChild(wrap);
    drawAI(canvas, bank, pitch);

    const lbl = document.createElement('div');
    lbl.className = 'question-display size-sm';
    lbl.style.marginTop = '8px';
    lbl.textContent = prompt;
    container.appendChild(lbl);

    this._options = options;
    buildChoiceButtons(ctx.special, options, (val) => ctx.onAnswer(val));
  },

  getHint(item) {
    const { bank, pitch } = item.extraData;
    const parts = [];
    if (bank !== 0) parts.push(`L'horizon bascule à l'opposé du virage : la ligne est plus haute du côté ${bank > 0 ? 'droit → virage à DROITE' : 'gauche → virage à GAUCHE'} (l'aile ${bank > 0 ? 'droite' : 'gauche'} de la maquette pointe vers le sol).`);
    if (pitch !== 0) parts.push(`La maquette jaune est ${pitch > 0 ? 'au-dessus' : 'en dessous'} de la ligne d'horizon → ${pitch > 0 ? 'MONTÉE' : 'DESCENTE'}.`);
    if (Math.abs(bank) >= 15 && pitch === 0) parts.push(`Repères d'inclinaison : traits longs à 30° et 60°, courts à 10, 20 et 45°. Ici : ${Math.abs(bank)}°.`);
    return parts.join(' ') || null;
  },

  keyHandler(e, submitFn) {
    const byNum = '1234'.indexOf(e.key);
    const byLetter = 'abcd'.indexOf(e.key.toLowerCase());
    const idx = byNum !== -1 ? byNum : byLetter;
    if (idx !== -1 && this._options[idx]) submitFn(this._options[idx].value);
  },
};
