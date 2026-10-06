import type { CSSProperties } from 'react';
const paths = {
  crop: <path d="M7 3v14h14M3 7h14v14"/>,
  camera: <><path d="M8 5 6 8H3v12h18V8h-3l-2-3Z"/><circle cx="12" cy="14" r="4"/></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/></>,
  arrow: <path d="m5 12 14 0m-5-5 5 5-5 5"/>,
  back: <path d="m19 12-14 0m5-5-5 5 5 5"/>,
  shield: <><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="m8 12 3 3 5-6"/></>,
  trophy: <><path d="M8 3h8v7a4 4 0 0 1-8 0Z"/><path d="M8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 2v5m-4 2h8"/></>,
  sound: <><path d="M4 9h4l5-5v16l-5-5H4Zm13-2a8 8 0 0 1 0 10m-1-7a4 4 0 0 1 0 4"/></>,
  mute: <><path d="M4 9h4l5-5v16l-5-5H4Zm13 0 5 6m0-6-5 6"/></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  bulb: <><path d="M8 16c0-3-3-3-3-7a7 7 0 0 1 14 0c0 4-3 4-3 7Zm1 4h6m-5 3h4"/></>,
  rotate: <><path d="M4 9a8 8 0 1 1 0 7m0-13v6h6"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></>,
  puzzle: <path d="M3 3h6a3 3 0 1 0 6 0h6v6a3 3 0 1 0 0 6v6h-6a3 3 0 1 0-6 0H3v-6a3 3 0 1 0 0-6Z"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
} as const;
export type IconName = keyof typeof paths;
export default function Icon({ name, size = 24, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>{paths[name]}</svg>;
}
