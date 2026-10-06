'use client';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { PuzzlePiece as Piece, PiecePlacements, PieceTray } from '@/types/puzzle';
import PuzzlePiece, { PieceCanvas } from './PuzzlePiece';
import Icon from './Icon';

export default function PuzzleBoard({ image, pieces, tray, placements, completed, highlightPiece, onPlace, onReturn }: {
  image: HTMLCanvasElement; pieces: Piece[]; tray: PieceTray; placements: PiecePlacements;
  completed: boolean; highlightPiece: string | null;
  onPlace: (pieceId: string, cellId: string) => number | null; onReturn: (pieceId: string) => number | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [compact, setCompact] = useState(false);
  const [trayPage, setTrayPage] = useState(0);
  const lastTap = useRef<{ cellId: string; pieceId: string; time: number } | null>(null);
  const byId = useMemo(() => new Map(pieces.map(piece => [piece.id, piece])), [pieces]);
  const cols = 1 / pieces[0].width, rows = 1 / pieces[0].height;
  const pageSize = compact ? 6 : tray.length;
  const pageCount = Math.ceil(tray.length / pageSize);
  const page = Math.min(trayPage, pageCount - 1);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px), (max-height: 520px)');
    const update = () => { setCompact(media.matches); setSelected(null); lastTap.current = null; };
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!highlightPiece) return;
    setSelected(null); lastTap.current = null;
    if (!compact) return;
    const index = tray.indexOf(highlightPiece);
    if (index >= 0) { setTrayPage(Math.floor(index / 6)); setSelected(null); lastTap.current = null; }
  }, [compact, highlightPiece, tray]);
  useEffect(() => {
    if (!compact || tray.every(id => id === null)) return;
    setTrayPage(current => {
      if (tray.slice(current * 6, current * 6 + 6).some(id => id !== null)) return current;
      const next = tray.findIndex(id => id !== null);
      return next >= 0 ? Math.floor(next / 6) : current;
    });
  }, [compact, tray]);

  function changePage(next: number) {
    setSelected(null); lastTap.current = null;
    setTrayPage(Math.max(0, Math.min(pageCount - 1, next)));
  }
  function returnToTray(pieceId: string) {
    const index = onReturn(pieceId); setSelected(null); lastTap.current = null;
    if (compact && index !== null && index >= 0) setTrayPage(Math.floor(index / 6));
    setAnnouncement('조각을 아래 조각함의 앞쪽 빈칸으로 돌려보냈어요.');
  }
  function cellClick(event: MouseEvent<HTMLButtonElement>, cellId: string) {
    const occupant = placements[cellId];
    if (selected && selected !== occupant) {
      const returnedIndex = onPlace(selected, cellId);
      if (compact && returnedIndex !== null) setTrayPage(Math.floor(returnedIndex / 6));
      setSelected(null); lastTap.current = null;
      setAnnouncement(occupant ? '두 조각의 자리를 바꿨어요. 모두 붙인 뒤 도전해요!' : '조각을 놓았어요. 모두 붙인 뒤 도전해요!');
      return;
    }
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
      setAnnouncement('다른 조각을 누르면 자리를 바꿔요. 두 번 누르면 아래로 내려가요.');
      return;
    }
    lastTap.current = null;
    setAnnouncement('조각을 먼저 골라요.');
  }
  return <>
    <div className="puzzle-board" style={{ gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)` }} aria-label="퍼즐 맞추기판" aria-describedby="board-instructions">
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
    <p className="board-instructions" id="board-instructions">조각을 톡, 다른 조각을 톡! 서로 바꿔요.<br/>두 번 톡! 누르면 아래 빈칸으로 내려가요.</p>
    <section className="tray-area" data-paged={compact} aria-label="퍼즐 조각함">
      <div className="tray-heading"><span>{selected ? '빈 자리나 바꿀 조각을 톡!' : '조각을 톡! 누른 뒤, 놓을 자리를 톡!'}</span><span>한 조각씩 천천히!</span></div>
      <div className="piece-tray">
        {tray.map((pieceId, index) => {
          const piece = pieceId ? byId.get(pieceId) : undefined;
          return <div key={index} data-tray-slot={index + 1} data-tray-piece-id={pieceId ?? undefined} className={`tray-slot ${piece ? '' : 'placed-slot'}`} style={{ aspectRatio: `${pieces[0].width} / ${pieces[0].height}` }} hidden={compact && Math.floor(index / 6) !== page}>
            {piece ? <PuzzlePiece key={piece.id} image={image} piece={piece} selected={selected === piece.id} highlighted={highlightPiece === piece.id} onSelect={() => { setSelected(piece.id); lastTap.current = null; setAnnouncement('빈 자리나 바꿀 조각을 톡 눌러요.'); }}/> : <span aria-hidden="true">빈 자리</span>}
          </div>;
        })}
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
