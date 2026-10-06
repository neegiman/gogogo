import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPieces, shufflePieces, placePiece, returnPiece, isPuzzleComplete } from '../src/lib/puzzle';
import { calculateStars } from '../src/lib/scoring';
import { DIFFICULTIES } from '../src/types/puzzle';
for(const difficulty of DIFFICULTIES) {
  test(`${difficulty.count} pieces tile the normalized image without gaps`,()=>{
    const pieces=createPieces(difficulty.count);
    assert.equal(pieces.length,difficulty.count);
    assert.equal(new Set(pieces.map(p=>`${p.row},${p.col}`)).size,difficulty.count);
    assert.ok(Math.abs(pieces.reduce((sum,p)=>sum+p.width*p.height,0)-1)<1e-10);
    assert.ok(pieces.every(p=>p.correctX+p.width<=1+1e-10 && p.correctY+p.height<=1+1e-10));
    const shuffled=shufflePieces(pieces,()=>.9999);
    assert.notDeepEqual(shuffled.map(p=>p.id),pieces.map(p=>p.id));
    assert.deepEqual([...shuffled].sort((a,b)=>a.id.localeCompare(b.id)),[...pieces].sort((a,b)=>a.id.localeCompare(b.id)));
    const correct = Object.fromEntries(pieces.map(piece => [piece.id, piece.id]));
    assert.equal(isPuzzleComplete(pieces, correct), true);
    assert.equal(isPuzzleComplete(pieces, { ...correct, [pieces[0].id]: pieces[1].id, [pieces[1].id]: pieces[0].id }), false);
    assert.equal(isPuzzleComplete(pieces, returnPiece(correct, pieces[0].id)), false);
  });
}
test('any empty cell accepts a piece without evaluating its correctness',()=>{
  const wrong = placePiece({}, 'piece-0', 'piece-8');
  assert.deepEqual(wrong, { 'piece-8': 'piece-0' });
  assert.equal(isPuzzleComplete(createPieces(12), wrong), false);
  const moved = placePiece(wrong, 'piece-0', 'piece-3');
  assert.deepEqual(moved, { 'piece-3': 'piece-0' });
  assert.deepEqual(wrong, { 'piece-8': 'piece-0' });
});
test('occupied cells preserve both pieces until a piece is returned',()=>{
  const occupied = { 'piece-8': 'piece-0', 'piece-3': 'piece-1' };
  assert.equal(placePiece(occupied, 'piece-1', 'piece-8'), occupied);
  assert.deepEqual(returnPiece(occupied, 'piece-0'), { 'piece-3': 'piece-1' });
  assert.deepEqual(occupied, { 'piece-8': 'piece-0', 'piece-3': 'piece-1' });
});
test('a full but incorrect attempt can be edited and checked again',()=>{
  const pieces = createPieces(12), correct = Object.fromEntries(pieces.map(piece => [piece.id, piece.id]));
  let attempt: Record<string, string> = { ...correct, 'piece-0': 'piece-1', 'piece-1': 'piece-0' };
  assert.equal(isPuzzleComplete(pieces, attempt), false);
  attempt = returnPiece(returnPiece(attempt, 'piece-0'), 'piece-1');
  attempt = placePiece(placePiece(attempt, 'piece-0', 'piece-0'), 'piece-1', 'piece-1');
  assert.equal(isPuzzleComplete(pieces, attempt), true);
});
test('every completion earns stars, with generous hints and no time penalty',()=>{
  assert.equal(calculateStars(0,12),3);assert.equal(calculateStars(3,12),3);
  assert.equal(calculateStars(12,12),2);assert.equal(calculateStars(100,12),1);
});
