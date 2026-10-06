'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from './AppProvider';
import Icon from './Icon';
import { APP_NAME } from '@/lib/brand';
export default function Header() {
  const path = usePathname();
  const { sound, toggleSound, session, setSession } = useApp();
  const playing = path === '/puzzle' || path === '/puzzle/' || (path === '/' && !!session);
  return <header className={`site-header ${playing ? 'playing-header' : ''}`}><div className="header-inner">
    <Link href="/" onClick={() => setSession(null)} className="brand" aria-label={`${APP_NAME} 홈`}><span className="brand-icon"><Icon name="puzzle" size={25}/></span><span className="brand-wordmark"><b>고고고<span>!</span></b><small>사진퍼즐</small></span></Link>
    <nav aria-label="메인 메뉴"><Link href="/" onClick={() => setSession(null)} className={path === '/' ? 'nav-link active' : 'nav-link'}>퍼즐 놀이</Link><Link href="/records/" className={path.includes('records') ? 'nav-link active' : 'nav-link'}><Icon name="trophy" size={18}/>나의 기록</Link></nav>
    <button className="sound-button" onClick={toggleSound} aria-label={sound ? '소리 끄기' : '소리 켜기'} title={sound ? '소리 끄기' : '소리 켜기'}><Icon name={sound ? 'sound' : 'mute'} size={21}/><span>소리 {sound ? '켜짐' : '꺼짐'}</span></button>
  </div></header>;
}
