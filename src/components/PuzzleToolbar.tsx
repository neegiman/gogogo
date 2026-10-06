import Icon from './Icon';
import { MAX_HINTS } from '@/types/puzzle';
export default function PuzzleToolbar({ guide, onGuide, onHint, hintCount, disabled, ready, retry, onChallenge }: {
  guide: boolean; onGuide: () => void; onHint: () => void; disabled: boolean;
  ready: boolean; retry: boolean; onChallenge: () => void;
  hintCount: number;
}) {
  return <div className="puzzle-toolbar">
    <div className="toolbar-guides"><button className={`button secondary ${guide?'toggled':''}`} onClick={onGuide} aria-pressed={guide} disabled={disabled}><Icon name="eye" size={21}/>원본 보기</button><button className="button hint-button" onClick={onHint} disabled={disabled || hintCount >= MAX_HINTS} aria-label={`힌트 ${MAX_HINTS - hintCount}번 남음`}><Icon name="bulb" size={21}/>힌트 <span className="hint-count">{MAX_HINTS - hintCount} / {MAX_HINTS}</span></button></div>
    <button className="button primary challenge-button" onClick={onChallenge} disabled={!ready || disabled}><Icon name="puzzle" size={22}/>{retry ? '다시 도전!' : '도전!'}</button>
    {!ready && !disabled && <span className="challenge-help">모두 붙인 뒤 도전!을 눌러요.</span>}
  </div>;
}
