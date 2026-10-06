'use client';
import { useEffect, useRef, useState } from 'react';
import { usePointerDrag } from '@/hooks/usePointerDrag';
import type { PuzzlePiece as Piece } from '@/types/puzzle';
import PuzzlePiece, { PieceCanvas } from './PuzzlePiece';
import Icon from './Icon';
export default function PuzzleBoard({ image, pieces, order, locked, guide, highlightPiece, highlightTarget, onPlace }: {
  image: HTMLCanvasElement; pieces: Piece[]; order: Piece[]; locked: Set<string>; guide: boolean;
  highlightPiece: string | null; highlightTarget: string | null; onPlace: (id: string) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = usePointerDrag(boardRef, onPlace);
  const [announcement, setAnnouncement] = useState('');
  const [compact, setCompact] = useState(false);
  const [trayPage, setTrayPage] = useState(0);
  const cols = 1 / pieces[0].width, rows = 1 / pieces[0].height;
  const pageSize = compact ? 6 : order.length;
  const pageCount = Math.ceil(order.length / pageSize);
  const page = Math.min(trayPage, pageCount - 1);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px), (max-height: 520px)');
    const update = () => setCompact(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!compact || !highlightPiece) return;
    const index = order.findIndex(piece => piece.id === highlightPiece);
    if (index >= 0) setTrayPage(Math.floor(index / 6));
  }, [compact, highlightPiece, order]);
  useEffect(() => {
    if (!compact || locked.size === order.length) return;
    setTrayPage(current => {
      if (!order.slice(current * 6, current * 6 + 6).every(piece => locked.has(piece.id))) return current;
      const next = order.findIndex(piece => !locked.has(piece.id));
      return next >= 0 ? Math.floor(next / 6) : current;
    });
  }, [compact, locked, order]);
  function changePage(next: number) {
    drag.cancel(); drag.setSelected(null);
    setTrayPage(Math.max(0, Math.min(pageCount - 1, next)));
  }
  function targetClick(piece: Piece) {
    if (drag.selected === piece.id) { onPlace(piece.id); drag.setSelected(null); setAnnouncement('잘했어요! 조각이 제자리를 찾았어요.'); }
    else if (drag.selected) setAnnouncement('다른 자리도 살펴볼까요?');
  }
  return <>
    <div className="puzzle-board" ref={boardRef} style={{ gridTemplateColumns:`repeat(${cols},1fr)`, gridTemplateRows:`repeat(${rows},1fr)` }} aria-label="퍼즐 맞추기판">
      {guide && <canvas className="original-guide" ref={canvas => { if (canvas) { canvas.width=image.width; canvas.height=image.height; canvas.getContext('2d')?.drawImage(image,0,0); } }} aria-hidden="true"/>}
      {pieces.map(piece => <button key={piece.id} className={`board-cell ${locked.has(piece.id) ? 'locked' : ''} ${highlightTarget === piece.id ? 'hint-target' : ''}`} data-target-id={piece.id} aria-label={`${piece.row+1}행 ${piece.col+1}열 ${locked.has(piece.id)?'완성':'자리'}`} disabled={locked.has(piece.id)} onClick={() => targetClick(piece)}>{locked.has(piece.id) ? <PieceCanvas image={image} piece={piece}/> : <span aria-hidden="true">·</span>}</button>)}
    </div>
    <section className="tray-area" data-paged={compact} aria-label="퍼즐 조각함">
      <div className="tray-heading"><span>{drag.selected ? '고른 조각의 자리를 톡 눌러요' : '조각을 끌거나, 톡 골라요'}</span><span>한 조각씩 천천히!</span></div>
      <div className="piece-tray">
        {order.map((piece,index) => <div key={piece.id} className={`tray-slot ${locked.has(piece.id) ? 'solved-slot' : ''}`} style={{ aspectRatio:`${piece.width} / ${piece.height}` }} hidden={compact && Math.floor(index/6)!==page}>{!locked.has(piece.id) ? <PuzzlePiece image={image} piece={piece} selected={drag.selected === piece.id} highlighted={highlightPiece === piece.id} dragging={drag.dragPiece?.id === piece.id} onPointerDown={e => drag.down(e,piece)} onPointerMove={drag.move} onPointerUp={drag.up} onPointerCancel={drag.cancel} onSelect={() => drag.setSelected(piece.id)}/> : <span aria-hidden="true">✓</span>}</div>)}
      </div>
      {compact && <nav className="tray-pagination" aria-label="조각함 넘기기">
        <button className="tray-page-button" onClick={() => changePage(page-1)} disabled={page===0 || !!drag.dragPiece} aria-label="이전 조각"><Icon name="back" size={19}/>이전</button>
        <span className="tray-page-count" aria-live="polite">조각함 <strong>{page+1}</strong> / {pageCount}</span>
        <button className="tray-page-button" onClick={() => changePage(page+1)} disabled={page===pageCount-1 || !!drag.dragPiece} aria-label="다음 조각">다음<Icon name="arrow" size={19}/></button>
      </nav>}
    </section>
    {drag.dragPiece && <div className="drag-overlay" ref={drag.overlayRef} style={{ width:drag.drag.current?.width, height:drag.drag.current?.height }} aria-hidden="true"><PieceCanvas image={image} piece={drag.dragPiece}/></div>}
    <span className="visually-hidden" role="status">{announcement}</span>
  </>;
}
