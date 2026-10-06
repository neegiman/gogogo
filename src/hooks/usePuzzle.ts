'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPieces, shufflePieces, placePiece, returnPiece, syncTray, isPuzzleComplete, applyHint } from '@/lib/puzzle';
import { calculateStars } from '@/lib/scoring';
import { saveRecord } from '@/lib/indexed-db';
import { playSound, vibrate } from '@/lib/audio';
import { MAX_HINTS, type Difficulty, type PiecePlacements, type PieceTray, type ChallengeNotice } from '@/types/puzzle';
import type { PuzzleRecord } from '@/types/records';

export function usePuzzle(difficulty: Difficulty, sound: boolean) {
  const [pieces] = useState(() => createPieces(difficulty));
  const [tray, setTray] = useState<PieceTray>(() => shufflePieces(pieces).map(piece => piece.id));
  const trayRef = useRef(tray);
  const placementsRef = useRef<PiecePlacements>({});
  const [placements, setPlacements] = useState<PiecePlacements>({});
  const started = useRef(0);
  const finished = useRef(false);
  const hintRef = useRef(0);
  const [hintCount, setHintCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const noticeId = useRef(0);
  const [notice, setNotice] = useState<ChallengeNotice | null>(null);
  const [result, setResult] = useState<PuzzleRecord | null>(null);
  const [saveStatus, setSaveStatus] = useState('');
  useEffect(() => {
    started.current = performance.now();
    const interval = window.setInterval(() => {
      if (!finished.current) setElapsed(performance.now() - started.current);
    }, 500);
    return () => clearInterval(interval);
  }, []);
  const updatePlacements = useCallback((next: PiecePlacements) => {
    const nextTray = syncTray(trayRef.current, pieces, next);
    placementsRef.current = next; trayRef.current = nextTray;
    setPlacements(next); setTray(nextTray);
    return nextTray;
  }, [pieces]);
  const place = useCallback((pieceId: string, cellId: string): number | null => {
    if (finished.current || !pieces.some(piece => piece.id === pieceId) || !pieces.some(piece => piece.id === cellId)) return null;
    const displaced = placementsRef.current[cellId];
    const next = placePiece(placementsRef.current, pieceId, cellId);
    if (next === placementsRef.current) return null;
    const nextTray = updatePlacements(next);
    // Arranging never produces correctness feedback, sound or vibration.
    const returnedIndex = displaced ? nextTray.indexOf(displaced) : -1;
    return returnedIndex >= 0 ? returnedIndex : null;
  }, [pieces, updatePlacements]);
  const remove = useCallback((pieceId: string): number | null => {
    if (finished.current || !Object.values(placementsRef.current).includes(pieceId)) return null;
    const next = returnPiece(placementsRef.current, pieceId);
    return updatePlacements(next).indexOf(pieceId);
  }, [updatePlacements]);
  const challenge = useCallback(() => {
    if (finished.current) return;
    if (Object.keys(placementsRef.current).length !== difficulty) {
      setNotice({ id: ++noticeId.current, kind: 'retry', title: '모두 붙여볼까요?', message: '조각을 모두 붙인 다음 도전해요!' });
      return;
    }
    setAttemptCount(count => count + 1);
    if (!isPuzzleComplete(pieces, placementsRef.current)) {
      setNotice({ id: ++noticeId.current, kind: 'retry', title: '다시 도전!', message: '조각을 살펴보고 다시 도전해요!' });
      return;
    }
    finished.current = true;
    setNotice({ id: ++noticeId.current, kind: 'success', title: '퍼즐 완성!', message: '정말 잘했어요!' });
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
  const hint = useCallback(() => {
    if (finished.current || hintRef.current >= MAX_HINTS) return null;
    const correction = applyHint(pieces, placementsRef.current);
    if (!correction) return null;
    updatePlacements(correction.placements);
    hintRef.current++; setHintCount(hintRef.current);
    playSound('piece-correct', sound); vibrate();
    return correction.pieceId;
  }, [pieces, sound, updatePlacements]);
  const dismissNotice = useCallback((id: number) => {
    setNotice(current => current?.id === id ? null : current);
  }, []);
  return { pieces, tray, placements, placedCount: Object.keys(placements).length, hintCount, elapsed, attemptCount, notice, dismissNotice, result, saveStatus, place, remove, challenge, hint };
}
