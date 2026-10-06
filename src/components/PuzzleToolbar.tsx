import Icon from './Icon';
export default function PuzzleToolbar({ guide, onGuide, onHint, disabled }: { guide: boolean; onGuide: () => void; onHint: () => void; disabled: boolean }) {
  return <div className="puzzle-toolbar"><button className={`button secondary ${guide?'toggled':''}`} onClick={onGuide} aria-pressed={guide}><Icon name="eye" size={21}/>원본 보기</button><button className="button hint-button" onClick={onHint} disabled={disabled}><Icon name="bulb" size={21}/>힌트</button></div>;
}
