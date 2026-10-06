import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPieces, shufflePieces, placePiece, returnPiece, syncTray, isPuzzleComplete, applyHint } from '../src/lib/puzzle';
import { calculateStars } from '../src/lib/scoring';
import { DIFFICULTIES, type PieceTray } from '../src/types/puzzle';
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
test('occupied board cells exchange pieces without duplicates or loss',()=>{
  const occupied = { 'piece-8': 'piece-0', 'piece-3': 'piece-1' };
  assert.deepEqual(placePiece(occupied, 'piece-1', 'piece-8'), { 'piece-8': 'piece-1', 'piece-3': 'piece-0' });
  assert.equal(placePiece(occupied, 'piece-0', 'piece-8'), occupied);
  assert.deepEqual(returnPiece(occupied, 'piece-0'), { 'piece-3': 'piece-1' });
  assert.deepEqual(occupied, { 'piece-8': 'piece-0', 'piece-3': 'piece-1' });
});
test('returns fill the first empty tray slots in return order and leave other pieces still', () => {
  const pieces = createPieces(12), initial = pieces.map(piece => piece.id);
  const placements = { 'piece-0': 'piece-11', 'piece-1': 'piece-1', 'piece-2': 'piece-8' };
  let tray = syncTray(initial, pieces, placements);
  assert.equal(tray[1], null); assert.equal(tray[8], null); assert.equal(tray[11], null);
  tray = syncTray(tray, pieces, returnPiece(placements, 'piece-11'));
  assert.equal(tray[1], 'piece-11'); assert.equal(tray[11], null);
  tray = syncTray(tray, pieces, returnPiece(returnPiece(placements, 'piece-11'), 'piece-1'));
  assert.equal(tray[8], 'piece-1'); assert.equal(tray[11], null);
  assert.equal(tray[0], 'piece-0'); assert.equal(tray[9], 'piece-9');
  assert.equal(syncTray(tray, pieces, returnPiece(returnPiece(placements, 'piece-11'), 'piece-1')), tray);
});
test('a tray piece replaces an occupied cell and the displaced piece returns to the first free slot', () => {
  const pieces = createPieces(12), placements = { 'piece-3': 'piece-5', 'piece-8': 'piece-2' };
  const tray = syncTray(pieces.map(piece => piece.id), pieces, placements);
  const replaced = placePiece(placements, 'piece-10', 'piece-3');
  assert.deepEqual(replaced, { 'piece-3': 'piece-10', 'piece-8': 'piece-2' });
  const updated = syncTray(tray, pieces, replaced);
  assert.equal(updated[2], 'piece-5'); assert.equal(updated[5], null); assert.equal(updated[10], null);
});
test('mixed placement, swapping, returning and hints preserve every piece at all difficulties', () => {
  for (const { count } of DIFFICULTIES) {
    const pieces = createPieces(count), ids = pieces.map(piece => piece.id);
    let placements: Record<string, string> = {};
    let tray: PieceTray = shufflePieces(ids, () => .9999);
    for (let step = 0; step < count * 4; step++) {
      const id = ids[(step * 7 + 3) % count];
      if (step % 5 === 0) placements = returnPiece(placements, id);
      else if (step % 7 === 0) placements = applyHint(pieces, placements)?.placements ?? placements;
      else placements = placePiece(placements, id, ids[(step * 3 + 1) % count]);
      tray = syncTray(tray, pieces, placements);
      const all = [...Object.values(placements), ...tray.filter(id => id !== null)];
      assert.equal(all.length, count); assert.equal(new Set(all).size, count);
      assert.deepEqual([...all].sort(), [...ids].sort());
    }
  }
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

test('hints place a missing piece without losing a displaced tray piece', () => {
  const pieces = createPieces(12), initial = { 'piece-0': 'piece-5', 'piece-8': 'piece-8' };
  const result = applyHint(pieces, initial)!;
  assert.equal(result.pieceId, 'piece-0');
  assert.deepEqual(result.placements, { 'piece-0': 'piece-0', 'piece-8': 'piece-8' });
  assert.deepEqual(initial, { 'piece-0': 'piece-5', 'piece-8': 'piece-8' });
});

test('hints swap incorrect placed pieces and preserve all IDs at every difficulty', () => {
  for (const { count } of DIFFICULTIES) {
    const pieces = createPieces(count);
    const rotated = Object.fromEntries(pieces.map((piece, i) => [piece.id, pieces[(i + 1) % count].id]));
    let placements = rotated;
    for (let i = 0; i < 3; i++) {
      const result = applyHint(pieces, placements)!;
      assert.equal(result.placements[result.pieceId], result.pieceId);
      for (const [cell, id] of Object.entries(placements)) {
        if (cell === id) assert.equal(result.placements[cell], id);
      }
      assert.equal(Object.keys(result.placements).length, count);
      assert.equal(new Set(Object.values(result.placements)).size, count);
      placements = result.placements;
    }
    const correct = Object.fromEntries(pieces.map(piece => [piece.id, piece.id]));
    assert.equal(applyHint(pieces, correct), null);
  }
});
