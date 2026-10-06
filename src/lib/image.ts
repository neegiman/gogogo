const MAX_SOURCE = 2048;
export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('사진을 만들지 못했어요. 다시 시도해 주세요.')), 'image/jpeg', 0.9));
}
export async function normalizeImage(file: File): Promise<HTMLCanvasElement> {
  if (!file.type.startsWith('image/')) throw new Error('사진 파일을 골라 주세요. JPG, PNG, WebP 사진을 사용할 수 있어요.');
  if (file.size > 50 * 1024 * 1024) throw new Error('사진이 너무 커요. 50MB보다 작은 사진을 골라 주세요.');
  let source: ImageBitmap | HTMLImageElement;
  let url: string | undefined;
  try {
    if ('createImageBitmap' in window) {
      try { source = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
      catch { source = await decodeFallback(); }
    } else source = await decodeFallback();
    const ratio = Math.min(1, MAX_SOURCE / Math.max(source.width, source.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.width * ratio));
    canvas.height = Math.max(1, Math.round(source.height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    if ('close' in source) source.close();
    return canvas;
  } catch { throw new Error('이 사진을 열 수 없어요. JPG 또는 PNG 사진으로 다시 골라 주세요.'); }
  finally { if (url) URL.revokeObjectURL(url); }
  async function decodeFallback(): Promise<HTMLImageElement> {
    url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  }
}
export async function loadSample(): Promise<HTMLCanvasElement> {
  const { assetPath } = await import('./paths');
  const img = new Image();
  img.src = assetPath('sample.svg');
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  canvas.getContext('2d')!.drawImage(img, 0, 0, 1024, 1024);
  return canvas;
}
