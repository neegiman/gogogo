'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useApp } from './AppProvider';
import { usePuzzle } from '@/hooks/usePuzzle';
import type { Difficulty } from '@/types/puzzle';
import PuzzleBoard from './PuzzleBoard';
import PuzzleToolbar from './PuzzleToolbar';
import TimerDisplay from './TimerDisplay';
import CompletionModal from './CompletionModal';
import Icon from './Icon';
function PlaySession({ image, difficulty, onReplay }: { image: HTMLCanvasElement; difficulty: Difficulty; onReplay: () => void }) {
  const { sound, toggleSound, setSession } = useApp();
  const game = usePuzzle(difficulty,sound);
  const [guide, setGuide] = useState(false);
  const [hintGuide, setHintGuide] = useState(false);
  const [hintPiece, setHintPiece] = useState<string | null>(null);
  const [hintMessage, setHintMessage] = useState('천천히, 한 조각씩 맞춰 보세요.');
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintId = useRef<string | null>(null);
  const router = useRouter();
  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current); }, []);
  function hint() {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    const level = (game.hint()-1)%3;
    const placedIds = new Set(Object.values(game.placements));
    const candidate = game.order.find(p => !placedIds.has(p.id)) ?? game.order[0];
    if (!candidate) return;
    if (!hintId.current || placedIds.has(hintId.current)) hintId.current = candidate.id;
    setHintGuide(level !== 1); setHintPiece(level > 0 ? hintId.current : null);
    setHintMessage(['완성된 사진을 잠깐 살펴보세요.','반짝이는 조각을 찾아볼까요?','사진과 조각을 천천히 살펴보세요.'][level]);
    hintTimer.current = setTimeout(() => { setHintGuide(false); setHintPiece(null); setHintMessage('천천히, 한 조각씩 맞춰 보세요.'); }, 4500);
  }
  function other() { setSession(null); router.push('/'); }
  return <main className="game-page"><div className="game-topbar"><Link href="/" className="back-button" aria-label="처음으로"><Icon name="back" size={22}/></Link><span className="game-title"><small>고고고! · 3단계</small>한 조각씩 붙이고!</span><TimerDisplay elapsed={game.elapsed}/><button className="sound-button game-sound" onClick={toggleSound} aria-label={sound ? '소리 끄기' : '소리 켜기'}><Icon name={sound ? 'sound' : 'mute'} size={19}/></button></div>
    <div className="game-progress"><span><strong>{game.placedCount}</strong> / {difficulty} 조각</span><div className="progress-track" role="progressbar" aria-label="놓은 조각" aria-valuenow={game.placedCount} aria-valuemin={0} aria-valuemax={difficulty}><i style={{width:`${game.placedCount/difficulty*100}%`}}/></div><Icon name="puzzle" size={23}/></div>
    <p className="game-encouragement" role="status">{game.result ? '모든 조각이 제자리를 찾았어요!' : game.challengeMessage || hintMessage}</p>
    <PuzzleBoard image={image} pieces={game.pieces} order={game.order} placements={game.placements} completed={!!game.result} guide={guide || hintGuide} highlightPiece={hintPiece} onPlace={game.place} onReturn={game.remove}/>
    <PuzzleToolbar guide={guide} onGuide={() => setGuide(value=>!value)} onHint={hint} disabled={!!game.result} ready={game.placedCount === difficulty} retry={game.attemptCount > 0} onChallenge={game.challenge}/>
    {game.result && <CompletionModal result={game.result} saveStatus={game.saveStatus} onReplay={onReplay} onOther={other}/>}
  </main>;
}
export default function PuzzleGame() {
  const { session } = useApp();
  const [round, setRound] = useState(0);
  if (!session) return <main className="empty-state"><span className="empty-icon rose"><Icon name="image" size={40}/></span><h1>어떤 사진으로 놀까요?</h1><p>새로 열었을 때는 사진을 다시 골라 주세요.<br/>사진은 이 기기에 따로 저장하지 않아요.</p><Link className="button primary" href="/">사진 고르러 가기<Icon name="arrow" size={19}/></Link></main>;
  return <PlaySession key={round} image={session.image} difficulty={session.difficulty} onReplay={() => setRound(value=>value+1)}/>;
}
