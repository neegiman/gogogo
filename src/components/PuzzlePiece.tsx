'use client';
import { memo, useEffect, useRef, type PointerEventHandler } from 'react';
import type { PuzzlePiece as Piece } from '@/types/puzzle';
export function PieceCanvas({ image, piece }: { image: HTMLCanvasElement; piece: Piece }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.getContext('2d')?.drawImage(image, piece.correctX * image.width, piece.correctY * image.height, piece.width * image.width, piece.height * image.height, 0, 0, canvas.width, canvas.height);
    };
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => observer.disconnect();
  }, [image, piece]);
  return <canvas ref={ref} aria-hidden="true" style={{aspectRatio:`${piece.width} / ${piece.height}`}}/>;
}
export default memo(function PuzzlePiece({ image, piece, selected, highlighted, dragging, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onSelect }: {
  image: HTMLCanvasElement; piece: Piece; selected: boolean; highlighted: boolean; dragging: boolean;
  onPointerDown: PointerEventHandler<HTMLButtonElement>; onPointerMove: PointerEventHandler<HTMLButtonElement>;
  onPointerUp: PointerEventHandler<HTMLButtonElement>; onPointerCancel: PointerEventHandler<HTMLButtonElement>;
  onSelect: () => void;
}) {
  return <button className={`puzzle-piece ${selected ? 'selected' : ''} ${highlighted ? 'hint-piece' : ''} ${dragging ? 'dragging' : ''}`} style={{ aspectRatio: `${piece.width} / ${piece.height}` }} data-piece-id={piece.id} aria-label={`퍼즐 조각 ${Number(piece.id.split('-')[1])+1}`} aria-pressed={selected} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onLostPointerCapture={onPointerCancel} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}><PieceCanvas image={image} piece={piece}/></button>;
});
