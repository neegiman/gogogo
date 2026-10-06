import type { Difficulty } from './puzzle';
export type PuzzleRecord = {
  id: string;
  difficulty: Difficulty;
  elapsedMs: number;
  hintCount: number;
  stars: number;
  completedAt: string;
};
