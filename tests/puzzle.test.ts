import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPieces, shufflePieces, canSnap } from '../src/lib/puzzle';
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
    assert.equal(canSnap(100,100,100,100,pieces[0].width*300,pieces[0].height*300),true);
    assert.equal(canSnap(100+pieces[0].width*300,100,100,100,pieces[0].width*300,pieces[0].height*300),false);
  });
}
test('snap threshold scales with piece size and rejects adjacent targets',()=>{
  assert.equal(canSnap(12,8,0,0,40,40),true);
  assert.equal(canSnap(24,16,0,0,80,80),true);
  assert.equal(canSnap(40,0,0,0,40,40),false);
});
test('every completion earns stars, with generous hints and no time penalty',()=>{
  assert.equal(calculateStars(0,12),3);assert.equal(calculateStars(3,12),3);
  assert.equal(calculateStars(12,12),2);assert.equal(calculateStars(100,12),1);
});
