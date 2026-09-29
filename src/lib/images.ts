const cache = new Map<string, Promise<HTMLImageElement | null>>();

export function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  let p = cache.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      if (/^https?:/.test(url)) img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => {
        cache.delete(url);
        resolve(null);
      };
      img.src = url;
    });
    cache.set(url, p);
  }
  return p;
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/**
 * Zmenší příliš velké fotky (šetří úložiště), ale nechá dost rozlišení
 * na export ve 2× (max. 2400 px na delší straně). PNG s průhledností zůstane PNG.
 */
export async function importImageFile(file: File, maxSide = 2400): Promise<{ dataUrl: string; w: number; h: number }> {
  const raw = await fileToDataUrl(file);
  if (file.type === "image/svg+xml") {
    const img = await loadImage(raw);
    return { dataUrl: raw, w: img?.naturalWidth || 512, h: img?.naturalHeight || 512 };
  }
  const img = await loadImage(raw);
  if (!img) throw new Error("Soubor se nepodařilo načíst jako obrázek.");
  const { naturalWidth: w, naturalHeight: h } = img;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  if (scale === 1 && file.size < 2_500_000) return { dataUrl: raw, w, h };
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const keepAlpha = file.type === "image/png" || file.type === "image/webp";
  const dataUrl = keepAlpha ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.9);
  return { dataUrl, w: c.width, h: c.height };
}
