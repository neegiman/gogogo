'use client';
import { useRef, type ChangeEvent } from 'react';
import Icon from './Icon';
export default function PhotoSelector({ onSelect, busy }: { onSelect: (file: File) => void; busy: boolean }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  function selected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) onSelect(file);
  }
  return <div className="photo-actions">
    <input ref={camera} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={selected} aria-label="카메라 사진 선택" tabIndex={-1}/>
    <input ref={gallery} className="visually-hidden" type="file" accept="image/*" onChange={selected} aria-label="기기 사진 선택" tabIndex={-1}/>
    <button className="button primary" disabled={busy} onClick={() => camera.current?.click()}><Icon name="camera" size={23}/>사진 찍기</button>
    <button className="button secondary" disabled={busy} onClick={() => gallery.current?.click()}><Icon name="image" size={23}/>사진 선택</button>
  </div>;
}
