'use client';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
type View = { zoom: number; angle: number; x: number; y: number };
const initial: View = { zoom: 1, angle: 0, x: 0, y: 0 };
export function useImageEditor(image: HTMLCanvasElement) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef<View>({ ...initial });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const frame = useRef(0);
  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  function constrain() {
    const v = view.current;
    const rotated = v.angle % 180 !== 0;
    const w = rotated ? image.height : image.width;
    const h = rotated ? image.width : image.height;
    const scale = v.zoom / Math.min(w, h);
    const maxX = Math.max(0, (w * scale - 1) / 2);
    const maxY = Math.max(0, (h * scale - 1) / 2);
    v.x = Math.max(-maxX, Math.min(maxX, v.x));
    v.y = Math.max(-maxY, Math.min(maxY, v.y));
  }
  const renderTo = useCallback((canvas: HTMLCanvasElement, size: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('사진을 자를 준비가 안 됐어요. 잠시 후 다시 눌러 주세요.');
    const v = view.current;
    const scale = size / Math.min(image.width, image.height) * v.zoom;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size * (0.5 + v.x), size * (0.5 + v.y));
    ctx.rotate(v.angle * Math.PI / 180);
    ctx.drawImage(image, -image.width * scale / 2, -image.height * scale / 2, image.width * scale, image.height * scale);
    ctx.restore();
  }, [image]);
  const draw = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const size = Math.round(canvas.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 3));
      if (size < 1) return;
      if (canvas.width !== size || canvas.height !== size) { canvas.width = size; canvas.height = size; }
      try { renderTo(canvas, size); setReady(true); setError(''); }
      catch { setReady(false); setError('사진을 표시하지 못했어요. 다른 사진을 골라 주세요.'); }
    });
  }, [renderTo]);
  useEffect(() => {
    view.current = { ...initial }; pointers.current.clear(); setZoom(1); setReady(false); setError(''); draw();
    const observer = new ResizeObserver(draw);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame.current); frame.current = 0; };
  }, [draw]);
  function changeZoom(value: number) {
    view.current.zoom = Math.max(1, Math.min(4, value));
    constrain(); setZoom(view.current.zoom); draw();
  }
  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const before = [...pointers.current.values()];
    const old = pointers.current.get(event.pointerId)!;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const after = [...pointers.current.values()];
    const size = event.currentTarget.getBoundingClientRect().width;
    if (before.length >= 2) {
      const distance = (p: { x: number; y: number }[]) => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      const center = (p: { x: number; y: number }[]) => ({ x: (p[0].x+p[1].x)/2, y: (p[0].y+p[1].y)/2 });
      const a = center(before), b = center(after), rect = event.currentTarget.getBoundingClientRect();
      const oldZoom = view.current.zoom;
      const newZoom = Math.max(1, Math.min(4, oldZoom * distance(after) / Math.max(1, distance(before))));
      const ratio = newZoom / oldZoom;
      const ax = (a.x-rect.left)/size-0.5, ay = (a.y-rect.top)/size-0.5;
      view.current.x = ax - (ax-view.current.x)*ratio + (b.x-a.x)/size;
      view.current.y = ay - (ay-view.current.y)*ratio + (b.y-a.y)/size;
      view.current.zoom = newZoom;
    } else {
      view.current.x += (event.clientX - old.x) / size;
      view.current.y += (event.clientY - old.y) / size;
    }
    constrain(); draw();
  }
  function pointerEnd(event: PointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(event.pointerId); setZoom(view.current.zoom);
  }
  function rotate() { pointers.current.clear(); view.current = { ...initial, angle: (view.current.angle + 90) % 360 }; setZoom(1); draw(); }
  function reset() { pointers.current.clear(); view.current = { ...initial }; setZoom(1); draw(); }
  function crop() {
    if (!ready) throw new Error('사진을 준비하고 있어요. 잠시 후 다시 눌러 주세요.');
    pointers.current.clear();
    const output = document.createElement('canvas'); output.width = output.height = 1024;
    renderTo(output, 1024); return output;
  }
  return { canvasRef, zoom, ready, error, changeZoom, rotate, reset, crop, pointerDown, pointerMove, pointerEnd };
}
