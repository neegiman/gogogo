import { DIFFICULTIES, type Difficulty, type PuzzlePiece } from '@/types/puzzle';
export function createPieces(difficulty: Difficulty): PuzzlePiece[] {
  const { cols, rows } = DIFFICULTIES.find(d => d.count === difficulty)!;
  return Array.from({ length: difficulty }, (_, i) => ({
    id: `piece-${i}`, row: Math.floor(i / cols), col: i % cols,
    correctX: (i % cols) / cols, correctY: Math.floor(i / cols) / rows,
    width: 1 / cols, height: 1 / rows, locked: false,
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
export function canSnap(x: number, y: number, targetX: number, targetY: number, width: number, height: number) {
  return Math.hypot((x - targetX) / width, (y - targetY) / height) <= 0.48;
}
