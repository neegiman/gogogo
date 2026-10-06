import Icon, { type IconName } from './Icon';
const steps: { name: string; icon: IconName }[] = [
  { name: '찍고', icon: 'camera' },
  { name: '자르고', icon: 'crop' },
  { name: '붙이고', icon: 'puzzle' },
];
export default function PlaySteps({ active }: { active: 1 | 2 | 3 }) {
  return <ol className="play-steps" aria-label="놀이 순서">
    {steps.map((step, index) => <li key={step.name} className={active === index + 1 ? 'current' : ''} aria-current={active === index + 1 ? 'step' : undefined}>
      <span className="play-step-number">{index + 1}</span><Icon name={step.icon} size={19}/><span>{step.name}</span>
    </li>)}
  </ol>;
}
