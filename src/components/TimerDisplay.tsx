import { formatTime } from '@/lib/scoring';
import Icon from './Icon';
export default function TimerDisplay({ elapsed }: { elapsed: number }) { return <span className="timer"><Icon name="clock" size={16}/>{formatTime(elapsed)}</span>; }
