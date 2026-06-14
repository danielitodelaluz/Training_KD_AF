// ui.js — Composants UI : numpad, timer, feedback, charts Canvas, widgets

// ============================================================
// NUMPAD
// ============================================================
export const Numpad = {
  buffer: '',
  maxLength: 8,
  onConfirm: null,
  _el: null,
  _displayEl: null,

  init(containerEl) {
    this._el = containerEl;
    this._displayEl = containerEl.querySelector('#numpad-display');
    containerEl.addEventListener('click', (e) => {
      const key = e.target.closest('[data-key]')?.dataset.key;
      if (key) this.press(key);
    });
  },

  press(key) {
    if (key === 'backspace') {
      this.buffer = this.buffer.slice(0, -1);
    } else if (key === 'confirm') {
      if (this.buffer !== '' && this.onConfirm) this.onConfirm(this.buffer);
      return;
    } else if (this.buffer.length < this.maxLength) {
      // Prevent double minus or double dot
      if (key === '-' && this.buffer.includes('-')) return;
      if (key === '.' && this.buffer.includes('.')) return;
      // Minus only at start
      if (key === '-' && this.buffer.length > 0) return;
      this.buffer += key;
    }
    this._render();
  },

  _render() {
    if (!this._displayEl) return;
    if (this.buffer === '') {
      this._displayEl.innerHTML = '<span class="placeholder">—</span>';
      this._displayEl.classList.remove('has-value');
    } else {
      this._displayEl.textContent = this.buffer;
      this._displayEl.classList.add('has-value');
    }
  },

  reset() {
    this.buffer = '';
    this._render();
  },

  showExtras(keys = []) {
    // keys: array containing 'neg', 'dot'
    const neg = this._el?.querySelector('.numpad-key--neg');
    const dot = this._el?.querySelector('.numpad-key--dot');
    if (neg) neg.classList.toggle('hidden', !keys.includes('neg'));
    if (dot) dot.classList.toggle('hidden', !keys.includes('dot'));
  },

  show() { this._el?.classList.remove('hidden'); },
  hide() { this._el?.classList.add('hidden'); },
};

// ============================================================
// TIMER / COMPTEUR
// ============================================================
export const Timer = {
  _el: null,

  init(el) { this._el = el; },

  setTime(ms) {
    if (!this._el) return;
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    this._el.textContent = `${m}:${String(s).padStart(2, '0')}`;
    this._el.classList.toggle('timer--warning', ms < 30000 && ms > 0);
  },

  setCount(current, total) {
    if (!this._el) return;
    this._el.textContent = `${current} / ${total}`;
    this._el.classList.remove('timer--warning');
  },

  clear() {
    if (this._el) this._el.textContent = '';
  },
};

// ============================================================
// PROGRESS BAR
// ============================================================
export function setProgressBar(el, ratio) {
  if (el) el.style.width = `${Math.min(1, ratio) * 100}%`;
}

// ============================================================
// FEEDBACK OVERLAY
// ============================================================
export const Feedback = {
  _el: null,
  _iconEl: null,
  _answerEl: null,
  _hideTimer: null,

  init(el) {
    this._el = el;
    this._iconEl = el.querySelector('.feedback-icon');
    this._answerEl = el.querySelector('.feedback-answer');
  },

  show(correct, correctAnswer = null, delay = 900) {
    if (!this._el) return;
    clearTimeout(this._hideTimer);
    this._el.className = 'feedback-overlay visible ' + (correct ? 'correct' : 'wrong');
    if (this._iconEl) this._iconEl.textContent = correct ? '✓' : '✗';
    if (this._answerEl) {
      this._answerEl.textContent = !correct && correctAnswer != null
        ? `Réponse : ${correctAnswer}`
        : '';
    }
    this._hideTimer = setTimeout(() => this.hide(), delay);
  },

  hide() {
    if (this._el) this._el.className = 'feedback-overlay';
  },
};

// ============================================================
// LETTER GRID (pour exercices alphabet)
// ============================================================
export function buildLetterGrid(containerEl, onLetter) {
  containerEl.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'letter-grid';

  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    const btn = document.createElement('button');
    btn.className = 'letter-btn';
    btn.textContent = letter;
    btn.addEventListener('click', () => onLetter(letter));
    grid.appendChild(btn);
  }

  // Backspace
  const back = document.createElement('button');
  back.className = 'letter-btn letter-btn--backspace';
  back.textContent = '⌫';
  back.addEventListener('click', () => onLetter('backspace'));
  grid.appendChild(back);

  // Confirm
  const confirm = document.createElement('button');
  confirm.className = 'letter-btn letter-btn--confirm';
  confirm.textContent = '✓';
  confirm.addEventListener('click', () => onLetter('confirm'));
  grid.appendChild(confirm);

  containerEl.appendChild(grid);
}

// ============================================================
// CHOICE BUTTONS (Oui/Non, A/B/C/D)
// ============================================================
export function buildChoiceButtons(containerEl, options, onChoice) {
  containerEl.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = `choice-buttons cols-${options.length <= 2 ? 2 : 4}`;

  for (const opt of options) {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    if (opt.className) btn.classList.add(opt.className);
    btn.textContent = opt.label;
    btn.addEventListener('click', () => onChoice(opt.value ?? opt.label));
    grid.appendChild(btn);
  }
  containerEl.appendChild(grid);
}

// ============================================================
// TOAST
// ============================================================
export const Toast = {
  _el: null,
  _timer: null,

  init(el) { this._el = el; },

  show(msg, type = '', duration = 2800) {
    if (!this._el) return;
    clearTimeout(this._timer);
    this._el.textContent = msg;
    this._el.className = `toast ${type ? 'toast-' + type : ''} visible`;
    this._timer = setTimeout(() => {
      if (this._el) this._el.className = 'toast';
    }, duration);
  },
};

// ============================================================
// FRACTION RENDERER
// ============================================================
export function renderFraction(num, den) {
  const wrap = document.createElement('span');
  wrap.className = 'fraction-display';
  const n = document.createElement('span');
  n.className = 'frac-num';
  n.textContent = num;
  const bar = document.createElement('span');
  bar.className = 'frac-bar';
  const d = document.createElement('span');
  d.className = 'frac-den';
  d.textContent = den;
  wrap.appendChild(n);
  wrap.appendChild(bar);
  wrap.appendChild(d);
  return wrap;
}

// ============================================================
// CANVAS CHARTS (écran Progression)
// ============================================================
function resizeCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
}

const CHART_COLORS = {
  accent: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  muted: '#475569',
  border: '#334155',
  text: '#94a3b8',
  bg: '#1e293b',
};

export function drawLineChart(canvas, data, opts = {}) {
  resizeCanvas(canvas);
  const ctx = canvas.getContext('2d');
  const W = canvas.clientWidth || canvas.width;
  const H = canvas.clientHeight || canvas.height;
  const p = { top: 14, right: 12, bottom: 28, left: 38 };

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = CHART_COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  if (!data || data.length === 0) {
    ctx.fillStyle = CHART_COLORS.text;
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Pas encore de données', W / 2, H / 2);
    return;
  }

  const maxY = opts.maxY ?? 100;
  const minY = opts.minY ?? 0;
  const range = maxY - minY;
  const chartW = W - p.left - p.right;
  const chartH = H - p.top - p.bottom;

  const xScale = (i) => p.left + (data.length === 1 ? chartW / 2 : i * chartW / (data.length - 1));
  const yScale = (v) => p.top + chartH - ((v - minY) / range) * chartH;

  // Grid lines
  ctx.strokeStyle = CHART_COLORS.border;
  ctx.lineWidth = 0.5;
  for (let pct of [0, 25, 50, 75, 100]) {
    const y = yScale(minY + range * pct / 100);
    ctx.beginPath();
    ctx.moveTo(p.left, y);
    ctx.lineTo(W - p.right, y);
    ctx.stroke();

    ctx.fillStyle = CHART_COLORS.text;
    ctx.font = '9px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(minY + range * pct / 100), p.left - 4, y + 3);
  }

  // Line
  ctx.strokeStyle = opts.color || CHART_COLORS.accent;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = xScale(i);
    const y = yScale(Math.max(minY, Math.min(maxY, v)));
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Fill under line
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = opts.color || CHART_COLORS.accent;
  ctx.lineTo(xScale(data.length - 1), p.top + chartH);
  ctx.lineTo(p.left, p.top + chartH);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Dots
  ctx.fillStyle = opts.color || CHART_COLORS.accent;
  data.forEach((v, i) => {
    const x = xScale(i);
    const y = yScale(Math.max(minY, Math.min(maxY, v)));
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // X labels (first and last)
  if (opts.labels && opts.labels.length) {
    ctx.fillStyle = CHART_COLORS.text;
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(opts.labels[0], p.left, H - 4);
    if (opts.labels.length > 1)
      ctx.fillText(opts.labels[opts.labels.length - 1], W - p.right, H - 4);
  }
}

export function drawBarChart(canvas, data, opts = {}) {
  // data: [{ label, value, color? }]
  resizeCanvas(canvas);
  const ctx = canvas.getContext('2d');
  const W = canvas.clientWidth || canvas.width;
  const H = canvas.clientHeight || canvas.height;
  const p = { top: 8, right: 10, bottom: 20, left: 10 };

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = CHART_COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  if (!data || data.length === 0) return;

  const maxVal = opts.maxY ?? Math.max(...data.map((d) => d.value), 1);
  const chartW = W - p.left - p.right;
  const chartH = H - p.top - p.bottom;
  const barW = Math.max(6, (chartW / data.length) * 0.6);
  const gap = chartW / data.length;

  data.forEach((d, i) => {
    const x = p.left + i * gap + gap / 2 - barW / 2;
    const barH = (d.value / maxVal) * chartH;
    const y = p.top + chartH - barH;

    ctx.fillStyle = d.color || CHART_COLORS.accent;
    ctx.globalAlpha = 0.85;
    const r = Math.min(4, barW / 2);
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [r, r, 0, 0]);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = CHART_COLORS.text;
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    const lbl = d.label.length > 5 ? d.label.slice(0, 5) : d.label;
    ctx.fillText(lbl, x + barW / 2, H - 4);

    if (d.value > 0) {
      ctx.fillStyle = d.color || CHART_COLORS.accent;
      ctx.font = '8px system-ui';
      ctx.fillText(Math.round(d.value), x + barW / 2, y - 3);
    }
  });
}

// Mini sparkline for exercise history
export function drawSparkline(canvas, values, color = CHART_COLORS.accent) {
  resizeCanvas(canvas);
  const ctx = canvas.getContext('2d');
  const W = canvas.clientWidth || canvas.width;
  const H = canvas.clientHeight || canvas.height;

  ctx.clearRect(0, 0, W, H);

  if (!values || values.length < 2) return;

  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const range = max - min;

  const xScale = (i) => (i / (values.length - 1)) * W;
  const yScale = (v) => H - ((v - min) / range) * (H - 8) - 4;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  values.forEach((v, i) => {
    i === 0 ? ctx.moveTo(xScale(i), yScale(v)) : ctx.lineTo(xScale(i), yScale(v));
  });
  ctx.stroke();

  // Last dot
  const last = values.length - 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(xScale(last), yScale(values[last]), 3, 0, Math.PI * 2);
  ctx.fill();
}
