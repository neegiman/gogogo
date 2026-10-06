'use client';
import { useEffect, useRef } from 'react';
import Icon from './Icon';

export default function OriginalImageGuide({ image, onClose }: { image: HTMLCanvasElement; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = image.width; canvas.height = image.height;
      canvas.getContext('2d')?.drawImage(image, 0, 0);
    }
    dialogRef.current?.showModal();
  }, [image]);
  return <dialog ref={dialogRef} className="original-preview" aria-labelledby="original-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <h2 id="original-title"><Icon name="image" size={24}/>원본 사진</h2>
    <canvas ref={canvasRef} className="original-guide" role="img" aria-label="퍼즐의 완성된 원본 사진"/>
    <p>사진을 살펴보고 다시 붙여볼까요?</p>
    <button className="button primary" onClick={onClose}>닫고 이어하기</button>
  </dialog>;
}
