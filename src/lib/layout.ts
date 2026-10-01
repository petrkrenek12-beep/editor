import { FORMATS, isLandscape } from "./formats";
import type { AnchorX, AnchorY, FormatId, Frame, Template, TemplateElement } from "./types";

export interface Resolved {
  frame: Frame;
  /** měřítko pro velikosti písma, tloušťky, rádiusy */
  s: number;
}

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Automatické odvození kotvení podle polohy prvku (pokud ho šablona neurčí). */
export function autoAnchorX(f: Frame, W: number): AnchorX {
  if (f.w >= W * 0.9) return "stretch";
  const c = f.x + f.w / 2;
  if (c < W * 0.34) return "left";
  if (c > W * 0.66) return "right";
  return "center";
}

export function autoAnchorY(f: Frame, H: number): AnchorY {
  if (f.h >= H * 0.9) return "stretch";
  const c = f.y + f.h / 2;
  if (c < H * 0.38) return "top";
  if (c > H * 0.62) return "bottom";
  return "center";
}

function axis(pos: number, size: number, B: number, R: number, s: number, anchor: AnchorX | AnchorY): [number, number] {
  switch (anchor) {
    case "left":
    case "top":
      return [pos * s, size * s];
    case "right":
    case "bottom": {
      const n = size * s;
      return [R - (B - pos - size) * s - n, n];
    }
    case "center": {
      const n = size * s;
      return [R / 2 + (pos + size / 2 - B / 2) * s - n / 2, n];
    }
    case "stretch": {
      const a = pos * s;
      const b = R - (B - pos - size) * s;
      return [a, Math.max(1, b - a)];
    }
    case "scale":
    default:
      return [(pos * R) / B, (size * R) / B];
  }
}

/** Přepočet rámu z plochy B (šířka × výška) do oblasti R. */
export function constrain(
  f: Frame,
  B: { w: number; h: number },
  R: Region,
  ax: AnchorX,
  ay: AnchorY,
): Resolved {
  const s = Math.min(R.w / B.w, R.h / B.h);
  // Vodorovně drží obsah kompozici (sloupec o šířce B.w·s uprostřed oblasti),
  // takže se prvky zarovnané k sobě nikdy nerozjedou. Roztahují se jen "stretch"/"scale".
  if (ax !== "stretch" && ax !== "scale") {
    const colW = B.w * s;
    const colX = R.x + (R.w - colW) / 2;
    const [y, h] = axis(f.y, f.h, B.h, R.h, s, ay);
    return { frame: { x: colX + f.x * s, y: R.y + y, w: f.w * s, h }, s };
  }
  const [x, w] = axis(f.x, f.w, B.w, R.w, s, ax);
  const [y, h] = axis(f.y, f.h, B.h, R.h, s, ay);
  return { frame: { x: R.x + x, y: R.y + y, w, h }, s };
}

export function templateHasHero(t: Template) {
  return t.elements.some((e) => e.zone === "hero");
}

/** Hlavní pravidlo: kde leží prvek v cílovém formátu. */
export function resolveElement(el: TemplateElement, t: Template, format: FormatId): Resolved {
  const base = FORMATS[t.baseFormat];
  const target = FORMATS[format];
  const explicit = el.frames?.[format];
  if (explicit) {
    return { frame: explicit, s: Math.min(target.w / base.w, target.h / base.h) };
  }
  if (format === t.baseFormat) return { frame: { ...el.frame }, s: 1 };

  const B = { w: base.w, h: base.h };
  let region: Region = { x: 0, y: 0, w: target.w, h: target.h };
  let ax = el.anchorX ?? autoAnchorX(el.frame, base.w);
  let ay = el.anchorY ?? autoAnchorY(el.frame, base.h);

  // Na šířku: fotka doleva, obsah doprava (skutečné přeskupení, ne jen změna velikosti)
  if (isLandscape(format) && !isLandscape(t.baseFormat)) {
    const zone = el.zone ?? "content";
    const split = templateHasHero(t) ? Math.round(target.w * 0.46) : 0;
    if (zone === "bg") {
      region = { x: 0, y: 0, w: target.w, h: target.h };
      if (el.frame.w >= base.w * 0.9) ax = "stretch";
      if (el.frame.h >= base.h * 0.9) ay = "stretch";
      // pozadí roztáhnout proporčně, aby ho nic neodkrylo
      if (ax !== "stretch") ax = "scale";
      if (ay !== "stretch") ay = "scale";
    } else if (zone === "hero") {
      region = { x: 0, y: 0, w: split || target.w, h: target.h };
      ax = "stretch";
      ay = "stretch";
      // fotka hráče vyplní levou část, její rám se přizpůsobí oblasti
      return { frame: { x: region.x, y: region.y, w: region.w, h: region.h }, s: Math.min(region.w / B.w, region.h / B.h) };
    } else if (split) {
      const pad = Math.round(target.w * 0.02);
      region = { x: split + pad, y: 0, w: target.w - split - pad, h: target.h };
    }
  }
  return constrain(el.frame, B, region, ax, ay);
}

/** Rozložení řádků seznamu – řádky se nikdy nepřekryjí ani nepřetečou. */
export function layoutList(
  frame: Frame,
  baseW: number,
  rowHeight: number,
  gap: number,
  count: number,
  distribute: boolean,
): { rows: Frame[]; k: number } {
  if (count <= 0) return { rows: [], k: 1 };
  let k = frame.w / baseW;
  let rh = rowHeight * k;
  let g = gap * k;
  const need = count * rh + (count - 1) * g;
  if (need > frame.h) {
    const f = frame.h / need;
    k *= f;
    rh *= f;
    g *= f;
  }
  let total = count * rh + (count - 1) * g;
  let y0 = frame.y;
  if (distribute && count > 1) {
    const free = frame.h - total;
    // rozdělit volné místo mezi mezery, ale max. 1.5× výšky řádku navíc
    const extra = Math.min(free / (count - 1), rh * 0.6);
    g += extra;
    total = count * rh + (count - 1) * g;
    y0 = frame.y + (frame.h - total) / 2;
  } else if (distribute) {
    y0 = frame.y + (frame.h - total) / 2;
  }
  const rows: Frame[] = [];
  for (let i = 0; i < count; i++) rows.push({ x: frame.x, y: y0 + i * (rh + g), w: frame.w, h: rh });
  return { rows, k };
}

export function framesOverlap(a: Frame, b: Frame) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Mřížka dlaždic (série zápasů): zmenší se, aby se vešla, řádky i poslední neúplný řádek na střed. */
export function layoutGrid(frame: Frame, cols: number, tileW: number, tileH: number, gapX: number, gapY: number, count: number): { rows: Frame[]; k: number } {
  if (count <= 0) return { rows: [], k: 1 };
  const c = Math.max(1, Math.min(cols, count));
  const lines = Math.ceil(count / c);
  const needW = c * tileW + (c - 1) * gapX;
  const needH = lines * tileH + (lines - 1) * gapY;
  const k = Math.min(frame.w / needW, frame.h / needH, frame.w / (cols * tileW + (cols - 1) * gapX) * 1.6);
  const tw = tileW * k, th = tileH * k, gx = gapX * k, gy = gapY * k;
  const y0 = frame.y + (frame.h - (lines * th + (lines - 1) * gy)) / 2;
  const out: Frame[] = [];
  for (let i = 0; i < count; i++) {
    const line = Math.floor(i / c);
    const inLine = line === lines - 1 ? count - line * c : c;
    const lw = inLine * tw + (inLine - 1) * gx;
    const x0 = frame.x + (frame.w - lw) / 2;
    out.push({ x: x0 + (i - line * c) * (tw + gx), y: y0 + line * (th + gy), w: tw, h: th });
  }
  return { rows: out, k };
}
