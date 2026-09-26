// ─────────────────────────────────────────────────────────────
// Import PSD (Photoshop / Affinity → Export → PSD) na šablonu.
// Každá vrstva = prvek na stejném místě. Textové vrstvy se stanou
// poli formuláře, fotky (DSC…, foto…) polem pro fotku.
// ─────────────────────────────────────────────────────────────
import { FONT_LIBRARY, parseFontName } from "./fonts";
import { FORMATS, FORMAT_ORDER } from "./formats";
import { uid } from "./store";
import type { Asset, DataRecord, FieldDef, FormatId, ImageElement, Template, TemplateElement, TextElement } from "./types";
import { normalize } from "./template-string";

type PsdColor = { r?: number; g?: number; b?: number; fr?: number; fg?: number; fb?: number };
interface PsdLayer {
  name?: string;
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
  opacity?: number;
  hidden?: boolean;
  clipping?: boolean;
  blendMode?: string;
  canvas?: HTMLCanvasElement;
  children?: PsdLayer[];
  effects?: { disabled?: boolean } & Record<string, unknown>;
  mask?: { top?: number; left?: number; bottom?: number; right?: number; defaultColor?: number; disabled?: boolean; canvas?: HTMLCanvasElement };
  text?: {
    text: string;
    transform?: number[];
    style?: { font?: { name: string }; fontSize?: number; fillColor?: PsdColor; tracking?: number; fauxBold?: boolean; fauxItalic?: boolean };
    paragraphStyle?: { justification?: string };
  };
}

export interface PsdImportResult {
  template: Template;
  assets: Asset[];
  report: { layers: number; texts: number; images: number; fields: number; missingFonts: string[]; warnings: string[] };
}

const hex = (c?: PsdColor) => {
  if (!c) return "#FFFFFF";
  const r = c.r ?? Math.round((c.fr ?? 1) * 255);
  const g = c.g ?? Math.round((c.fg ?? 1) * 255);
  const b = c.b ?? Math.round((c.fb ?? 1) * 255);
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
};

function bestFormat(w: number, h: number): FormatId {
  const r = w / h;
  return FORMAT_ORDER.reduce((best, f) => (Math.abs(FORMATS[f].w / FORMATS[f].h - r) < Math.abs(FORMATS[best].w / FORMATS[best].h - r) ? f : best), "ig_portrait" as FormatId);
}

function slugKey(s: string, used: Set<string>) {
  let k = normalize(s).replace(/\s+/g, "_").slice(0, 24) || "text";
  if (/^\d/.test(k)) k = "t_" + k;
  let n = k;
  let i = 2;
  while (used.has(n)) n = `${k}_${i++}`;
  used.add(n);
  return n;
}

/** Vrstva + maska → PNG/JPEG dataURL */
function layerImage(l: PsdLayer): { url: string; w: number; h: number } | null {
  const c = l.canvas;
  if (!c || !c.width || !c.height) return null;
  let src: HTMLCanvasElement = c;
  const m = l.mask;
  if (m?.canvas && !m.disabled) {
    const out = document.createElement("canvas");
    out.width = c.width;
    out.height = c.height;
    const x = out.getContext("2d")!;
    // maska: šedá → alfa
    const mc = document.createElement("canvas");
    mc.width = c.width;
    mc.height = c.height;
    const mx = mc.getContext("2d")!;
    const def = m.defaultColor ?? 0;
    mx.fillStyle = `rgb(${def},${def},${def})`;
    mx.fillRect(0, 0, mc.width, mc.height);
    mx.drawImage(m.canvas, (m.left ?? 0) - (l.left ?? 0), (m.top ?? 0) - (l.top ?? 0));
    const md = mx.getImageData(0, 0, mc.width, mc.height);
    for (let i = 0; i < md.data.length; i += 4) {
      md.data[i + 3] = md.data[i];
    }
    mx.putImageData(md, 0, 0);
    x.drawImage(c, 0, 0);
    x.globalCompositeOperation = "destination-in";
    x.drawImage(mc, 0, 0);
    src = out;
  }
  // průhlednost? → PNG, jinak JPEG (menší)
  const d = src.getContext("2d")!.getImageData(0, 0, src.width, src.height).data;
  let alpha = false;
  const step = Math.max(4, Math.floor(d.length / 4 / 40000) * 4);
  for (let i = 3; i < d.length; i += step) if (d[i] < 250) {
    alpha = true;
    break;
  }
  return { url: alpha ? src.toDataURL("image/png") : src.toDataURL("image/jpeg", 0.92), w: src.width, h: src.height };
}

const PHOTO_RE = /^(dsc|img|_mg|foto|fotka|photo|hrac|hráč|player|pxl|screenshot)|\.(jpe?g|heic)$/i;

export async function importPsd(file: File, projectId: string, opts: { textToFields: boolean }): Promise<PsdImportResult> {
  const { readPsd } = await import("ag-psd");
  const buf = await file.arrayBuffer();
  const psd = readPsd(buf, { skipThumbnail: true, skipCompositeImageData: true }) as unknown as { width: number; height: number; children?: PsdLayer[] };
  const base = bestFormat(psd.width, psd.height);
  const F = FORMATS[base];
  const kx = F.w / psd.width;
  const ky = F.h / psd.height;
  const k = Math.min(kx, ky);

  const elements: TemplateElement[] = [];
  const assets: Asset[] = [];
  const fields: FieldDef[] = [];
  const sample: DataRecord = {};
  const usedKeys = new Set<string>();
  const missing = new Set<string>();
  const warnings: string[] = [];
  let texts = 0;
  let images = 0;
  let count = 0;
  let fx = 0;
  let clipped = 0;
  let blends = 0;

  const walk = (layers: PsdLayer[], hidden: boolean, opacity: number, path: string) => {
    for (const l of layers) {
      const name = (l.name ?? "Vrstva").trim();
      const hid = hidden || !!l.hidden;
      const op = opacity * (l.opacity ?? 1);
      if (l.children) {
        walk(l.children, hid, op, path ? `${path} / ${name}` : name);
        continue;
      }
      count++;
      if (l.effects && !l.effects.disabled && Object.keys(l.effects).some((kk) => kk !== "disabled" && kk !== "scale")) fx++;
      if (l.clipping) clipped++;
      if (l.blendMode && !["normal", "pass through"].includes(l.blendMode)) blends++;
      const left = l.left ?? 0;
      const top = l.top ?? 0;
      const w = (l.right ?? 0) - left;
      const h = (l.bottom ?? 0) - top;
      const frame = { x: Math.round(left * kx), y: Math.round(top * ky), w: Math.max(2, Math.round(w * kx)), h: Math.max(2, Math.round(h * ky)) };
      const id = uid("el-");

      if (l.text && l.text.text.trim()) {
        texts++;
        const t = l.text;
        const content = t.text.replace(/\r\n?/g, "\n").replace(/\u0003/g, "\n").trim();
        const lines = content.split("\n").length;
        const st = t.style ?? {};
        const scaleY = t.transform ? Math.hypot(t.transform[2] ?? 0, t.transform[3] ?? 1) : 1;
        const size = Math.max(6, Math.round((st.fontSize ?? 40) * scaleY * k));
        const pf = parseFontName(st.font?.name ?? "Barlow-Regular");
        if (!FONT_LIBRARY.some((f) => f.family === pf.family)) missing.add(pf.family);
        const just = t.paragraphStyle?.justification ?? "left";
        const align: TextElement["align"] = just.includes("center") ? "center" : just.includes("right") ? "right" : "left";
        // chybějící rozměry textové vrstvy (některé exporty) → odhad z polohy a velikosti písma
        if (frame.w < 4 || frame.h < 4) {
          const tx = (t.transform?.[4] ?? left) * kx;
          const ty = (t.transform?.[5] ?? top) * ky;
          const c = document.createElement("canvas").getContext("2d")!;
          c.font = `700 ${size}px "Arial Narrow", Arial, sans-serif`;
          const longest = content.split("\n").reduce((a, b) => (b.length > a.length ? b : a), "");
          const tw = Math.round(c.measureText(longest).width * 0.85);
          const th = Math.round(size * 0.75 + (lines - 1) * size * 1.05);
          frame.w = tw;
          frame.h = th;
          frame.x = Math.round(just.includes("center") ? tx - tw / 2 : just.includes("right") ? tx - tw : tx);
          frame.y = Math.round(ty - size * 0.75);
        }
        // rám s rezervou – renderer text vždy vejde do rámu
        const padW = frame.w * 0.25 + size * 0.5;
        const f2 = { ...frame, y: Math.round(frame.y - frame.h * 0.18), h: Math.round(frame.h * 1.36) };
        if (align === "left") f2.w = Math.round(frame.w + padW);
        else if (align === "right") {
          f2.x = Math.round(frame.x - padW);
          f2.w = Math.round(frame.w + padW);
        } else {
          f2.x = Math.round(frame.x - padW / 2);
          f2.w = Math.round(frame.w + padW);
        }
        let text = content;
        if (opts.textToFields) {
          const key = slugKey(name && !/^(text|textov|layer|vrstva)/i.test(name) ? name : content.slice(0, 20), usedKeys);
          fields.push({ key, label: name.length > 40 ? content.slice(0, 30) : name, type: lines > 1 ? "longtext" : "text" });
          sample[key] = content;
          text = `{{${key}}}`;
        }
        elements.push({
          id,
          name,
          type: "text",
          frame: f2,
          text,
          font: pf.family,
          weight: st.fauxBold ? Math.max(700, pf.weight) : pf.weight,
          italic: pf.italic || !!st.fauxItalic,
          size,
          minSize: Math.round(size * 0.4),
          color: hex(st.fillColor),
          align,
          valign: "middle",
          maxLines: Math.max(1, lines),
          lineHeight: lines > 1 ? 1.05 : 1,
          letterSpacing: st.tracking ? st.tracking / 1000 : undefined,
          hidden: hid || undefined,
          opacity: op < 0.999 ? Math.round(op * 100) / 100 : undefined,
        } as TextElement);
        continue;
      }

      const img = layerImage(l);
      if (!img) continue;
      images++;
      const asset: Asset = { id: uid("a-"), projectId, name: name || "Vrstva", kind: "element", dataUrl: img.url, w: img.w, h: img.h, createdAt: Date.now() };
      assets.push(asset);
      const isPhoto = PHOTO_RE.test(name) && w * h > psd.width * psd.height * 0.25;
      let src = `asset:${asset.id}`;
      if (isPhoto) {
        const key = slugKey("photo", usedKeys);
        fields.push({ key, label: "Fotka", type: "image" });
        sample[key] = { asset: asset.id, zoom: 1, fx: 0.5, fy: 0.5 };
        src = `{{${key}}}`;
      }
      elements.push({
        id,
        name,
        type: "image",
        frame,
        src,
        fit: isPhoto ? "cover" : "contain",
        fallback: isPhoto ? "placeholder" : "none",
        zone: isPhoto ? "hero" : undefined,
        hidden: hid || undefined,
        opacity: op < 0.999 ? Math.round(op * 100) / 100 : undefined,
      } as ImageElement);
    }
  };
  walk(psd.children ?? [], false, 1, "");

  if (fx) warnings.push(`${fx} vrstev má efekty (stín, obrys, překrytí vzorem…). Efekty se nepřenášejí – takovou vrstvu vyexportujte jako PNG a vyměňte obrázek v editoru.`);
  if (clipped) warnings.push(`${clipped} vrstev je ořezových (clipping mask). Importují se jako samostatné obrázky.`);
  if (blends) warnings.push(`${blends} vrstev používá jiný režim prolnutí než Normální – zobrazí se normálně.`);
  if (Math.abs(psd.width / psd.height - F.w / F.h) > 0.02) warnings.push(`Rozměr ${psd.width}×${psd.height} se přizpůsobil formátu ${F.w}×${F.h}.`);

  const now = Date.now();
  const template: Template = {
    id: uid("t-"),
    projectId,
    name: file.name.replace(/\.psd$/i, ""),
    category: "Import",
    description: `Importováno z ${file.name}`,
    baseFormat: base,
    formats: [...FORMAT_ORDER],
    background: "#000000",
    elements,
    fields,
    sampleData: sample,
    createdAt: now,
    updatedAt: now,
  };
  return { template, assets, report: { layers: count, texts, images, fields: fields.length, missingFonts: [...missing], warnings } };
}
