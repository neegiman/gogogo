import Icon from './Icon';
export default function PuzzleToolbar({ guide, onGuide, onHint, disabled, ready, retry, onChallenge }: {
  guide: boolean; onGuide: () => void; onHint: () => void; disabled: boolean;
  ready: boolean; retry: boolean; onChallenge: () => void;
}) {
  return <div className="puzzle-toolbar">
    <div className="toolbar-guides"><button className={`button secondary ${guide?'toggled':''}`} onClick={onGuide} aria-pressed={guide} disabled={disabled}><Icon name="eye" size={21}/>원본 보기</button><button className="button hint-button" onClick={onHint} disabled={disabled}><Icon name="bulb" size={21}/>힌트</button></div>
    <button className="button primary challenge-button" onClick={onChallenge} disabled={!ready || disabled}><Icon name="puzzle" size={22}/>{retry ? '다시 도전!' : '도전!'}</button>
    {!ready && !disabled && <span className="challenge-help">모두 붙인 뒤 도전!을 눌러요.</span>}
  </div>;
}
