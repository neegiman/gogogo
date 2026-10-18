export const SIZE = 8;
export const COLORS = ['#d875a0', '#edb861', '#82bdae', '#eca7c2', '#89b5d7', '#d3a184'];
export const SHAPES = [
  { name: '작은 한 칸', cells: [[0, 0]] },
  { name: '가로 두 칸', cells: [[0, 0], [0, 1]] },
  { name: '세로 두 칸', cells: [[0, 0], [1, 0]] },
  { name: '가로 세 칸', cells: [[0, 0], [0, 1], [0, 2]] },
  { name: '세로 세 칸', cells: [[0, 0], [1, 0], [2, 0]] },
  { name: '작은 네모', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { name: '기역 모양', cells: [[0, 0], [1, 0], [1, 1]] },
  { name: '니은 모양', cells: [[0, 1], [1, 0], [1, 1]] },
  { name: '뒤집힌 기역', cells: [[0, 0], [0, 1], [1, 0]] },
  { name: '뒤집힌 니은', cells: [[0, 0], [0, 1], [1, 1]] },
  { name: '가로 네 칸', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { name: '세로 네 칸', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { name: '작은 산', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
];

export function emptyBoard() { return Array(SIZE * SIZE).fill(null); }
export function makePiece(shapeIndex, colorIndex) {
  return { shape: shapeIndex, color: colorIndex };
}
export function canPlace(board, piece, row, col) {
  if (!piece || !SHAPES[piece.shape] || !Number.isInteger(row) || !Number.isInteger(col)) return false;
  return SHAPES[piece.shape].cells.every(([r, c]) => {
    const rr = row + r, cc = col + c;
    return rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr * SIZE + cc] === null;
  });
}
export function hasPlace(board, piece) {
  return board.some((_, i) => canPlace(board, piece, Math.floor(i / SIZE), i % SIZE));
}
export function getPieceAnchor(piece) {
  const cells = SHAPES[piece?.shape]?.cells;
  if (!cells) return [0, 0];
  // L pieces use their elbow instead of the empty corner of their bounding box.
  return cells.find(([r, c]) =>
    cells.some(([rr, cc]) => cc === c && Math.abs(rr - r) === 1)
    && cells.some(([rr, cc]) => rr === r && Math.abs(cc - c) === 1)) ?? cells[0];
}
export function resolvePlacement(board, piece, targetRow, targetCol, preferredAnchor = getPieceAnchor(piece)) {
  const shape = SHAPES[piece?.shape];
  if (!shape || !Number.isInteger(targetRow) || !Number.isInteger(targetCol)
    || targetRow < 0 || targetRow >= SIZE || targetCol < 0 || targetCol >= SIZE
    || board[targetRow * SIZE + targetCol] !== null) return null;
  // Each candidate covers the pointed cell with a real square of the piece.
  // Try the grabbed square first, then nearby squares when an edge blocks it.
  const anchors = [...shape.cells].sort((a, b) =>
    Math.abs(a[0] - preferredAnchor[0]) + Math.abs(a[1] - preferredAnchor[1])
    - Math.abs(b[0] - preferredAnchor[0]) - Math.abs(b[1] - preferredAnchor[1]));
  for (const anchor of anchors) {
    const row = targetRow - anchor[0], col = targetCol - anchor[1];
    if (canPlace(board, piece, row, col)) return { row, col, anchor };
  }
  return null;
}
export function newPieces(board, random = Math.random) {
  const fitting = SHAPES.map((_, i) => i).filter(shape => hasPlace(board, { shape }));
  if (!fitting.length) return [];
  return Array.from({ length: 3 }, () => makePiece(fitting[Math.floor(random() * fitting.length)], Math.floor(random() * COLORS.length)));
}
export function newGame(random = Math.random) {
  const board = emptyBoard();
  return { board, pieces: newPieces(board, random), score: 0, lines: 0, moves: 0 };
}
export function placePiece(state, pieceIndex, row, col) {
  const piece = state.pieces[pieceIndex];
  if (!canPlace(state.board, piece, row, col)) return null;
  const board = [...state.board];
  const placed = SHAPES[piece.shape].cells.map(([r, c]) => (row + r) * SIZE + col + c);
  placed.forEach(i => { board[i] = piece.color; });
  const rows = [], cols = [];
  for (let n = 0; n < SIZE; n++) {
    if (Array.from({ length: SIZE }, (_, c) => board[n * SIZE + c]).every(v => v !== null)) rows.push(n);
    if (Array.from({ length: SIZE }, (_, r) => board[r * SIZE + n]).every(v => v !== null)) cols.push(n);
  }
  const cleared = new Set();
  rows.forEach(r => { for (let c = 0; c < SIZE; c++) cleared.add(r * SIZE + c); });
  cols.forEach(c => { for (let r = 0; r < SIZE; r++) cleared.add(r * SIZE + c); });
  cleared.forEach(i => { board[i] = null; });
  const lines = rows.length + cols.length;
  const pieces = state.pieces.map((p, i) => i === pieceIndex ? null : p);
  return { state: { board, pieces, score: state.score + placed.length * 10 + lines * 100, lines: state.lines + lines, moves: state.moves + 1 }, placed, cleared: [...cleared], lines };
}
export function isValidState(state) {
  return !!state && Array.isArray(state.board) && state.board.length === SIZE * SIZE
    && state.board.every(v => v === null || (Number.isInteger(v) && v >= 0 && v < COLORS.length))
    && Array.isArray(state.pieces) && state.pieces.length === 3
    && state.pieces.every(p => p === null || (p && Number.isInteger(p.shape) && p.shape >= 0 && p.shape < SHAPES.length && Number.isInteger(p.color) && p.color >= 0 && p.color < COLORS.length))
    && ['score', 'lines', 'moves'].every(k => Number.isSafeInteger(state[k]) && state[k] >= 0);
}
