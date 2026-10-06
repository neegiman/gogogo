'use client';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { PuzzlePiece as Piece, PiecePlacements } from '@/types/puzzle';
import PuzzlePiece, { PieceCanvas } from './PuzzlePiece';
import Icon from './Icon';

export default function PuzzleBoard({ image, pieces, order, placements, completed, guide, highlightPiece, onPlace, onReturn }: {
  image: HTMLCanvasElement; pieces: Piece[]; order: Piece[]; placements: PiecePlacements;
  completed: boolean; guide: boolean; highlightPiece: string | null;
  onPlace: (pieceId: string, cellId: string) => void; onReturn: (pieceId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [compact, setCompact] = useState(false);
  const [trayPage, setTrayPage] = useState(0);
  const lastTap = useRef<{ cellId: string; pieceId: string; time: number } | null>(null);
  const byId = useMemo(() => new Map(pieces.map(piece => [piece.id, piece])), [pieces]);
  const placedIds = useMemo(() => new Set(Object.values(placements)), [placements]);
  const highlightIsPlaced = !!highlightPiece && placedIds.has(highlightPiece);
  const cols = 1 / pieces[0].width, rows = 1 / pieces[0].height;
  const pageSize = compact ? 6 : order.length;
  const pageCount = Math.ceil(order.length / pageSize);
  const page = Math.min(trayPage, pageCount - 1);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px), (max-height: 520px)');
    const update = () => { setCompact(media.matches); setSelected(null); lastTap.current = null; };
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!compact || !highlightPiece || highlightIsPlaced) return;
    const index = order.findIndex(piece => piece.id === highlightPiece);
    if (index >= 0) { setTrayPage(Math.floor(index / 6)); setSelected(null); lastTap.current = null; }
  }, [compact, highlightPiece, order, highlightIsPlaced]);
  useEffect(() => {
    if (!compact || placedIds.size === order.length) return;
    setTrayPage(current => {
      if (!order.slice(current * 6, current * 6 + 6).every(piece => placedIds.has(piece.id))) return current;
      const next = order.findIndex(piece => !placedIds.has(piece.id));
      return next >= 0 ? Math.floor(next / 6) : current;
    });
  }, [compact, placedIds, order]);

  function changePage(next: number) {
    setSelected(null); lastTap.current = null;
    setTrayPage(Math.max(0, Math.min(pageCount - 1, next)));
  }
  function returnToTray(pieceId: string) {
    onReturn(pieceId); setSelected(null); lastTap.current = null;
    const index = order.findIndex(piece => piece.id === pieceId);
    if (compact && index >= 0) setTrayPage(Math.floor(index / 6));
    setAnnouncement('조각을 아래 조각함으로 돌려보냈어요.');
  }
  function cellClick(event: MouseEvent<HTMLButtonElement>, cellId: string) {
    const occupant = placements[cellId];
    if (occupant) {
      const previous = lastTap.current, time = performance.now();
      // Ordinary clicks work for touch, pen, mouse and keyboard. Two touch clicks
      // are detected without relying on mobile browsers emitting dblclick.
      if (event.detail !== 0 && previous?.cellId === cellId && previous.pieceId === occupant
        && (event.detail > 1 || time - previous.time <= 500)) {
        returnToTray(occupant); return;
      }
      lastTap.current = event.detail === 0 ? null : { cellId, pieceId: occupant, time };
      setSelected(occupant);
      setAnnouncement('두 번 누르면 아래로 내려가요. 빈 자리를 누르면 옮길 수 있어요.');
      return;
    }
    lastTap.current = null;
    if (!selected) { setAnnouncement('아래에서 조각을 먼저 골라요.'); return; }
    onPlace(selected, cellId); setSelected(null);
    setAnnouncement('조각을 놓았어요. 모두 붙인 뒤 도전해요!');
  }
  return <>
    <div className="puzzle-board" style={{ gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)` }} aria-label="퍼즐 맞추기판" aria-describedby="board-instructions">
      {guide && <canvas className="original-guide" ref={canvas => { if (canvas) { canvas.width = image.width; canvas.height = image.height; canvas.getContext('2d')?.drawImage(image, 0, 0); } }} aria-hidden="true"/>}
      {pieces.map(cell => {
        const occupant = byId.get(placements[cell.id]);
        return <button type="button" key={cell.id}
          className={`board-cell ${occupant ? 'occupied' : ''} ${occupant?.id === selected ? 'selected' : ''} ${occupant?.id === highlightPiece ? 'hint-piece' : ''}`}
          data-target-id={cell.id} data-placed-piece-id={occupant?.id}
          aria-label={`${cell.row + 1}행 ${cell.col + 1}열 ${occupant ? `조각 ${Number(occupant.id.split('-')[1]) + 1}, 두 번 누르면 조각함으로` : '빈 자리'}`}
          aria-pressed={!!occupant && occupant.id === selected} aria-keyshortcuts={occupant ? 'Delete Backspace' : undefined}
          disabled={completed} onClick={event => cellClick(event, cell.id)}
          onKeyDown={event => { if (occupant && (event.key === 'Delete' || event.key === 'Backspace')) { event.preventDefault(); returnToTray(occupant.id); } }}>
          {occupant ? <PieceCanvas image={image} piece={occupant}/> : <span aria-hidden="true">·</span>}
        </button>;
      })}
    </div>
    <p className="board-instructions" id="board-instructions">붙인 조각은 두 번 톡! 누르면 아래로 내려가요.</p>
    <section className="tray-area" data-paged={compact} aria-label="퍼즐 조각함">
      <div className="tray-heading"><span>{selected ? '고른 조각을 놓을 빈 자리를 톡!' : '조각을 톡! 누른 뒤, 빈 자리를 톡!'}</span><span>한 조각씩 천천히!</span></div>
      <div className="piece-tray">
        {order.map((piece, index) => <div key={piece.id} className={`tray-slot ${placedIds.has(piece.id) ? 'placed-slot' : ''}`} style={{ aspectRatio: `${piece.width} / ${piece.height}` }} hidden={compact && Math.floor(index / 6) !== page}>
          {!placedIds.has(piece.id) ? <PuzzlePiece image={image} piece={piece} selected={selected === piece.id} highlighted={highlightPiece === piece.id} onSelect={() => { setSelected(piece.id); lastTap.current = null; setAnnouncement('빈 자리를 톡 눌러 조각을 놓아요.'); }}/> : <span aria-hidden="true">위에 있어요</span>}
        </div>)}
      </div>
      {compact && <nav className="tray-pagination" aria-label="조각함 넘기기">
        <button className="tray-page-button" onClick={() => changePage(page - 1)} disabled={page === 0} aria-label="이전 조각"><Icon name="back" size={19}/>이전</button>
        <span className="tray-page-count" aria-live="polite">조각함 <strong>{page + 1}</strong> / {pageCount}</span>
        <button className="tray-page-button" onClick={() => changePage(page + 1)} disabled={page === pageCount - 1} aria-label="다음 조각">다음<Icon name="arrow" size={19}/></button>
      </nav>}
    </section>
    <span className="visually-hidden" role="status">{announcement}</span>
  </>;
}
