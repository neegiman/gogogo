import { assetPath } from './paths';
const sounds = new Map<string, HTMLAudioElement>();
export function playSound(name: 'piece-correct' | 'puzzle-complete', enabled: boolean) {
  if (!enabled) return;
  try {
    let audio = sounds.get(name);
    if (!audio) { audio = new Audio(assetPath(`sounds/${name}.wav`)); sounds.set(name, audio); }
    audio.currentTime = 0;
    audio.volume = 0.35;
    void audio.play().catch(() => {});
  } catch { /* Audio is optional; gameplay always continues. */ }
}
export function vibrate() {
  try { if ('vibrate' in navigator) navigator.vibrate(35); } catch { /* optional */ }
}
