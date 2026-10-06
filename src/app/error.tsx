'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="empty-state"><h1>잠깐 쉬어 갈까요?</h1><p>화면을 다시 열어 주세요. 새 사진으로 다시 시작할 수 있어요.</p><button className="button primary" onClick={reset}>다시 열기</button><Link className="button secondary" href="/">처음으로</Link></main>; }
