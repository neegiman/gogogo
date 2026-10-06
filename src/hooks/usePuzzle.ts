'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPieces, shufflePieces } from '@/lib/puzzle';
import { calculateStars } from '@/lib/scoring';
import { saveRecord } from '@/lib/indexed-db';
import { playSound, vibrate } from '@/lib/audio';
import type { Difficulty } from '@/types/puzzle';
import type { PuzzleRecord } from '@/types/records';
export function usePuzzle(difficulty: Difficulty, sound: boolean) {
  const [pieces] = useState(() => createPieces(difficulty));
  const [order] = useState(() => shufflePieces(pieces));
  const lockedRef = useRef(new Set<string>());
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const started = useRef(0);
  const finished = useRef(false);
  const hintRef = useRef(0);
  const [hintCount, setHintCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<PuzzleRecord | null>(null);
  const [saveStatus, setSaveStatus] = useState('');
  useEffect(() => {
    started.current = performance.now();
    const interval = window.setInterval(() => {
      if (!finished.current) setElapsed(performance.now() - started.current);
    }, 500);
    return () => clearInterval(interval);
  }, []);
  const place = useCallback((id: string) => {
    if (finished.current || lockedRef.current.has(id)) return;
    lockedRef.current.add(id);
    setLocked(new Set(lockedRef.current));
    vibrate();
    if (lockedRef.current.size !== difficulty) { playSound('piece-correct', sound); return; }
    finished.current = true;
    const elapsedMs = Math.max(0, performance.now() - started.current);
    setElapsed(elapsedMs);
    const record: PuzzleRecord = {
      id: crypto.randomUUID(), difficulty, elapsedMs, hintCount: hintRef.current,
      stars: calculateStars(hintRef.current, difficulty), completedAt: new Date().toISOString(),
    };
    setResult(record); playSound('puzzle-complete', sound);
    setSaveStatus('기록을 저장하고 있어요…');
    void saveRecord(record).then(() => setSaveStatus('이 기기에 기록을 저장했어요.')).catch(() => setSaveStatus('퍼즐은 완성했어요! 기기 저장 공간이 부족하거나 기록 저장을 사용할 수 없어요.'));
  }, [difficulty, sound]);
  function hint() { if (!finished.current) { hintRef.current++; setHintCount(hintRef.current); } return hintRef.current; }
  return { pieces, order, locked, hintCount, elapsed, result, saveStatus, place, hint };
}
