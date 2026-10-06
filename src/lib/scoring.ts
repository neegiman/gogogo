// Time is intentionally excluded: children can take all the time they need.
export function calculateStars(hintCount: number, totalPieces: number): number {
  return hintCount <= Math.ceil(totalPieces / 4) ? 3 : hintCount <= totalPieces ? 2 : 1;
}
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
}
