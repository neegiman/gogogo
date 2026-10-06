'use client';
import { useEffect, useState } from 'react';
import { assetPath } from '@/lib/paths';
import Icon from './Icon';
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export default function PwaManager() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const installed = window.matchMedia('(display-mode: standalone)').matches;
    setIos(!installed && /iPad|iPhone|iPod/.test(navigator.userAgent));
    function install(event: Event) { event.preventDefault(); setPrompt(event as InstallEvent); }
    function installedHandler() { setPrompt(null); setIos(false); }
    window.addEventListener('beforeinstallprompt', install);
    window.addEventListener('appinstalled', installedHandler);
    let disposed = false;
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register(assetPath('sw.js'), { scope: assetPath('') }).then(async registration => {
        await navigator.serviceWorker.ready;
        if (!disposed) setReady(true);
        void registration.update().catch(() => {});
      }).catch(() => { if (!disposed) setMessage('오프라인 준비를 못했어요. 인터넷이 연결되면 다시 열어 주세요.'); });
    }
    return () => { disposed = true; window.removeEventListener('beforeinstallprompt', install); window.removeEventListener('appinstalled', installedHandler); };
  }, []);
  async function installApp() {
    if (!prompt) return;
    try { await prompt.prompt(); await prompt.userChoice; } catch {}
    setPrompt(null);
  }
  return <div className="pwa-footer">
    <span><span className={`status-dot ${ready ? 'ready' : ''}`}/>{ready ? '오프라인에서도 놀 수 있어요' : '사진은 이 기기에서만 사용해요'}</span>
    {prompt && <button className="text-button" onClick={installApp}><Icon name="download" size={16}/>홈 화면에 추가</button>}
    {ios && <span className="ios-guide">홈 화면에 추가: 공유 버튼 → 홈 화면에 추가</span>}
    {message && <span role="status">{message}</span>}
  </div>;
}
