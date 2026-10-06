'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { clearRecords, getRecords } from '@/lib/indexed-db';
import { formatTime } from '@/lib/scoring';
import { DIFFICULTIES } from '@/types/puzzle';
import type { PuzzleRecord } from '@/types/records';
import Icon from './Icon';
export default function RecordsView() {
  const [records, setRecords] = useState<PuzzleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let alive = true;
    getRecords().then(data => { if (alive) setRecords(data); }).catch(() => { if (alive) setError('이 브라우저에서는 기록을 열 수 없어요. 기기 저장 공간과 브라우저 설정을 확인해 주세요.'); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  async function remove() {
    setClearing(true);
    try { await clearRecords(); setRecords([]); dialog.current?.close(); }
    catch { setError('기록을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요.'); dialog.current?.close(); }
    finally { setClearing(false); }
  }
  const stars = records.reduce((sum,r)=>sum+r.stars,0);
  return <main className="records-page"><div className="page-intro"><span className="eyebrow"><Icon name="trophy" size={17}/>우리 아이의 작은 성취</span><h1>반짝반짝, 나의 기록</h1><p>한 조각씩 쌓아 올린 즐거운 순간들이에요.</p></div>
    {error && <p className="error-notice" role="alert">{error}</p>}
    <section className="record-totals" aria-label="놀이 기록 요약"><div><span className="record-total-icon rose"><Icon name="puzzle" size={30}/></span><span>총 완성 횟수<strong>{records.length}<small>번</small></strong></span></div><div><span className="record-total-icon yellow"><Icon name="star" size={31}/></span><span>차곡차곡 모은 별<strong>{stars}<small>개</small></strong></span></div></section>
    <h2 className="section-title">조각마다, 최고의 순간</h2><div className="best-grid">{DIFFICULTIES.map(d => {
      const list = records.filter(r=>r.difficulty===d.count);
      const best = list.reduce<PuzzleRecord | null>((best,r)=>!best || r.elapsedMs<best.elapsedMs ? r : best,null);
      return <div className={`best-card ${d.color}`} key={d.count}><Icon name="puzzle" size={24}/><h3>{d.count}개 최고 기록</h3><strong>{best ? formatTime(best.elapsedMs) : '아직 준비 중'}</strong><span>{list.length ? `${list.length}번의 즐거운 완성` : '첫 번째 별을 기다려요'}</span></div>;
    })}</div>
    <div className="recent-heading"><h2 className="section-title">최근 기록</h2><button className="text-button delete-button" disabled={!records.length} onClick={()=>dialog.current?.showModal()}>기록 삭제</button></div>
    {loading ? <p className="notice" role="status">기록을 열고 있어요…</p> : records.length ? <div className="record-list">{records.slice(0,30).map(record => <article className="record-row" key={record.id}><span className="record-piece-count">{record.difficulty}<small>개</small></span><div><h3>사진 퍼즐 완성</h3><span>{new Date(record.completedAt).toLocaleDateString('ko-KR')} · 힌트 {record.hintCount}번</span></div><span className="record-time">{formatTime(record.elapsedMs)}</span><span className="record-stars" aria-label={`별 ${record.stars}개`}>{'★'.repeat(record.stars)}</span></article>)}</div> : <div className="records-empty"><span>✧</span><h3>첫 번째 퍼즐을 완성해 볼까요?</h3><p>퍼즐을 완성하면 이곳에 별과 기록이 생겨요.</p><Link className="button primary" href="/">퍼즐 놀이 시작<Icon name="arrow" size={19}/></Link></div>}
    <p className="privacy-note records-privacy"><Icon name="shield" size={16}/>기록은 이 브라우저에 저장돼요. 브라우저 데이터를 지우면 기록도 사라져요.</p>
    <dialog className="confirm-modal" ref={dialog} aria-labelledby="delete-title"><Icon name="trophy" size={36}/><h2 id="delete-title">기록을 모두 지울까요?</h2><p>모아 둔 별과 퍼즐 기록이 사라져요.<br/>지운 기록은 다시 가져올 수 없어요.</p><div className="modal-actions"><button className="button secondary" disabled={clearing} onClick={()=>dialog.current?.close()}>그대로 둘래요</button><button className="button danger" disabled={clearing} onClick={remove}>{clearing ? '지우는 중…' : '모두 지우기'}</button></div></dialog>
  </main>;
}
