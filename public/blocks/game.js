import { SIZE, COLORS, SHAPES, getPieceAnchor, resolvePlacement, hasPlace, newPieces, newGame, placePiece, isValidState } from './core-e95dbecd1d24.js';

const $ = id => document.getElementById(id);
const SAVE_KEY = 'mallang-blocks:v1';
const CENTER_LAYOUT_VERSION = 2;
const LINE_CLEAR_DURATION = 1100;
let state = newGame(), best = 0, selected = -1, sound = false, audio, drag, previewIndex = -1;
let resolvingMove = false;
let centerLayout = true, unpinnedScrollY = 0;
let viewportFrame = 0;
let selectedAnchor = [0, 0];
let history = [], feedbackTimer, celebrationTimer;
let storageNoteShown = false, suppressPieceClickUntil = 0, suppressBoardClickUntil = 0;
const cells = [];

// Android browsers use contextmenu for long presses. Keep browser menus from
// interrupting play, alongside the shared CSS text-selection and touch rules.
document.querySelectorAll('.game-card, .modal').forEach(surface => {
  surface.addEventListener('contextmenu', event => event.preventDefault());
});

try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (saved?.version === 1) {
    if (isValidState(saved.state)) state = saved.state;
    if (Number.isSafeInteger(saved.best) && saved.best >= 0) best = saved.best;
    sound = saved.sound === true;
    // Older saves wrote false even when the player never changed this option.
    if (saved.centerLayoutVersion === CENTER_LAYOUT_VERSION) centerLayout = saved.centerLayout !== false;
  }
} catch { /* Ignore inaccessible or damaged saved data. */ }
best = Math.max(best, state.score);

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, state, best, sound, centerLayout, centerLayoutVersion: CENTER_LAYOUT_VERSION }));
  } catch {
    if (!storageNoteShown) {
      storageNoteShown = true;
      const note = document.createElement('p');
      note.className = 'storage-note';
      note.textContent = '이 브라우저에서는 기록을 저장할 수 없지만, 지금은 계속 놀 수 있어요.';
      $('game-message').after(note);
    }
  }
}

function announce(message, success = false, temporary = false) {
  clearTimeout(feedbackTimer);
  $('game-message').textContent = message;
  $('game-message').classList.toggle('success', success);
  if (temporary) feedbackTimer = setTimeout(() => announce(defaultMessage()), 3500);
}
function defaultMessage() {
  if (!state.pieces.some(p => p && hasPlace(state.board, p))) return '괜찮아요! ‘새 블록 받기’를 눌러 보세요.';
  return selected >= 0 ? '빈칸을 톡! 또는 꾹 누른 채 끌어 놓아요.' : '☝ 블록을 골라, 빈칸에 놓아 보세요!';
}

function blockElement(piece, className = 'piece') {
  const shape = SHAPES[piece.shape];
  const rows = Math.max(...shape.cells.map(c => c[0])) + 1;
  const cols = Math.max(...shape.cells.map(c => c[1])) + 1;
  const el = document.createElement('span');
  el.className = className;
  el.style.setProperty('--cols', cols);
  el.style.setProperty('--rows', rows);
  el.style.setProperty('--block-color', COLORS[piece.color]);
  for (const [r, c] of shape.cells) {
    const square = document.createElement('span');
    square.className = 'mini-cell';
    square.style.gridRow = r + 1;
    square.style.gridColumn = c + 1;
    square.dataset.row = r;
    square.dataset.col = c;
    el.append(square);
  }
  return { el, rows, cols };
}

for (let i = 0; i < SIZE * SIZE; i++) {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = 'cell';
  cell.dataset.index = i;
  cell.tabIndex = i === 0 ? 0 : -1;
  cell.addEventListener('click', event => {
    // A board drag already places on pointerup; ignore its following click.
    if (!drag && (event.detail === 0 || performance.now() >= suppressBoardClickUntil)) placeAt(i);
  });
  cell.addEventListener('pointerdown', event => {
    if (selected >= 0 && state.pieces[selected]) startDrag(event, selected, { fromBoard: true });
  });
  cell.addEventListener('pointerenter', () => { if (!drag) showPreview(i); });
  cell.addEventListener('focus', () => showPreview(i));
  cell.addEventListener('blur', clearPreview);
  cell.addEventListener('keydown', event => {
    const offsets = { ArrowUp: -SIZE, ArrowDown: SIZE, ArrowLeft: -1, ArrowRight: 1 };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const next = i + offsets[event.key];
    if (next < 0 || next >= SIZE * SIZE || (event.key === 'ArrowLeft' && i % SIZE === 0) || (event.key === 'ArrowRight' && i % SIZE === SIZE - 1)) return;
    cells.forEach((c, n) => { c.tabIndex = n === next ? 0 : -1; });
    cells[next].focus({ preventScroll: centerLayout });
  });
  cells.push(cell);
  $('board').append(cell);
}
$('board').addEventListener('pointerleave', () => { if (!drag) clearPreview(); });

function clearPreview() {
  previewIndex = -1;
  cells.forEach(c => c.classList.remove('preview-valid', 'preview-invalid'));
}
function showPreview(index) {
  clearPreview();
  if (resolvingMove || selected < 0 || !state.pieces[selected] || index < 0) return;
  previewIndex = index;
  const piece = state.pieces[selected], anchor = drag?.anchor ?? selectedAnchor;
  const targetRow = Math.floor(index / SIZE), targetCol = index % SIZE;
  const placement = resolvePlacement(state.board, piece, targetRow, targetCol, anchor);
  const row = placement?.row ?? targetRow - anchor[0];
  const col = placement?.col ?? targetCol - anchor[1];
  for (const [r, c] of SHAPES[piece.shape].cells) {
    const rr = row + r, cc = col + c;
    if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) {
      const cell = cells[rr * SIZE + cc];
      cell.style.setProperty('--preview-color', COLORS[piece.color]);
      cell.classList.add(placement ? 'preview-valid' : 'preview-invalid');
    }
  }
  return placement;
}
function selectPiece(index, { quiet = false, anchor = getPieceAnchor(state.pieces[index]), previewFocusedCell = false } = {}) {
  if (resolvingMove || !state.pieces[index]) return;
  selected = index;
  selectedAnchor = anchor;
  Array.from($('piece-tray').children).forEach((slot, i) => {
    slot.setAttribute('aria-pressed', String(i === selected));
    slot.querySelectorAll('.mini-cell').forEach(square => square.classList.toggle('anchor-cell',
      i === selected && Number(square.dataset.row) === anchor[0] && Number(square.dataset.col) === anchor[1]));
  });
  if (!quiet) announce(defaultMessage());
  clearPreview();
  // Pointerdown runs before the old board cell loses focus. Reusing it here
  // briefly paints a preview at a stale position when selecting a tray piece.
  if (previewFocusedCell && document.activeElement?.classList.contains('cell')) showPreview(Number(document.activeElement.dataset.index));
}

function grabPoint(index, x, y) {
  const slot = $('piece-tray').children[index];
  for (const square of slot.querySelectorAll('.mini-cell')) {
    const rect = square.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return { anchor: [Number(square.dataset.row), Number(square.dataset.col)],
        offsetX: (x - rect.left) / rect.width, offsetY: (y - rect.top) / rect.height };
    }
  }
  return { anchor: getPieceAnchor(state.pieces[index]), offsetX: .5, offsetY: .5 };
}

function renderBoard(board = state.board) {
  clearPreview();
  cells.forEach((cell, i) => {
    const color = board[i];
    cell.classList.remove('placed', 'line-complete');
    cell.classList.toggle('filled', color !== null);
    cell.style.setProperty('--block-color', color !== null ? COLORS[color] : 'transparent');
    cell.setAttribute('aria-label', `${Math.floor(i / SIZE) + 1}줄 ${i % SIZE + 1}칸, ${color === null ? '빈칸' : '블록 있음'}`);
  });
}

function render() {
  renderBoard();
  $('piece-tray').replaceChildren();
  state.pieces.forEach((piece, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'piece-slot' + (piece ? '' : ' is-used');
    button.setAttribute('aria-pressed', String(i === selected));
    button.dataset.piece = i;
    if (piece) {
      const colorNames = ['진분홍', '노랑', '초록', '연분홍', '파랑', '살구'];
      button.setAttribute('aria-label', `${i + 1}번 ${colorNames[piece.color]} ${SHAPES[piece.shape].name} 블록`);
      const number = document.createElement('span');
      number.className = 'piece-number';
      number.textContent = i + 1;
      number.setAttribute('aria-hidden', 'true');
      button.append(number, blockElement(piece).el);
      button.addEventListener('click', event => {
        if (performance.now() >= suppressPieceClickUntil) selectPiece(i, { anchor: grabPoint(i, event.clientX, event.clientY).anchor });
      });
      button.addEventListener('pointerdown', event => startDrag(event, i));
    } else {
      button.textContent = '✓';
      button.setAttribute('aria-label', `${i + 1}번 블록 놓기 완료`);
      button.disabled = true;
    }
    $('piece-tray').append(button);
  });
  $('score').textContent = state.score.toLocaleString('ko-KR');
  $('center-score').textContent = `${state.score.toLocaleString('ko-KR')}점`;
  $('lines').textContent = state.lines;
  $('best').textContent = best.toLocaleString('ko-KR');
  $('undo-button').disabled = history.length === 0;
  $('undo-help').textContent = history.length ? '방금 전으로' : '먼저 놓아봐요';
  const flowers = Math.floor(state.lines / 3), progress = state.lines % 3;
  $('garden-count').textContent = flowers ? `꽃 ${flowers}송이` : `씨앗 ${progress} / 3`;
  $('garden').classList.toggle('bloomed', flowers > 0);
  $('garden').setAttribute('aria-label', `꽃 ${flowers}송이, 다음 꽃까지 ${3 - progress}줄`);
  document.querySelectorAll('.garden-progress span').forEach((el, i) => el.classList.toggle('done', i < progress));
  $('garden-message').textContent = flowers ? `꽃 ${flowers}송이! 다음 꽃까지 ${3 - progress}줄 남았어요.` : progress ? `잘하고 있어요! ${3 - progress}줄만 더 채워 볼까요?` : '첫 번째 꽃을 함께 피워 볼까요?';
  updateSoundButton();
}

function snapshot() {
  history.push(structuredClone(state));
  if (history.length > 30) history.shift();
}
function setResolvingMove(value) {
  resolvingMove = value;
  $('board').setAttribute('aria-busy', String(value));
  Array.from($('piece-tray').children).forEach((button, i) => {
    button.disabled = value || !state.pieces[i];
    if (value) button.setAttribute('aria-pressed', 'false');
  });
  $('undo-button').disabled = value || history.length === 0;
  $('shuffle-button').disabled = value;
  $('restart-button').disabled = value;
}

function placeAt(index, anchor = selectedAnchor) {
  if (resolvingMove) return;
  if (selected < 0 || !state.pieces[selected]) { announce('먼저 블록 중 하나를 골라 주세요.', false, true); return; }
  const placement = resolvePlacement(state.board, state.pieces[selected], Math.floor(index / SIZE), index % SIZE, anchor);
  const result = placement && placePiece(state, selected, placement.row, placement.col);
  if (!result) {
    announce('여기는 조금 좁아요. 다른 빈칸을 찾아볼까요?', false, true);
    return;
  }
  // Keep the just-completed lines visible while the saved game already holds
  // the resolved move, so reloading during the effect cannot lose the move.
  const completedBoard = [...state.board];
  result.placed.forEach(i => { completedBoard[i] = state.pieces[selected].color; });
  snapshot();
  state = result.state;
  best = Math.max(best, state.score);
  selected = -1;
  if (state.pieces.every(p => !p)) state.pieces = newPieces(state.board);
  save();
  if (result.lines) {
    setResolvingMove(true);
    renderBoard(completedBoard);
    $('board').style.setProperty('--clear-duration', `${LINE_CLEAR_DURATION}ms`);
    result.cleared.forEach(i => cells[i].classList.add('line-complete'));
    announce(result.lines > 1 ? `${result.lines}줄이 가득 찼어요! 반짝… ✨` : '한 줄이 가득 찼어요! 반짝… ✨', true);
    playTone(true);
    setTimeout(() => {
      render();
      setResolvingMove(false);
      celebrate(result.lines);
      announce(result.lines > 1 ? `${result.lines}줄을 한 번에! 정말 멋져요 ✨` : '반짝! 한 줄을 완성했어요 ✨', true, true);
    }, LINE_CLEAR_DURATION);
    return;
  }
  render();
  result.placed.filter(i => !result.cleared.includes(i)).forEach(i => {
    cells[i].classList.remove('placed');
    void cells[i].offsetWidth;
    cells[i].classList.add('placed');
  });
  playTone(false);
  announce(state.pieces.some(p => p && hasPlace(state.board, p)) ? '쏙! 잘 놓았어요. 다음 블록도 골라 볼까요?' : defaultMessage(), false, true);
}

function celebrate(lines) {
  clearTimeout(celebrationTimer);
  $('celebration').replaceChildren();
  for (let i = 0; i < 26; i++) {
    const confetti = document.createElement('span');
    confetti.className = 'confetti';
    confetti.style.setProperty('--x', `${Math.random() * 100}%`);
    confetti.style.setProperty('--color', COLORS[i % COLORS.length]);
    confetti.style.setProperty('--delay', `${Math.random() * .25}s`);
    $('celebration').append(confetti);
  }
  const label = document.createElement('span');
  label.className = 'celebration-label';
  label.textContent = `${lines > 1 ? `${lines}줄 완성` : '한 줄 완성'} ✨`;
  $('celebration').append(label);
  celebrationTimer = setTimeout(() => $('celebration').replaceChildren(), 2000);
}

function startDrag(event, index, { fromBoard = false } = {}) {
  if (resolvingMove || drag || event.button !== 0 || event.isPrimary === false) return;
  const grab = fromBoard ? { anchor: [...selectedAnchor], offsetX: .5, offsetY: .5 } : grabPoint(index, event.clientX, event.clientY);
  selectPiece(index, { quiet: true, anchor: grab.anchor });
  const origin = event.currentTarget;
  origin.setPointerCapture(event.pointerId);
  drag = { index, ...grab, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moving: false, target: fromBoard ? Number(origin.dataset.index) : -1, origin, fromBoard };
  origin.addEventListener('pointermove', moveDrag);
  origin.addEventListener('pointerup', endDrag);
  origin.addEventListener('pointercancel', cancelDrag);
  origin.addEventListener('lostpointercapture', cancelDrag);
  if (fromBoard) showPreview(drag.target);
}
function moveDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (!drag.moving && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 7) return;
  if (!drag.moving) {
    drag.moving = true;
    document.body.classList.add('dragging');
    const ghost = $('drag-piece'), piece = state.pieces[drag.index], { rows, cols } = blockElement(piece);
    const size = cells[0].getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle($('board')).gap);
    ghost.replaceChildren();
    ghost.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
    ghost.style.gridTemplateRows = `repeat(${rows}, ${size}px)`;
    ghost.style.gap = `${gap}px`;
    ghost.style.setProperty('--block-color', COLORS[piece.color]);
    for (const [r, c] of SHAPES[piece.shape].cells) {
      const square = document.createElement('span');
      square.className = 'ghost-cell';
      square.style.gridRow = r + 1;
      square.style.gridColumn = c + 1;
      ghost.append(square);
    }
    ghost.hidden = false;
  }
  event.preventDefault();
  const ghost = $('drag-piece');
  const cellSize = cells[0].getBoundingClientRect().width;
  const gap = parseFloat(getComputedStyle($('board')).gap);
  const boardRect = $('board').getBoundingClientRect(), first = cells[0].getBoundingClientRect();
  const inside = event.clientX >= boardRect.left && event.clientX <= boardRect.right
    && event.clientY >= boardRect.top && event.clientY <= boardRect.bottom;
  const col = Math.max(0, Math.min(SIZE - 1, Math.round((event.clientX - first.left - cellSize / 2) / (cellSize + gap))));
  const row = Math.max(0, Math.min(SIZE - 1, Math.round((event.clientY - first.top - cellSize / 2) / (cellSize + gap))));
  drag.target = inside ? row * SIZE + col : -1;
  const placement = inside ? showPreview(drag.target) : null;
  if (!inside) clearPreview();
  // Keep the grabbed square under the pointer, snapping to the exact preview
  // when a valid placement exists so the preview and final drop always agree.
  const snap = placement ? cells[placement.row * SIZE + placement.col].getBoundingClientRect() : null;
  ghost.style.left = `${snap?.left ?? event.clientX - drag.anchor[1] * (cellSize + gap) - drag.offsetX * cellSize}px`;
  ghost.style.top = `${snap?.top ?? event.clientY - drag.anchor[0] * (cellSize + gap) - drag.offsetY * cellSize}px`;
}
function cleanupDrag() {
  if (!drag) return;
  const { origin, pointerId } = drag;
  origin.removeEventListener('pointermove', moveDrag);
  origin.removeEventListener('pointerup', endDrag);
  origin.removeEventListener('pointercancel', cancelDrag);
  origin.removeEventListener('lostpointercapture', cancelDrag);
  if (origin.hasPointerCapture(pointerId)) origin.releasePointerCapture(pointerId);
  $('drag-piece').hidden = true;
  document.body.classList.remove('dragging');
  drag = null;
  clearPreview();
}
function endDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const { moving, target, anchor, fromBoard } = drag;
  if (moving) {
    suppressPieceClickUntil = performance.now() + 150;
    if (fromBoard) suppressBoardClickUntil = performance.now() + 150;
  }
  cleanupDrag();
  if (moving && target >= 0) placeAt(target, anchor);
  else if (moving) announce('블록을 놀이터 안으로 옮겨 놓아요.', false, true);
  else announce(defaultMessage());
}
function cancelDrag() { cleanupDrag(); }
window.addEventListener('blur', cancelDrag);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelDrag(); });

function playTone(clear) {
  if (!sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const notes = clear ? [523.25, 659.25, 783.99] : [523.25];
    notes.forEach((frequency, i) => {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      const t = audio.currentTime + i * .11;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, t);
      gain.gain.exponentialRampToValueAtTime(.09, t + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, t + .24);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(t); oscillator.stop(t + .25);
    });
  } catch { /* Audio support is optional. */ }
}
function updateSoundButton() {
  $('sound-button').setAttribute('aria-label', sound ? '소리 끄기' : '소리 켜기');
  $('sound-button').setAttribute('aria-pressed', String(sound));
  $('sound-button').innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="${sound ? 'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14' : 'm16 9 5 6m0-6-5 6'}"/></svg>`;
}

// Mobile browser bars can make the visible area differ from both vh and svh.
// Only viewport events update these values; game feedback never moves the card.
function updatePlayViewport() {
  if (!centerLayout) return;
  const viewport = window.visualViewport;
  // Let native pinch zoom enlarge and pan the page without resizing it back.
  if (viewport && Math.abs(viewport.scale - 1) > .01) return;
  const dimensions = {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
    x: viewport?.offsetLeft ?? 0,
    y: viewport?.offsetTop ?? 0,
  };
  const style = document.documentElement.style;
  for (const [name, value] of Object.entries(dimensions)) {
    const property = `--play-viewport-${name}`, pixels = `${Math.round(value * 100) / 100}px`;
    if (style.getPropertyValue(property) !== pixels) style.setProperty(property, pixels);
  }
}
function schedulePlayViewport() {
  if (!centerLayout || viewportFrame) return;
  viewportFrame = requestAnimationFrame(() => {
    viewportFrame = 0;
    updatePlayViewport();
  });
}
function applyCenterLayout() {
  document.documentElement.classList.toggle('center-layout', centerLayout);
  document.body.classList.toggle('center-layout', centerLayout);
  $('center-layout-help').textContent = centerLayout ? '화면이 움직이지 않아요' : '위아래로 움직일 수 있어요';
  if (centerLayout) updatePlayViewport();
  else {
    cancelAnimationFrame(viewportFrame);
    viewportFrame = 0;
    for (const name of ['width', 'height', 'x', 'y']) document.documentElement.style.removeProperty(`--play-viewport-${name}`);
  }
}
window.addEventListener('resize', schedulePlayViewport, { passive: true });
window.addEventListener('orientationchange', schedulePlayViewport, { passive: true });
window.visualViewport?.addEventListener('resize', schedulePlayViewport, { passive: true });
window.visualViewport?.addEventListener('scroll', schedulePlayViewport, { passive: true });

$('sound-button').addEventListener('click', () => { sound = !sound; updateSoundButton(); if (sound) playTone(false); save(); });
$('center-layout-toggle').addEventListener('change', event => {
  cancelDrag();
  clearPreview();
  if (!centerLayout && event.target.checked) unpinnedScrollY = window.scrollY;
  centerLayout = event.target.checked;
  applyCenterLayout();
  if (!centerLayout) window.scrollTo(0, unpinnedScrollY);
  save();
  announce(centerLayout ? '딱 붙었어요! 화면이 움직이지 않아요.' : '이제 화면을 위아래로 움직일 수 있어요.', false, true);
});
$('undo-button').addEventListener('click', () => {
  if (resolvingMove || !history.length) return;
  state = history.pop(); selected = -1;
  clearTimeout(celebrationTimer); $('celebration').replaceChildren();
  render(); save(); announce('방금 전으로 돌아왔어요. 다시 해 볼까요?', false, true);
});
$('shuffle-button').addEventListener('click', () => {
  if (resolvingMove) return;
  snapshot(); state.pieces = newPieces(state.board); selected = -1;
  render(); save(); announce('짜잔! 새 블록이에요. 하나를 골라요!', false, true);
});
$('help-button').addEventListener('click', () => $('help-dialog').showModal());
$('restart-button').addEventListener('click', () => $('restart-dialog').showModal());
$('confirm-restart').addEventListener('click', () => {
  if (resolvingMove) return;
  state = newGame(); history = []; selected = -1;
  clearTimeout(celebrationTimer); $('celebration').replaceChildren();
  $('restart-dialog').close(); render(); save(); announce('새로운 놀이터가 열렸어요. 함께 시작해 볼까요?');
});
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
document.addEventListener('keydown', event => {
  if (drag) { if (event.key === 'Escape') cancelDrag(); return; }
  if (resolvingMove || document.querySelector('dialog[open]') || event.ctrlKey || event.metaKey || event.altKey) return;
  if (/^[123]$/.test(event.key)) { event.preventDefault(); selectPiece(Number(event.key) - 1, { previewFocusedCell: true }); }
  if (event.key === 'Escape') { selected = -1; clearPreview(); Array.from($('piece-tray').children).forEach(b => { b.setAttribute('aria-pressed', 'false'); b.querySelectorAll('.anchor-cell').forEach(c => c.classList.remove('anchor-cell')); }); announce(defaultMessage()); }
});

// Recover gracefully from a fully used tray in an older or interrupted saved session.
if (state.pieces.every(p => !p)) state.pieces = newPieces(state.board);
$('center-layout-toggle').checked = centerLayout;
applyCenterLayout();
render();
announce(defaultMessage());
save();
