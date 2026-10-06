import Link from 'next/link';
export default function NotFound() { return <main className="empty-state"><h1>여기는 퍼즐이 없어요</h1><p>첫 화면에서 새로운 퍼즐을 만들어 볼까요?</p><Link className="button primary" href="/">퍼즐 놀이로 돌아가기</Link></main>; }
