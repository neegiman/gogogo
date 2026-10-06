'use client';
import { useImageEditor } from '@/hooks/useImageEditor';
import Icon from './Icon';
import type { ReactNode } from 'react';
export default function ImageEditor({ image, onConfirm, onCancel, children }: { image: HTMLCanvasElement; onConfirm: (canvas: HTMLCanvasElement) => void; onCancel: () => void; children?: ReactNode }) {
  const editor = useImageEditor(image);
  return <section className="editor-card" aria-label="사진 편집">
    <div className="crop-frame"><canvas ref={editor.canvasRef} onPointerDown={editor.pointerDown} onPointerMove={editor.pointerMove} onPointerUp={editor.pointerEnd} onPointerCancel={editor.pointerEnd} onLostPointerCapture={editor.pointerEnd} aria-label="사진 자르기 미리보기. 손가락으로 이동하거나 아래 확대 버튼을 사용하세요."/><div className="crop-grid" aria-hidden="true"/></div>
    <div className="zoom-control"><button onClick={() => editor.changeZoom(editor.zoom - 0.2)} aria-label="사진 축소" disabled={editor.zoom <= 1}>−</button><input type="range" min="1" max="4" step="0.01" value={editor.zoom} onChange={e => editor.changeZoom(Number(e.target.value))} aria-label="사진 확대"/><button onClick={() => editor.changeZoom(editor.zoom + 0.2)} aria-label="사진 확대" disabled={editor.zoom >= 4}>+</button></div>
    <div className="editor-tools"><button className="button quiet" onClick={editor.rotate}><Icon name="rotate" size={18}/>90° 회전</button><button className="button quiet" onClick={editor.reset}>처음 상태로</button></div>
    {children && <div className="editor-difficulty">{children}</div>}
    <div className="editor-confirm"><button className="button secondary" onClick={onCancel}>다른 사진</button><button className="button primary" onClick={() => onConfirm(editor.crop())}>붙이러 고고고!<Icon name="arrow" size={20}/></button></div>
  </section>;
}
