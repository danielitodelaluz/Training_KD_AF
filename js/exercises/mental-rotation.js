// mental-rotation.js — Rotation mentale 2D (Canvas)

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// 5 shapes defined as normalized points [-1..1]
const SHAPES = [
  [{x:0,y:-1},{x:0.6,y:-0.2},{x:0.35,y:0.95},{x:-0.35,y:0.95},{x:-0.6,y:-0.2}],
  [{x:-0.8,y:0.4},{x:0,y:-1},{x:0.8,y:0.4},{x:0.3,y:0.4},{x:0.1,y:-0.1},{x:-0.1,y:-0.1},{x:-0.3,y:0.4}],
  [{x:-0.9,y:-0.2},{x:0,y:-1},{x:0.9,y:0},{x:0.4,y:0.95},{x:-0.5,y:0.6}],
  [{x:0,y:-1},{x:0.6,y:-0.2},{x:1,y:0.7},{x:-0.1,y:0.3},{x:-1,y:0.7},{x:-0.6,y:-0.2}],
  [{x:-0.55,y:-1},{x:0.55,y:-1},{x:0.95,y:0.1},{x:0,y:1},{x:-0.95,y:0.1}],
];

function drawShape(canvas, points, angleDeg, mirrored = false, color = '#6366f1') {
  const size = canvas.width || 80;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(angleDeg * Math.PI / 180);
  if (mirrored) ctx.scale(-1, 1);
  const scale = size * 0.38;
  ctx.beginPath();
  points.forEach((p, i) => {
    i === 0 ? ctx.moveTo(p.x * scale, p.y * scale) : ctx.lineTo(p.x * scale, p.y * scale);
  });
  ctx.closePath();
  ctx.fillStyle = color + '2a';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

const ANGLE_STEPS_BY_DIFF = [
  [45, 90, 135, 180, 270],          // D1
  [45, 90, 135, 180, 270],          // D2 (>= 4 angles distincts requis)
  [30, 45, 60, 90, 120, 150, 180, 270], // D3
  [30, 45, 60, 90, 120, 150, 210, 270], // D4
  [20, 40, 70, 110, 150, 200, 250, 310], // D5
];

export default {
  id: 'mental-rotation',
  name: 'Rotation mentale',
  category: 'spatial',
  icon: '🔄',
  isSequential: false,
  requiresSpecialInput: true,
  numpadExtras: [],
  getInputType() { return 'choice'; },

  generate(difficulty) {
    const shapeIdx = rand(0, SHAPES.length - 1);
    const angles = ANGLE_STEPS_BY_DIFF[difficulty - 1];
    const mirrorCount = difficulty >= 4 ? (difficulty === 5 ? 2 : 1) : 0;

    const correctAngle = pick(angles);
    const correctOption = pick(['A', 'B', 'C', 'D']);

    // Generate 4 option angles (all different). Garde-fou contre une boucle
    // infinie si le jeu d'angles contient moins de 4 valeurs distinctes.
    const optionAngles = [correctAngle];
    let guard = 0;
    while (optionAngles.length < 4 && guard < 200) {
      guard++;
      const candidate = pick(angles);
      if (!optionAngles.includes(candidate)) optionAngles.push(candidate);
    }
    // Complète si besoin avec des angles décalés uniques
    let extra = 15;
    while (optionAngles.length < 4) {
      const candidate = (correctAngle + extra) % 360;
      if (!optionAngles.includes(candidate)) optionAngles.push(candidate);
      extra += 15;
    }
    // Shuffle keeping correctAngle at correctOption position
    const optionLetters = ['A', 'B', 'C', 'D'];
    const correctIdx = optionLetters.indexOf(correctOption);
    // Put correctAngle at correctIdx
    const tmp = optionAngles[0];
    optionAngles[0] = optionAngles[correctIdx];
    optionAngles[correctIdx] = tmp;

    // Determine which options are mirrored
    const mirrorFlags = [false, false, false, false];
    let mirrorsPlaced = 0;
    for (let i = 0; i < 4 && mirrorsPlaced < mirrorCount; i++) {
      if (i !== correctIdx) { mirrorFlags[i] = true; mirrorsPlaced++; }
    }

    return {
      question: `Quelle option montre la même forme tournée ?`,
      answer: correctOption,
      extraData: { shapeIdx, referenceAngle: 0, optionAngles, mirrorFlags, correctOption },
    };
  },

  validate(userAnswer, correctAnswer) {
    return { correct: userAnswer.toUpperCase() === correctAnswer.toUpperCase() };
  },

  renderQuestion(container, item, ctx) {
    const { shapeIdx, optionAngles, mirrorFlags, correctOption } = item.extraData;
    const points = SHAPES[shapeIdx];

    container.innerHTML = '<div class="question-label">Quelle option montre la même forme tournée ?</div>';

    // Reference shape canvas
    const refCanvas = document.createElement('canvas');
    refCanvas.className = 'rotation-question-canvas';
    refCanvas.width = 110;
    refCanvas.height = 110;
    refCanvas.style.cssText = 'width:110px;height:110px;margin-bottom:8px;';
    container.appendChild(refCanvas);
    requestAnimationFrame(() => drawShape(refCanvas, points, 0, false));

    // 4 option canvases in special area
    ctx.special.classList.remove('hidden');
    const grid = document.createElement('div');
    grid.className = 'rotation-options';
    ['A', 'B', 'C', 'D'].forEach((letter, i) => {
      const optDiv = document.createElement('div');
      optDiv.className = 'rotation-option';

      const c = document.createElement('canvas');
      c.width = 90;
      c.height = 90;
      c.style.cssText = 'width:100%;display:block;';
      optDiv.appendChild(c);

      const lbl = document.createElement('div');
      lbl.className = 'opt-label';
      lbl.textContent = letter;
      optDiv.appendChild(lbl);

      optDiv.addEventListener('click', () => ctx.onAnswer(letter));
      grid.appendChild(optDiv);

      requestAnimationFrame(() => drawShape(c, points, optionAngles[i], mirrorFlags[i]));
    });
    ctx.special.appendChild(grid);
  },

  keyHandler(e, submitFn) {
    const key = e.key.toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(key)) { e.preventDefault(); submitFn(key); }
  },
};
