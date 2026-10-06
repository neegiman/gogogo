'use client';
import { useImageEditor } from '@/hooks/useImageEditor';
import Icon from './Icon';
import { useRef, useState, type ReactNode } from 'react';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, type Difficulty } from '@/types/puzzle';
export default function ImageEditor({ image, difficulty = DEFAULT_DIFFICULTY, onConfirm, onCancel, children }: { image: HTMLCanvasElement; difficulty?: Difficulty; onConfirm: (canvas: HTMLCanvasElement) => void; onCancel: () => void; children?: ReactNode }) {
  const editor = useImageEditor(image);
  const setting = DIFFICULTIES.find(option => option.count === difficulty) ?? DIFFICULTIES[0];
  const confirming = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function confirm() {
    if (!editor.ready || confirming.current) return;
    confirming.current = true; setBusy(true); setError('');
    try { onConfirm(editor.crop()); }
    catch (error) {
      confirming.current = false; setBusy(false);
      setError(error instanceof Error ? error.message : '사진을 자르지 못했어요. 다시 눌러 주세요.');
    }
  }
  return <section className="editor-card" aria-label="사진 편집">
    <p className="editor-selection" aria-live="polite"><Icon name="check" size={18}/><strong>{setting.count}개 선택됨</strong><span>{setting.cols} × {setting.rows} 조각</span></p>
    <div className="crop-frame"><canvas ref={editor.canvasRef} onPointerDown={editor.pointerDown} onPointerMove={editor.pointerMove} onPointerUp={editor.pointerEnd} onPointerCancel={editor.pointerEnd} onLostPointerCapture={editor.pointerEnd} aria-label="사진 자르기 미리보기. 손가락으로 이동하거나 아래 확대 버튼을 사용하세요."/><svg className="crop-grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{Array.from({length: setting.cols - 1}, (_, i) => <line key={`col-${i}`} x1={(i+1)*100/setting.cols} x2={(i+1)*100/setting.cols} y1="0" y2="100"/>)}{Array.from({length: setting.rows - 1}, (_, i) => <line key={`row-${i}`} y1={(i+1)*100/setting.rows} y2={(i+1)*100/setting.rows} x1="0" x2="100"/>)}</svg></div>
    <div className="zoom-control"><button onClick={() => editor.changeZoom(editor.zoom - 0.2)} aria-label="사진 축소" disabled={editor.zoom <= 1}>−</button><input type="range" min="1" max="4" step="0.01" value={editor.zoom} onChange={e => editor.changeZoom(Number(e.target.value))} aria-label="사진 확대"/><button onClick={() => editor.changeZoom(editor.zoom + 0.2)} aria-label="사진 확대" disabled={editor.zoom >= 4}>+</button></div>
    <div className="editor-tools"><button className="button quiet" onClick={editor.rotate}><Icon name="rotate" size={18}/>90° 회전</button><button className="button quiet" onClick={editor.reset}>처음 상태로</button></div>
    {children && <div className="editor-difficulty">{children}</div>}
    {(error || editor.error) && <p className="error-notice" role="alert">{error || editor.error}</p>}
    <div className="editor-confirm"><button className="button secondary" onClick={onCancel} disabled={busy}>다른 사진</button><button className="button primary" onClick={confirm} disabled={!editor.ready || busy}>{busy ? '퍼즐을 준비하고 있어요…' : editor.ready ? '붙이러 고고고!' : '사진을 준비하고 있어요…'}<Icon name="arrow" size={20}/></button></div>
  </section>;
}
