'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { PuzzleRecord } from '@/types/records';
import { formatTime } from '@/lib/scoring';
import Icon from './Icon';
export default function CompletionSummary({ result, saveStatus, onReplay, onOther }: { result: PuzzleRecord; saveStatus: string; onReplay: () => void; onOther: () => void }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, []);
  return <section className="completion-summary" aria-labelledby="completion-title"><div className="celebration" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} style={{'--i':i} as React.CSSProperties}>✦</i>)}<span className="celebration-trophy"><Icon name="trophy" size={55}/></span></div>
    <div className="reward-stars" aria-label={`별 ${result.stars}개`}>{Array.from({length:3},(_,i)=><Icon name="star" key={i} size={40} className={i<result.stars?'earned':'unearned'}/>)}</div>
    <h2 id="completion-title" tabIndex={-1} ref={ref}>나의 완성 기록</h2><p>{result.difficulty}개의 퍼즐을 모두 맞췄어요.</p><div className="result-details"><span><Icon name="clock" size={18}/>{formatTime(result.elapsedMs)}</span><span><Icon name="bulb" size={18}/>힌트 {result.hintCount}번</span></div>
    <p className="save-message" role="status">{saveStatus}</p><button className="button primary" onClick={onReplay}><Icon name="rotate" size={19}/>다시 하기</button><button className="button secondary" onClick={onOther}>다른 사진</button><Link className="text-button" href="/records/">기록 보기<Icon name="arrow" size={17}/></Link>
  </section>;
}
