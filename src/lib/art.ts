/**
 * Redimensiona una carátula a `mx` píxeles y la devuelve como data URL JPEG.
 * Reduce por mitades y con suavizado alto: evita el aspecto borroso/dentado al achicar mucho.
 */
export async function artURL(blob: Blob | null | undefined, mx = 512): Promise<string | null> {
  if (!blob) return null;
  try {
    const bm = await createImageBitmap(blob);
    const s = Math.min(1, mx / Math.max(bm.width, bm.height));
    const W = Math.max(1, Math.round(bm.width * s)), H = Math.max(1, Math.round(bm.height * s));
    let src: CanvasImageSource = bm;
    let sw = bm.width, sh = bm.height;
    while (sw / 2 >= W && sh / 2 >= H) {
      const c = document.createElement('canvas');
      sw = c.width = Math.round(sw / 2);
      sh = c.height = Math.round(sh / 2);
      const x = c.getContext('2d') as CanvasRenderingContext2D;
      x.imageSmoothingQuality = 'high';
      x.drawImage(src, 0, 0, sw, sh);
      src = c;
    }
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d') as CanvasRenderingContext2D;
    x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, W, H);
    if (bm.close) bm.close();
    return c.toDataURL('image/jpeg', 0.9);
  } catch { return null; }
}
