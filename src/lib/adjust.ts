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
  /** Sladění s pozadím (jako Match Color ve Photoshopu): statistický přenos barev a jasu
   *  z pozadí grafiky na fotku v perceptuálním prostoru OkLab. amount = síla (0–100),
   *  lum / color = podíl přenosu jasu / barvy (0–100). */
  match?: { amount: number; lum?: number; color?: number };
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

// ── OkLab (Björn Ottosson) ───────────────────────────────────
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055);
function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  r = toLin(r);
  g = toLin(g);
  b = toLin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function oklabToRgb(L: number, A: number, B: number): [number, number, number] {
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
  return [toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
}

type Stats = { mean: [number, number, number]; sd: [number, number, number] };
const statsCache = new WeakMap<object, Stats>();
/** Průměr a rozptyl v OkLab (jen neprůhledné pixely, zmenšený náhled). */
function labStats(src: CanvasImageSource, w: number, h: number): Stats {
  const hit = statsCache.get(src as object);
  if (hit) return hit;
  const k = Math.min(1, 160 / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(src, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const sum = [0, 0, 0];
  const sq = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    const v = rgbToOklab(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
    for (let j = 0; j < 3; j++) {
      sum[j] += v[j];
      sq[j] += v[j] * v[j];
    }
    n++;
  }
  n = Math.max(1, n);
  const mean = sum.map((v) => v / n) as [number, number, number];
  const sd = sq.map((v, j) => Math.sqrt(Math.max(1e-6, v / n - mean[j] * mean[j]))) as [number, number, number];
  const st = { mean, sd };
  statsCache.set(src as object, st);
  return st;
}

export function adjustedImage(src: CanvasImageSource, w: number, h: number, a: PhotoAdjust, key: string, ref?: { img: CanvasImageSource; w: number; h: number } | null): HTMLCanvasElement {
  const k = key + JSON.stringify(a) + (ref ? ":ref" : "");
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(src, 0, 0, w, h);

  // 0) sladění s pozadím (Match Color) v OkLab
  if (a.match && a.match.amount > 0 && ref) {
    const S = labStats(src, w, h);
    const R = labStats(ref.img, ref.w, ref.h);
    const amt = a.match.amount / 100;
    const kl = (a.match.lum ?? 60) / 100;
    const kc = (a.match.color ?? 70) / 100;
    const ratio = (j: number) => Math.min(1.6, Math.max(0.55, R.sd[j] / S.sd[j]));
    const id = x.getImageData(0, 0, w, h);
    const d0 = id.data;
    for (let i = 0; i < d0.length; i += 4) {
      if (d0[i + 3] === 0) continue;
      const r0 = d0[i] / 255,
        g0 = d0[i + 1] / 255,
        b0 = d0[i + 2] / 255;
      const v = rgbToOklab(r0, g0, b0);
      // pleť (teplé tóny) dostane jen část barevného přenosu
      const skin = r0 > g0 && g0 > b0 && r0 - b0 > 0.08 ? 0.35 : 1;
      const t = [
        (v[0] - S.mean[0]) * ratio(0) + R.mean[0],
        (v[1] - S.mean[1]) * ratio(1) + R.mean[1],
        (v[2] - S.mean[2]) * ratio(2) + R.mean[2],
      ];
      const L = v[0] + (t[0] - v[0]) * amt * kl;
      const A = v[1] + (t[1] - v[1]) * amt * kc * skin;
      const B = v[2] + (t[2] - v[2]) * amt * kc * skin;
      const o = oklabToRgb(L, A, B);
      d0[i] = clamp(o[0]) * 255;
      d0[i + 1] = clamp(o[1]) * 255;
      d0[i + 2] = clamp(o[2]) * 255;
    }
    x.putImageData(id, 0, 0);
  }

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
      // jen hluboké stíny do odstínu barvy; pleť (r > g > b) skoro netknutá
      const lc = clamp(0.299 * r + 0.587 * gg + 0.114 * b);
      const skin = r > gg && gg > b && r - b > 0.08 ? 0.25 : 1;
      const wgt = g.k * Math.pow(1 - lc, 2.2) * skin;
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

/** Smíchání dvou barev (#rrggbb), t = podíl druhé barvy. */
export function mixColor(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  const c = A.map((v, i) => Math.round((v * (1 - t) + B[i] * t) * 255));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Předvolby – barvy se berou z brand kitu, ale zjemněné, aby nebarvily pleť (např. zelená ŽBL). */
export function adjustPresets(raw: { primary: string; accent: string; dark: string; secondary: string }): { id: string; label: string; adj: PhotoAdjust }[] {
  const colors = {
    primary: mixColor(raw.primary, "#FFFFFF", 0.45),
    accent: mixColor(raw.accent, "#FFFFFF", 0.35),
    secondary: mixColor(raw.secondary, "#202020", 0.55),
    dark: raw.dark,
  };
  return [
    { id: "none", label: "Původní", adj: {} },
    {
      id: "studio",
      label: "Do barev grafiky",
      adj: { match: { amount: 55, lum: 55, color: 60 }, contrast: 12, highlights: -12, clarity: 18, grade: { color: colors.secondary, amount: 20 }, light: { color: colors.primary, amount: 16, side: "both" }, rim: { color: colors.primary, amount: 30, width: 16, side: "both" } },
    },
    {
      id: "dramatic",
      label: "Dramatické",
      adj: { match: { amount: 75, lum: 75, color: 70 }, exposure: -8, contrast: 24, shadows: -16, highlights: -14, saturation: -12, clarity: 30, grade: { color: colors.secondary, amount: 30 }, light: { color: colors.primary, amount: 22, side: "both" }, rim: { color: colors.primary, amount: 45, width: 18, side: "both" } },
    },
    {
      id: "warm",
      label: "Teplé světlo",
      adj: { exposure: -4, contrast: 12, saturation: -6, temperature: 10, clarity: 20, grade: { color: colors.secondary, amount: 35 }, light: { color: colors.accent, amount: 35, side: "both" }, rim: { color: colors.accent, amount: 60, width: 25, side: "both" } },
    },
  ];
}
