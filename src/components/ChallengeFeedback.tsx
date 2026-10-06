'use client';
import { useEffect } from 'react';
import type { ChallengeNotice } from '@/types/puzzle';
import Icon from './Icon';

export default function ChallengeFeedback({ notice, onDismiss }: { notice: ChallengeNotice; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(notice.id), 2000);
    return () => window.clearTimeout(timer);
  }, [notice.id, onDismiss]);
  return <div className="challenge-feedback-layer" role="status" aria-live="polite">
    <div className={`challenge-feedback ${notice.kind}`}>
      <Icon name={notice.kind === 'success' ? 'trophy' : 'rotate'} size={52}/>
      <h2>{notice.title}</h2><p>{notice.message}</p>
    </div>
  </div>;
}
