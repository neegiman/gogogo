import { assetPath } from '@/lib/paths';
import Icon from './Icon';
export default function HeroIllustration() {
  return <div className="hero-art" aria-label="꽃이 핀 언덕 사진으로 만든 퍼즐 그림" role="img">
    <span className="art-spark spark-one">✧</span><span className="art-spark spark-two">✦</span>
    <div className="art-orbit"/>
    <div className="photo-note"><Icon name="image" size={17}/><span>내 사진이 퍼즐이 돼요!</span></div>
    <div className="art-photo"><div className="art-photo-image" style={{ backgroundImage: `url(${assetPath('sample.svg')})` }}><div className="photo-grid">{Array.from({length:12},(_,i)=><span key={i} className={i===8?'missing-cell':''}/>)}</div></div><div className="photo-caption">우리의 작은 봄날 <span>✿</span></div></div>
    <div className="loose-piece" style={{ backgroundImage:`url(${assetPath('sample.svg')})` }}/>
    <div className="art-sticker"><span>★</span>참 잘했어요!</div>
    <svg className="art-doodle" viewBox="0 0 100 90" fill="none" aria-hidden="true"><path d="M9 16c38-10 59 12 51 33-7 19-27 5-12-7 13-10 33 1 32 27m-12-8 13 12 10-17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
    <span className="art-flower">✿</span>
  </div>;
}
