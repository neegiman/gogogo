'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { normalizeImage, loadSample } from '@/lib/image';
import { DEFAULT_DIFFICULTY, type Difficulty } from '@/types/puzzle';
import { useApp } from './AppProvider';
import PhotoSelector from './PhotoSelector';
import DifficultySelector from './DifficultySelector';
import HeroIllustration from './HeroIllustration';
import ImageEditor from './ImageEditor';
import Icon from './Icon';
import PlaySteps from './PlaySteps';
export default function PhotoSetup() {
  const [image, setImage] = useState<HTMLCanvasElement | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { setSession } = useApp();
  const router = useRouter();
  async function select(file?: File) {
    setBusy(true); setError('');
    try { setImage(file ? await normalizeImage(file) : await loadSample()); }
    catch (error) { setError(error instanceof Error ? error.message : '사진을 다시 골라 주세요.'); }
    finally { setBusy(false); }
  }
  function start(cropped: HTMLCanvasElement) { setSession({ image: cropped, difficulty }); router.push('/puzzle/'); }
  if (image) return <main className="editor-page"><PlaySteps active={2}/><div className="page-intro"><span className="eyebrow">마음에 드는 부분만 쏙!</span><h1>사진을 예쁘게 맞춰요</h1><p>한 손가락으로 옮기고, 두 손가락으로 크게 만들어요.</p></div><ImageEditor image={image} difficulty={difficulty} onConfirm={start} onCancel={() => setImage(null)}><DifficultySelector value={difficulty} onChange={setDifficulty}/></ImageEditor><p className="privacy-note"><Icon name="shield" size={16}/>사진은 서버로 전송되지 않고 이 기기에서만 사용됩니다.</p></main>;
  return <main className="home-main">
    <section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="tiny-flower">✿</span>우리 아이의 첫 번째 사진 퍼즐</span>
      <h1>찍고, 자르고,<br/><em>붙이고. 고고고!</em></h1><p className="hero-description">내가 찍은 사진이 나만의 퍼즐로!<br/>작은 손으로 톡톡, 함께 완성해요.</p><PlaySteps active={1}/>
      <PhotoSelector onSelect={select} busy={busy}/><p className="privacy-note"><Icon name="shield" size={16}/>사진은 서버로 전송되지 않고 이 기기에서만 사용됩니다.</p>
      <div className="sample-link"><span>사진이 없어도 괜찮아요</span><button className="text-button" disabled={busy} onClick={() => select()}>샘플 퍼즐 해보기<Icon name="arrow" size={17}/></button></div>
      {busy && <p role="status" className="notice">사진을 준비하고 있어요…</p>}{error && <p role="alert" className="error-notice">{error}</p>}
    </div><HeroIllustration/></section>
    <section className="play-settings"><DifficultySelector value={difficulty} onChange={setDifficulty}/><div className="records-prompt"><span className="records-icon"><Icon name="trophy" size={29}/></span><div><h2>차곡차곡 쌓이는 성취감</h2><p>완성한 퍼즐과 반짝이는 별을 모아 보세요.</p></div><Link href="/records/" className="text-button">기록 보기<Icon name="arrow" size={18}/></Link></div></section>
    <section className="how-to" aria-label="놀이 방법"><div className="how-heading"><span className="eyebrow">세 번의 고!</span><h2>찍고, 자르고, 붙이고</h2><p>복잡한 준비 없이 아이와 함께 즐겨요.</p></div><div className="step"><span className="step-icon peach"><Icon name="camera" size={26}/><b>1</b></span><h3>찍고!</h3><p>우리 가족, 좋아하는 장난감<br/>사진을 찍거나 골라요.</p></div><div className="step"><span className="step-icon rose"><Icon name="crop" size={26}/><b>2</b></span><h3>자르고!</h3><p>마음에 드는 부분을<br/>네모 안에 쏙 담아요.</p></div><div className="step"><span className="step-icon yellow"><Icon name="puzzle" size={27}/><b>3</b></span><h3>붙이고!</h3><p>조각을 모두 붙이고<br/>도전!을 눌러요.</p></div></section>
    <div className="home-bottom"><Icon name="shield" size={17}/><span>로그인 없이 · 광고 없이 · 인터넷 없이도</span><span className="bottom-flower">✿</span></div>
  </main>;
}
