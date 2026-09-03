'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const RETRO_COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
  '#f06292', // + pentominó - rosa
  '#4db6ac', // U pentominó - verde azulado
  '#dce775', // Y pentominó - lima
  '#ffffff', // 1x1 single - blanco
  '#90a4ae', // 3x3 hueca - gris
];

const NEON_COLORS = [
  null,
  '#00fff2', // I
  '#faff00', // O
  '#e000ff', // T
  '#39ff14', // S
  '#ff073a', // Z
  '#00aaff', // J
  '#ff9100', // L
  '#ff00c8', // + pentominó
  '#00ffc8', // U pentominó
  '#c6ff00', // Y pentominó
  '#ffffff', // 1x1 single
  '#8a8aff', // 3x3 hueca
];

const PASTEL_COLORS = [
  null,
  '#a8d8ea', // I
  '#fff3b0', // O
  '#d9b3ff', // T
  '#b5e8b5', // S
  '#ffb3ba', // Z
  '#bae1ff', // J
  '#ffdfba', // L
  '#ffb3de', // + pentominó
  '#b3fff0', // U pentominó
  '#e8ffb3', // Y pentominó
  '#ffffff', // 1x1 single
  '#d0d0e0', // 3x3 hueca
];

const PIXEL_COLORS = RETRO_COLORS;

let COLORS = RETRO_COLORS;

const PIECES = [
  null,
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  [[2, 2], [2, 2]],                               // O
  [[0, 3, 0], [3, 3, 3], [0, 0, 0]],                  // T
  [[0, 4, 4], [4, 4, 0], [0, 0, 0]],                  // S
  [[5, 5, 0], [0, 5, 5], [0, 0, 0]],                  // Z
  [[6, 0, 0], [6, 6, 6], [0, 0, 0]],                  // J
  [[0, 0, 7], [7, 7, 7], [0, 0, 0]],                  // L
  [[0, 8, 0], [8, 8, 8], [0, 8, 0]],                  // + pentominó
  [[9, 0, 9], [9, 9, 9], [0, 0, 0]],                  // U pentominó
  [[0, 10, 0, 0], [10, 10, 0, 0], [0, 10, 0, 0], [0, 10, 0, 0]], // Y pentominó
  [[11]],                                      // 1x1 single (recompensa)
  [[12, 12, 12], [12, 0, 12], [12, 12, 12]],          // 3x3 hueca (reto)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const PENTOMINO_TYPES = [8, 9, 10];
const SINGLE_TYPE = 11;
const HOLLOW_TYPE = 12;
const PENTOMINO_CHANCE = 0.10; // 10% por pieza generada
const HOLLOW_CHANCE = 0.03;    // 3% por pieza generada
const MAX_SINGLE_STOCK = 3;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const pauseMenu = document.getElementById('pause-menu');
const controlsPanel = document.getElementById('controls-panel');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const controlsBtn = document.getElementById('controls-btn');
const controlsBackBtn = document.getElementById('controls-back-btn');
const startLevelSelect = document.getElementById('start-level-select');

const START_LEVEL_MAX = 10;
const skinSelect = document.getElementById('skin-select');

const THEME_STORAGE_KEY = 'tetris-theme';

let gridColor = '#22222e';

function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  gridColor = getComputedStyle(document.body).getPropertyValue('--grid-color').trim();
  themeToggleBtn.textContent = theme === 'light' ? '☀️' : '🌙';
  themeToggleBtn.setAttribute('aria-pressed', String(theme === 'light'));
  themeToggleBtn.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}
const singleStockEl = document.getElementById('single-stock');
const bestComboEl = document.getElementById('best-combo');
const bestLinesEl = document.getElementById('best-lines');
const recordsListEl = document.getElementById('records-list');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const overlayRecordsEl = document.getElementById('overlay-records');
const nameEntryEl = document.getElementById('name-entry');
const playerNameInput = document.getElementById('player-name');
const saveRecordBtn = document.getElementById('save-record-btn');

const RECORDS_KEY = 'tetris-records';
const STATS_KEY = 'tetris-stats';
const MAX_RECORDS = 5;

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, singleStock, combo, maxCombo, maxLineClear;
let menuView = 'main';
let startLevel = 1;

function populateStartLevelSelect() {
  for (let lvl = 1; lvl <= START_LEVEL_MAX; lvl++) {
    const opt = document.createElement('option');
    opt.value = lvl;
    opt.textContent = lvl;
    startLevelSelect.appendChild(opt);
  }
  startLevelSelect.value = startLevel;
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function makePiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function randomType() {
  const r = Math.random();
  if (r < HOLLOW_CHANCE) return HOLLOW_TYPE;
  if (r < HOLLOW_CHANCE + PENTOMINO_CHANCE)
    return PENTOMINO_TYPES[Math.floor(Math.random() * PENTOMINO_TYPES.length)];
  return Math.floor(Math.random() * 7) + 1;
}

function randomPiece() {
  return makePiece(randomType());
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    if (cleared === 4) singleStock = Math.min(singleStock + 1, MAX_SINGLE_STOCK);
    combo++;
    maxCombo = Math.max(maxCombo, combo);
    maxLineClear = Math.max(maxLineClear, cleared);
    updateHUD();
  } else {
    combo = -1;
  }
}

function useSingle() {
  if (singleStock <= 0) return;
  const candidate = makePiece(SINGLE_TYPE);
  const offsets = [[0, 0], [0, -1], [0, -2], [-1, 0], [1, 0]];
  for (const [dx, dy] of offsets) {
    const x = current.x + dx;
    const y = current.y + dy;
    if (!collide(candidate.shape, x, y)) {
      candidate.x = x;
      candidate.y = y;
      current = candidate;
      singleStock--;
      updateHUD();
      return;
    }
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  singleStockEl.textContent = singleStock;
}

function renderBlockRetro(context, x, y, colorIndex, size, alpha) {
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function renderBlockNeon(context, x, y, colorIndex, size, alpha) {
  const color = COLORS[colorIndex];
  context.save();
  context.globalAlpha = alpha ?? 1;
  context.shadowColor = color;
  context.shadowBlur = size * 0.5;
  context.fillStyle = color;
  context.fillRect(x * size + 3, y * size + 3, size - 6, size - 6);
  context.shadowBlur = 0;
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.strokeRect(x * size + 3, y * size + 3, size - 6, size - 6);
  context.restore();
}

function renderBlockPastel(context, x, y, colorIndex, size, alpha) {
  const color = COLORS[colorIndex];
  const px = x * size + 2, py = y * size + 2, w = size - 4, h = size - 4, r = Math.min(6, w / 2);
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.beginPath();
  if (context.roundRect) {
    context.roundRect(px, py, w, h, r);
  } else {
    context.moveTo(px + r, py);
    context.arcTo(px + w, py, px + w, py + h, r);
    context.arcTo(px + w, py + h, px, py + h, r);
    context.arcTo(px, py + h, px, py, r);
    context.arcTo(px, py, px + w, py, r);
    context.closePath();
  }
  context.fill();
  context.globalAlpha = 1;
}

function renderBlockPixel(context, x, y, colorIndex, size, alpha) {
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  const sub = (size - 2) / 4;
  context.fillStyle = 'rgba(0,0,0,0.15)';
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      if ((i + j) % 2 === 0)
        context.fillRect(x * size + 1 + i * sub, y * size + 1 + j * sub, sub, sub);
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 2);
  context.globalAlpha = 1;
}

const SKINS = {
  retro: { label: 'Retro', colors: RETRO_COLORS, render: renderBlockRetro, bodyClass: 'skin-retro' },
  neon: { label: 'Neon', colors: NEON_COLORS, render: renderBlockNeon, bodyClass: 'skin-neon' },
  pastel: { label: 'Pastel', colors: PASTEL_COLORS, render: renderBlockPastel, bodyClass: 'skin-pastel' },
  pixel: { label: 'Pixel Art', colors: PIXEL_COLORS, render: renderBlockPixel, bodyClass: 'skin-pixel' },
};

const SKIN_STORAGE_KEY = 'tetris-skin';
let renderBlock = SKINS.retro.render;

function applySkin(skinKey) {
  const skin = SKINS[skinKey] ? skinKey : 'retro';
  COLORS = SKINS[skin].colors;
  renderBlock = SKINS[skin].render;
  document.body.classList.remove('skin-retro', 'skin-neon', 'skin-pastel', 'skin-pixel');
  document.body.classList.add(SKINS[skin].bodyClass);
  localStorage.setItem(SKIN_STORAGE_KEY, skin);
  if (skinSelect) skinSelect.value = skin;
  if (typeof board !== 'undefined' && board) { draw(); drawNext(); }
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  renderBlock(context, x, y, colorIndex, size, alpha);
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  if (!gameOver) {
    // ghost
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

    // current piece
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
  }
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function loadRecords() {
  try {
    const data = JSON.parse(localStorage.getItem(RECORDS_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function loadStats() {
  try {
    const data = JSON.parse(localStorage.getItem(STATS_KEY));
    return { bestCombo: data?.bestCombo || 0, bestLineClear: data?.bestLineClear || 0 };
  } catch {
    return { bestCombo: 0, bestLineClear: 0 };
  }
}

function updateStats() {
  const stats = loadStats();
  stats.bestCombo = Math.max(stats.bestCombo, maxCombo);
  stats.bestLineClear = Math.max(stats.bestLineClear, maxLineClear);
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function renderStats() {
  const stats = loadStats();
  bestComboEl.textContent = stats.bestCombo;
  bestLinesEl.textContent = stats.bestLineClear;
}

function qualifiesForTop(scoreValue) {
  if (scoreValue <= 0) return false;
  const records = loadRecords();
  return records.length < MAX_RECORDS || scoreValue > records[records.length - 1].score;
}

function addRecord(name, scoreValue) {
  const records = loadRecords();
  const entry = { name: name || 'JUGADOR', score: scoreValue, lines };
  records.push(entry);
  records.sort((a, b) => b.score - a.score);
  const trimmed = records.slice(0, MAX_RECORDS);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(trimmed));
  return { records: trimmed, idx: trimmed.indexOf(entry) };
}

function renderRecordsList(target, records, highlightIdx) {
  target.innerHTML = '';
  if (!records.length) {
    const li = document.createElement('li');
    li.className = 'records-empty';
    li.textContent = 'Sin récords todavía';
    target.appendChild(li);
    return;
  }
  records.forEach((r, i) => {
    const li = document.createElement('li');
    if (i === highlightIdx) li.classList.add('highlight');
    li.innerHTML = `<span class="rec-rank">${i + 1}</span><span class="rec-name">${escapeHtml(r.name)}</span><span class="rec-score">${r.score.toLocaleString()}</span>`;
    target.appendChild(li);
  });
}

function submitRecord() {
  const name = playerNameInput.value.trim().slice(0, 10);
  const { records, idx } = addRecord(name, score);
  renderRecordsList(overlayRecordsEl, records, idx);
  renderRecordsList(recordsListEl, records);
  nameEntryEl.classList.add('hidden');
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  pauseMenu.classList.add('hidden');
  controlsPanel.classList.add('hidden');
  restartBtn.classList.remove('hidden');
  updateStats();
  renderStats();
  if (qualifiesForTop(score)) {
    nameEntryEl.classList.remove('hidden');
    playerNameInput.value = '';
    overlayRecordsEl.innerHTML = '';
    setTimeout(() => playerNameInput.focus(), 0);
  } else {
    nameEntryEl.classList.add('hidden');
    renderRecordsList(overlayRecordsEl, loadRecords());
  }
  overlay.classList.remove('hidden');
}

function openPauseMenu() {
  menuView = 'main';
  overlayTitle.textContent = 'PAUSA';
  overlayScore.textContent = '';
  restartBtn.classList.add('hidden');
  controlsPanel.classList.add('hidden');
  nameEntryEl.classList.add('hidden');
  overlayRecordsEl.innerHTML = '';
  pauseMenu.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function showControlsPanel() {
  menuView = 'controls';
  overlayTitle.textContent = 'CONTROLES';
  pauseMenu.classList.add('hidden');
  controlsPanel.classList.remove('hidden');
}

function showPauseMainMenu() {
  menuView = 'main';
  overlayTitle.textContent = 'PAUSA';
  controlsPanel.classList.add('hidden');
  pauseMenu.classList.remove('hidden');
}

function closeMenu() {
  overlay.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  controlsPanel.classList.add('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    closeMenu();
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    openPauseMenu();
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  if (gameOver) { draw(); return; }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  singleStock = 0;
  combo = -1;
  maxCombo = 0;
  maxLineClear = 0;
  paused = false;
  gameOver = false;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  closeMenu();
  restartBtn.classList.remove('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (e.code === 'Escape') {
    if (paused && menuView === 'controls') { showPauseMainMenu(); return; }
    togglePause();
    return;
  }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyC':
      useSingle();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
resumeBtn.addEventListener('click', togglePause);
pauseRestartBtn.addEventListener('click', init);
controlsBtn.addEventListener('click', showControlsPanel);
controlsBackBtn.addEventListener('click', showPauseMainMenu);
startLevelSelect.addEventListener('change', () => {
  startLevel = parseInt(startLevelSelect.value, 10);
});

themeToggleBtn.addEventListener('click', () => {
  const isLight = document.body.classList.contains('light');
  applyTheme(isLight ? 'dark' : 'light');
});

skinSelect.addEventListener('change', e => applySkin(e.target.value));

saveRecordBtn.addEventListener('click', submitRecord);
playerNameInput.addEventListener('keydown', e => {
  if (e.code === 'Enter') {
    e.preventDefault();
    submitRecord();
  }
});

resetRecordsBtn.addEventListener('click', () => {
  if (!confirm('¿Borrar todos los récords y estadísticas?')) return;
  localStorage.removeItem(RECORDS_KEY);
  localStorage.removeItem(STATS_KEY);
  renderRecordsList(recordsListEl, []);
  renderRecordsList(overlayRecordsEl, []);
  renderStats();
});

applySkin(localStorage.getItem(SKIN_STORAGE_KEY) || 'retro');
applyTheme(localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark');
populateStartLevelSelect();
renderRecordsList(recordsListEl, loadRecords());
renderStats();
init();
