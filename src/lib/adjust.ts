// ─────────────────────────────────────────────────────────────
// Úpravy fotky (jako Quick Adjustments / Camera Raw) + nasvícení
// do barev grafiky: boční světlo, kontra-světlo na hranách (rim),
// tónování stínů. Výsledek se cachuje podle obrázku a nastavení.
// ─────────────────────────────────────────────────────────────

export interface PhotoAdjust {
  exposure?: number; // -100..100
  contrast?: number;
  shadows?: number;
  highlights?: number;
  saturation?: number;
  temperature?: number; // - modrá … + žlutá
  tint?: number; // - zelená … + purpurová
  clarity?: number; // 0..100 (lokální kontrast)
  /** tónování stínů do barvy (např. tmavě modrá pozadí) */
  grade?: { color: string; amount: number };
  /** boční světlo – barevný přechod přes hráče */
  light?: { color: string; amount: number; side: "left" | "right" | "both" };
  /** světlo na hranách postavy (jen u vyříznutých hráčů) */
  rim?: { color: string; amount: number; width: number; side: "left" | "right" | "both" };
}

export function hasAdjust(a?: PhotoAdjust | null): a is PhotoAdjust {
  if (!a) return false;
  return Object.entries(a).some(([, v]) => (typeof v === "number" ? v !== 0 : !!v && (v as { amount: number }).amount > 0));
}

const cache = new Map<string, HTMLCanvasElement>();

function hex(c: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})/i.exec(c.trim());
  if (!m) return [1, 1, 1];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function adjustedImage(src: CanvasImageSource, w: number, h: number, a: PhotoAdjust, key: string): HTMLCanvasElement {
  const k = key + JSON.stringify(a);
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(src, 0, 0, w, h);

  // 1) tónové úpravy po pixelech
  const ex = Math.pow(2, (a.exposure ?? 0) / 60);
  const ct = 1 + (a.contrast ?? 0) / 100;
  const sh = (a.shadows ?? 0) / 100;
  const hi = (a.highlights ?? 0) / 100;
  const sat = 1 + (a.saturation ?? 0) / 100;
  const tp = (a.temperature ?? 0) / 100;
  const tn = (a.tint ?? 0) / 100;
  const g = a.grade && a.grade.amount > 0 ? { c: hex(a.grade.color), k: a.grade.amount / 100 } : null;
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    let r = d[i] / 255,
      gg = d[i + 1] / 255,
      b = d[i + 2] / 255;
    r *= ex;
    gg *= ex;
    b *= ex;
    let l = 0.299 * r + 0.587 * gg + 0.114 * b;
    if (sh || hi) {
      const lift = sh * 0.45 * (1 - l) * (1 - l) + hi * 0.35 * l * l;
      r += lift;
      gg += lift;
      b += lift;
    }
    r = (r - 0.5) * ct + 0.5;
    gg = (gg - 0.5) * ct + 0.5;
    b = (b - 0.5) * ct + 0.5;
    l = 0.299 * r + 0.587 * gg + 0.114 * b;
    r = l + (r - l) * sat;
    gg = l + (gg - l) * sat;
    b = l + (b - l) * sat;
    if (tp) {
      r += tp * 0.09;
      b -= tp * 0.09;
    }
    if (tn) {
      gg -= tn * 0.07;
      r += tn * 0.035;
      b += tn * 0.035;
    }
    if (g) {
      // stíny do odstínu barvy se zachováním jasu (cinematic grade)
      const lc = clamp(0.299 * r + 0.587 * gg + 0.114 * b);
      const wgt = g.k * Math.pow(1 - lc, 1.5);
      const gl = Math.max(0.02, 0.299 * g.c[0] + 0.587 * g.c[1] + 0.114 * g.c[2]);
      const f = lc / gl;
      r = r * (1 - wgt) + clamp(g.c[0] * f) * wgt;
      gg = gg * (1 - wgt) + clamp(g.c[1] * f) * wgt;
      b = b * (1 - wgt) + clamp(g.c[2] * f) * wgt;
    }
    d[i] = clamp(r) * 255;
    d[i + 1] = clamp(gg) * 255;
    d[i + 2] = clamp(b) * 255;
  }
  x.putImageData(img, 0, 0);

  // 2) clarity – lokální kontrast (overlay rozmazané kopie)
  if ((a.clarity ?? 0) > 0) {
    const t = document.createElement("canvas");
    t.width = w;
    t.height = h;
    const tx = t.getContext("2d")!;
    tx.filter = `blur(${Math.max(2, Math.round(Math.max(w, h) / 120))}px) grayscale(1) invert(1)`;
    tx.drawImage(c, 0, 0);
    x.save();
    x.globalAlpha = (a.clarity ?? 0) / 220;
    x.globalCompositeOperation = "overlay";
    x.drawImage(t, 0, 0);
    x.restore();
  }

  const orig = document.createElement("canvas");
  orig.width = w;
  orig.height = h;
  orig.getContext("2d")!.drawImage(src, 0, 0, w, h);

  // 3) boční barevné světlo
  if (a.light && a.light.amount > 0) {
    const L = a.light;
    const gr = x.createLinearGradient(0, 0, w, 0);
    const col = L.color;
    const t0 = "rgba(0,0,0,0)";
    if (L.side === "left") {
      gr.addColorStop(0, col);
      gr.addColorStop(0.65, t0);
    } else if (L.side === "right") {
      gr.addColorStop(0.35, t0);
      gr.addColorStop(1, col);
    } else {
      gr.addColorStop(0, col);
      gr.addColorStop(0.45, t0);
      gr.addColorStop(0.55, t0);
      gr.addColorStop(1, col);
    }
    x.save();
    x.globalAlpha = Math.min(1, L.amount / 100);
    x.globalCompositeOperation = "soft-light";
    x.fillStyle = gr;
    x.fillRect(0, 0, w, h);
    // jen velmi jemné „přisvětlení“ – světlo má barvit, ne svítit
    x.globalAlpha = Math.min(1, L.amount / 900);
    x.globalCompositeOperation = "screen";
    x.fillRect(0, 0, w, h);
    x.restore();
  }

  // 4) rim light – světlá hrana postavy z jedné / obou stran
  if (a.rim && a.rim.amount > 0) {
    const R = a.rim;
    const px = Math.max(1.5, (R.width / 100) * w * 0.035);
    const edge = document.createElement("canvas");
    edge.width = w;
    edge.height = h;
    const ex2 = edge.getContext("2d")!;
    const sides = R.side === "both" ? [1, -1] : R.side === "left" ? [1] : [-1];
    for (const s of sides) {
      const part = document.createElement("canvas");
      part.width = w;
      part.height = h;
      const p = part.getContext("2d")!;
      p.drawImage(orig, 0, 0);
      p.globalCompositeOperation = "destination-out";
      p.drawImage(orig, s * px, -px * 0.25);
      ex2.drawImage(part, 0, 0);
    }
    ex2.globalCompositeOperation = "source-in";
    ex2.fillStyle = R.color;
    ex2.fillRect(0, 0, w, h);
    x.save();
    x.globalCompositeOperation = "screen";
    x.globalAlpha = Math.min(1, R.amount / 100);
    x.filter = `blur(${Math.max(1, px * 0.6)}px)`;
    x.drawImage(edge, 0, 0);
    x.filter = "none";
    x.globalAlpha = Math.min(1, R.amount / 400);
    x.drawImage(edge, 0, 0);
    x.restore();
  }

  // průhlednost podle originálu (vyříznutý hráč zůstane vyříznutý)
  x.save();
  x.globalCompositeOperation = "destination-in";
  x.drawImage(orig, 0, 0);
  x.restore();

  if (cache.size > 24) cache.clear();
  cache.set(k, c);
  return c;
}

/** Předvolby – barvy se berou z brand kitu. */
export function adjustPresets(colors: { primary: string; accent: string; dark: string; secondary: string }): { id: string; label: string; adj: PhotoAdjust }[] {
  return [
    { id: "none", label: "Původní", adj: {} },
    {
      id: "studio",
      label: "Do barev grafiky",
      adj: { exposure: -10, contrast: 18, shadows: -12, highlights: -22, saturation: -28, temperature: -8, clarity: 22, grade: { color: colors.secondary, amount: 50 }, light: { color: colors.primary, amount: 30, side: "both" }, rim: { color: colors.primary, amount: 40, width: 20, side: "both" } },
    },
    {
      id: "dramatic",
      label: "Dramatické",
      adj: { exposure: -18, contrast: 28, shadows: -24, highlights: -20, saturation: -35, temperature: -6, clarity: 35, grade: { color: colors.secondary, amount: 60 }, light: { color: colors.primary, amount: 35, side: "both" }, rim: { color: colors.primary, amount: 55, width: 22, side: "both" } },
    },
    {
      id: "warm",
      label: "Teplé světlo",
      adj: { exposure: -4, contrast: 12, saturation: -6, temperature: 10, clarity: 20, grade: { color: colors.secondary, amount: 35 }, light: { color: colors.accent, amount: 35, side: "both" }, rim: { color: colors.accent, amount: 60, width: 25, side: "both" } },
    },
  ];
}
