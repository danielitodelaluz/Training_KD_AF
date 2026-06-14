// angle-estimation.js — Estimation d'angles (Canvas 2D)

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const TOLERANCES = [10, 7, 5, 3, 2]; // ±degrees by difficulty

function drawAngle(canvas, θDeg) {
  const W = 220, H = 180;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, W, H);

  const ox = 40, oy = H - 30;
  const len = 155;
  const θ = θDeg * Math.PI / 180;

  // Ray 1: horizontal (right)
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(ox + len, oy);
  ctx.stroke();

  // Ray 2: at angle θ
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(ox + len * Math.cos(θ), oy - len * Math.sin(θ));
  ctx.stroke();

  // Arc indicator
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(ox, oy, 32, -θ, 0);
  ctx.stroke();

  // Vertex dot
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.arc(ox, oy, 4, 0, Math.PI * 2);
  ctx.fill();

  // 90° reference corner (D1-D2: visual aid)
  if (θDeg <= 90) {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox + 16, oy);
    ctx.lineTo(ox + 16, oy - 16);
    ctx.lineTo(ox, oy - 16);
    ctx.stroke();
  }
}

export default {
  id: 'angle-estimation',
  name: "Estimation d'angles",
  category: 'spatial',
  icon: '📐',
  isSequential: false,
  requiresSpecialInput: false,
  numpadExtras: [],
  getInputType() { return 'numeric'; },

  generate(difficulty) {
    let θ;
    if (difficulty === 1) {
      θ = rand(1, 11) * 15; // 15, 30, … 165
    } else if (difficulty === 2) {
      θ = rand(2, 34) * 5;  // 10, 15, … 170
    } else {
      θ = rand(10, 170);
    }

    const tol = TOLERANCES[difficulty - 1];
    // Encode tolerance in answer: "θ|tol"
    return {
      question: "Estimez cet angle en degrés",
      answer: `${θ}|${tol}`,
      extraData: { angle: θ, tolerance: tol },
    };
  },

  validate(userAnswer, correctAnswer) {
    const [θStr, tolStr] = correctAnswer.split('|');
    const θ = parseInt(θStr, 10);
    const tol = parseInt(tolStr, 10);
    const u = parseInt(userAnswer, 10);
    if (isNaN(u)) return { correct: false };
    const diff = Math.abs(u - θ);
    return { correct: diff <= tol, partial: diff <= tol * 2 };
  },

  renderQuestion(container, item) {
    const θ = item.extraData?.angle ?? 45;
    const tol = item.extraData?.tolerance ?? 10;

    container.innerHTML = `
      <div class="question-label">Estimez cet angle en degrés</div>
      <div class="angle-canvas-wrap"></div>
      <div style="font-size:0.72rem;color:var(--text-muted);margin-top:8px">Tolérance : ±${tol}°</div>
    `;

    const wrap = container.querySelector('.angle-canvas-wrap');
    const canvas = document.createElement('canvas');
    canvas.id = 'angle-canvas';
    canvas.style.cssText = 'width:220px;height:180px;border-radius:10px;';
    wrap.appendChild(canvas);

    requestAnimationFrame(() => drawAngle(canvas, θ));
  },

  keyHandler(e, submitFn) {
    // Standard numpad handles input
  },
};
