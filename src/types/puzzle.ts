export type Difficulty = 12 | 16 | 20 | 24;
export type PuzzlePiece = {
  id: string;
  row: number;
  col: number;
  correctX: number;
  correctY: number;
  width: number;
  height: number;
  locked: boolean;
};
export const DIFFICULTIES: { count: Difficulty; cols: number; rows: number; label: string; color: string }[] = [
  { count: 12, cols: 3, rows: 4, label: '쉬움', color: 'rose' },
  { count: 16, cols: 4, rows: 4, label: '보통', color: 'blush' },
  { count: 20, cols: 4, rows: 5, label: '어려움', color: 'peach' },
  { count: 24, cols: 4, rows: 6, label: '도전', color: 'lavender' },
];
