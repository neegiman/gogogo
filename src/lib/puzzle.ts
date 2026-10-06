import { DIFFICULTIES, type Difficulty, type PuzzlePiece, type PiecePlacements } from '@/types/puzzle';
export function createPieces(difficulty: Difficulty): PuzzlePiece[] {
  const { cols, rows } = DIFFICULTIES.find(d => d.count === difficulty)!;
  return Array.from({ length: difficulty }, (_, i) => ({
    id: `piece-${i}`, row: Math.floor(i / cols), col: i % cols,
    correctX: (i % cols) / cols, correctY: Math.floor(i / cols) / rows,
    width: 1 / cols, height: 1 / rows,
  }));
}
export function shufflePieces<T>(items: T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  if (result.length > 1 && result.every((p, i) => p === items[i])) result.push(result.shift()!);
  return result;
}
export function placePiece(placements: PiecePlacements, pieceId: string, cellId: string): PiecePlacements {
  if (placements[cellId]) return placements;
  return { ...returnPiece(placements, pieceId), [cellId]: pieceId };
}
export function returnPiece(placements: PiecePlacements, pieceId: string): PiecePlacements {
  return Object.fromEntries(Object.entries(placements).filter(([, id]) => id !== pieceId));
}
export function isPuzzleComplete(pieces: PuzzlePiece[], placements: PiecePlacements): boolean {
  return Object.keys(placements).length === pieces.length && pieces.every(piece => placements[piece.id] === piece.id);
}
export function applyHint(pieces: PuzzlePiece[], placements: PiecePlacements): { placements: PiecePlacements; pieceId: string } | null {
  const piece = pieces.find(piece => placements[piece.id] !== piece.id);
  if (!piece) return null;
  const previousCell = Object.keys(placements).find(cellId => placements[cellId] === piece.id);
  const displaced = placements[piece.id];
  const next = returnPiece(placements, piece.id);
  delete next[piece.id];
  // Swap a displaced piece into the vacated cell, or return it to the tray.
  // Already-correct pieces are never displaced and piece IDs stay unique.
  if (displaced && previousCell) next[previousCell] = displaced;
  next[piece.id] = piece.id;
  return { placements: next, pieceId: piece.id };
}
