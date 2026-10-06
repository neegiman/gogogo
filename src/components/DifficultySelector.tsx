import { DIFFICULTIES, type Difficulty } from '@/types/puzzle';
import Icon from './Icon';
export default function DifficultySelector({ value, onChange }: { value: Difficulty; onChange: (difficulty: Difficulty) => void }) {
  return <fieldset className="difficulty-selector"><legend>몇 조각으로 놀까요?<span>처음이라면 12개부터 시작해요</span></legend><div className="difficulty-grid">
    {DIFFICULTIES.map(d => <button key={d.count} type="button" className={`difficulty-card ${d.color} ${value === d.count ? 'selected' : ''}`} aria-pressed={value === d.count} onClick={() => onChange(d.count)}>
      <span className="mini-grid" style={{ gridTemplateColumns: `repeat(${d.cols}, 1fr)` }} aria-hidden="true">{Array.from({length:d.count},(_,i)=><i key={i}/>)}</span>
      <span className="difficulty-number">{d.count}<small>개</small></span><span className="difficulty-label">{d.label}</span>{value === d.count && <span className="difficulty-check"><Icon name="check" size={13}/></span>}
    </button>)}
  </div></fieldset>;
}
