'use client';
import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { canSnap } from '@/lib/puzzle';
import type { PuzzlePiece } from '@/types/puzzle';
type Drag = { piece: PuzzlePiece; pointerId: number; startX: number; startY: number; x: number; y: number; offsetX: number; offsetY: number; width: number; height: number; moved: boolean };
export function usePointerDrag(board: RefObject<HTMLDivElement | null>, onPlace: (id: string) => void) {
  const [selected, setSelected] = useState<string | null>(null);
  const [dragPiece, setDragPiece] = useState<PuzzlePiece | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const frame = useRef(0);
  const suppressClick = useRef(false);
  function position() {
    const d = drag.current, overlay = overlayRef.current;
    if (d && overlay) overlay.style.transform = `translate3d(${d.x-d.offsetX}px,${d.y-d.offsetY}px,0)`;
  }
  useEffect(() => { if (dragPiece) position(); }, [dragPiece]);
  function cancel() { drag.current = null; setDragPiece(null); cancelAnimationFrame(frame.current); frame.current = 0; }
  useEffect(() => {
    window.addEventListener('resize', cancel); window.addEventListener('blur', cancel);
    return () => { window.removeEventListener('resize', cancel); window.removeEventListener('blur', cancel); cancelAnimationFrame(frame.current); };
  }, []);
  function down(event: PointerEvent<HTMLButtonElement>, piece: PuzzlePiece) {
    if (drag.current || (event.pointerType === 'mouse' && event.button !== 0) || !board.current) return;
    event.preventDefault(); setSelected(piece.id);
    const source = event.currentTarget.getBoundingClientRect(), target = board.current.getBoundingClientRect();
    const width = target.width * piece.width, height = target.height * piece.height;
    drag.current = { piece, pointerId: event.pointerId, startX:event.clientX, startY:event.clientY, x:event.clientX, y:event.clientY, offsetX:(event.clientX-source.left)/source.width*width, offsetY:(event.clientY-source.top)/source.height*height, width, height, moved:false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragPiece(piece);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== event.pointerId) return;
    d.x = event.clientX; d.y = event.clientY;
    d.moved ||= Math.hypot(d.x-d.startX,d.y-d.startY) > 5;
    if (!frame.current) frame.current = requestAnimationFrame(() => { frame.current = 0; position(); });
  }
  function up(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== event.pointerId) return;
    const rect = board.current?.getBoundingClientRect();
    if (d.moved && rect) {
      const centerX = event.clientX - d.offsetX + d.width / 2;
      const centerY = event.clientY - d.offsetY + d.height / 2;
      const targetX = rect.left + (d.piece.correctX+d.piece.width/2)*rect.width;
      const targetY = rect.top + (d.piece.correctY+d.piece.height/2)*rect.height;
      if (canSnap(centerX,centerY,targetX,targetY,d.width,d.height)) { onPlace(d.piece.id); setSelected(null); }
    }
    suppressClick.current = d.moved;
    cancel();
  }
  return { selected, setSelected, dragPiece, overlayRef, drag, down, move, up, cancel, suppressClick };
}
