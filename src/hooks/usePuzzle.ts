'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPieces, shufflePieces, placePiece, returnPiece, isPuzzleComplete } from '@/lib/puzzle';
import { calculateStars } from '@/lib/scoring';
import { saveRecord } from '@/lib/indexed-db';
import { playSound, vibrate } from '@/lib/audio';
import type { Difficulty, PiecePlacements } from '@/types/puzzle';
import type { PuzzleRecord } from '@/types/records';

export function usePuzzle(difficulty: Difficulty, sound: boolean) {
  const [pieces] = useState(() => createPieces(difficulty));
  const [order] = useState(() => shufflePieces(pieces));
  const placementsRef = useRef<PiecePlacements>({});
  const [placements, setPlacements] = useState<PiecePlacements>({});
  const started = useRef(0);
  const finished = useRef(false);
  const hintRef = useRef(0);
  const [hintCount, setHintCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [challengeMessage, setChallengeMessage] = useState('');
  const [result, setResult] = useState<PuzzleRecord | null>(null);
  const [saveStatus, setSaveStatus] = useState('');
  useEffect(() => {
    started.current = performance.now();
    const interval = window.setInterval(() => {
      if (!finished.current) setElapsed(performance.now() - started.current);
    }, 500);
    return () => clearInterval(interval);
  }, []);
  const place = useCallback((pieceId: string, cellId: string) => {
    if (finished.current || !pieces.some(piece => piece.id === pieceId) || !pieces.some(piece => piece.id === cellId)) return;
    const next = placePiece(placementsRef.current, pieceId, cellId);
    if (next === placementsRef.current) return;
    placementsRef.current = next;
    setPlacements(next);
    setChallengeMessage('');
    // Arranging never produces correctness feedback, sound or vibration.
  }, [pieces]);
  const remove = useCallback((pieceId: string) => {
    if (finished.current || !Object.values(placementsRef.current).includes(pieceId)) return;
    const next = returnPiece(placementsRef.current, pieceId);
    placementsRef.current = next;
    setPlacements(next);
    setChallengeMessage('');
  }, []);
  const challenge = useCallback(() => {
    if (finished.current) return;
    if (Object.keys(placementsRef.current).length !== difficulty) {
      setChallengeMessage('조각을 모두 붙인 다음 도전해요!');
      return;
    }
    setAttemptCount(count => count + 1);
    if (!isPuzzleComplete(pieces, placementsRef.current)) {
      setChallengeMessage('조각을 살펴보고 다시 도전해요!');
      return;
    }
    finished.current = true;
    const elapsedMs = Math.max(0, performance.now() - started.current);
    setElapsed(elapsedMs);
    const record: PuzzleRecord = {
      id: crypto.randomUUID(), difficulty, elapsedMs, hintCount: hintRef.current,
      stars: calculateStars(hintRef.current, difficulty), completedAt: new Date().toISOString(),
    };
    setResult(record); vibrate(); playSound('puzzle-complete', sound);
    setSaveStatus('기록을 저장하고 있어요…');
    void saveRecord(record).then(() => setSaveStatus('이 기기에 기록을 저장했어요.')).catch(() => setSaveStatus('퍼즐은 완성했어요! 기기 저장 공간이 부족하거나 기록 저장을 사용할 수 없어요.'));
  }, [difficulty, pieces, sound]);
  function hint() {
    if (!finished.current) { hintRef.current++; setHintCount(hintRef.current); setChallengeMessage(''); }
    return hintRef.current;
  }
  return { pieces, order, placements, placedCount: Object.keys(placements).length, hintCount, elapsed, attemptCount, challengeMessage, result, saveStatus, place, remove, challenge, hint };
}
