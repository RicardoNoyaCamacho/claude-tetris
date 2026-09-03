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
  '#00e5ff', // I
  '#fff176', // O
  '#e040fb', // T
  '#69f0ae', // S
  '#ff5252', // Z
  '#40c4ff', // J
  '#ffab40', // L
  '#ff4081', // + pentominó
  '#1de9b6', // U pentominó
  '#eeff41', // Y pentominó
  '#ffffff', // 1x1 single
  '#607d8b', // 3x3 hueca
];

const PASTEL_COLORS = [
  null,
  '#aee1e8', // I
  '#fff3b0', // O
  '#d9bfe0', // T
  '#bdeecb', // S
  '#ffc4c4', // Z
  '#c6d8f0', // J
  '#ffdcb8', // L
  '#f7c6de', // + pentominó
  '#b5e8de', // U pentominó
  '#eef4ab', // Y pentominó
  '#ffffff', // 1x1 single
  '#d3dde3', // 3x3 hueca
];

const SKINS = {
  retro: { label: 'Retro', colors: RETRO_COLORS, drawBlock: drawBlockRetro },
  neon: { label: 'Neon', colors: NEON_COLORS, drawBlock: drawBlockNeon },
  pastel: { label: 'Pastel', colors: PASTEL_COLORS, drawBlock: drawBlockPastel },
  pixel: { label: 'Pixel art', colors: RETRO_COLORS, drawBlock: drawBlockPixel },
};

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
const skinSelect = document.getElementById('skin-select');

const THEME_STORAGE_KEY = 'tetris-theme';
const SKIN_STORAGE_KEY = 'tetris-skin';

let gridColor = '#22222e';
let currentSkin = SKINS.retro;

function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  gridColor = getComputedStyle(document.body).getPropertyValue('--grid-color').trim();
  themeToggleBtn.textContent = theme === 'light' ? '☀️' : '🌙';
  themeToggleBtn.setAttribute('aria-pressed', String(theme === 'light'));
  themeToggleBtn.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function applySkin(name) {
  const key = SKINS[name] ? name : 'retro';
  currentSkin = SKINS[key];
  document.body.dataset.skin = key;
  gridColor = getComputedStyle(document.body).getPropertyValue('--grid-color').trim();
  skinSelect.value = key;
  localStorage.setItem(SKIN_STORAGE_KEY, key);
  if (board) {
    draw();
    drawNext();
  }
}
const singleStockEl = document.getElementById('single-stock');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, singleStock;

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
    updateHUD();
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

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  currentSkin.drawBlock(context, x, y, colorIndex, size, alpha);
}

function roundRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function drawBlockRetro(context, x, y, colorIndex, size, alpha) {
  const color = currentSkin.colors[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawBlockNeon(context, x, y, colorIndex, size, alpha) {
  const color = currentSkin.colors[colorIndex];
  const px = x * size, py = y * size;
  context.save();
  context.globalAlpha = alpha ?? 1;
  context.shadowColor = color;
  context.shadowBlur = 14;
  context.fillStyle = color;
  context.fillRect(px + 2, py + 2, size - 4, size - 4);
  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(255,255,255,0.7)';
  context.lineWidth = 1;
  context.strokeRect(px + 2.5, py + 2.5, size - 5, size - 5);
  context.restore();
}

function drawBlockPastel(context, x, y, colorIndex, size, alpha) {
  const color = currentSkin.colors[colorIndex];
  const px = x * size, py = y * size;
  const r = size * 0.22;
  context.save();
  context.globalAlpha = alpha ?? 1;
  roundRectPath(context, px + 2, py + 2, size - 4, size - 4, r);
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.6)';
  context.lineWidth = 1.5;
  context.stroke();
  context.restore();
}

function drawBlockPixel(context, x, y, colorIndex, size, alpha) {
  const color = currentSkin.colors[colorIndex];
  const px = x * size, py = y * size;
  context.save();
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  // pixel-art texture: checkerboard sub-cells
  const cell = (size - 2) / 3;
  context.fillStyle = 'rgba(0,0,0,0.15)';
  for (let gr = 0; gr < 3; gr++) {
    for (let gc = 0; gc < 3; gc++) {
      if ((gr + gc) % 2 === 0) {
        context.fillRect(px + 1 + gc * cell, py + 1 + gr * cell, cell, cell);
      }
    }
  }
  context.strokeStyle = 'rgba(0,0,0,0.4)';
  context.lineWidth = 1;
  context.strokeRect(px + 1, py + 1, size - 2, size - 2);
  context.restore();
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

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
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
  level = 1;
  singleStock = 0;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
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

themeToggleBtn.addEventListener('click', () => {
  const isLight = document.body.classList.contains('light');
  applyTheme(isLight ? 'dark' : 'light');
});

skinSelect.addEventListener('change', () => applySkin(skinSelect.value));

applyTheme(localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark');
applySkin(localStorage.getItem(SKIN_STORAGE_KEY) || 'retro');
init();
