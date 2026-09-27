// ─────────────────────────────────────────────────────────────
// Import SVG (Affinity: Soubor → Exportovat → SVG) na šablonu.
// Texty zůstanou textem (pole formuláře), ostatní vrstvy se vykreslí
// jako obrázky i s přechody, maskami a efekty, které SVG umí.
// ─────────────────────────────────────────────────────────────
import { FONT_LIBRARY, parseFontName } from "./fonts";
import { FORMATS, FORMAT_ORDER } from "./formats";
import type { PsdImportResult } from "./psd-import";
import { uid } from "./store";
import { normalize } from "./template-string";
import type { Asset, DataRecord, FieldDef, FormatId, ImageElement, Template, TemplateElement, TextElement } from "./types";

const SKIP = new Set(["defs", "style", "title", "desc", "metadata", "clipPath", "mask", "linearGradient", "radialGradient", "pattern", "filter", "symbol", "marker", "script"]);
const GROUPS = new Set(["g", "svg", "a", "switch"]);
const PHOTO_RE = /^(dsc|img|_mg|foto|fotka|photo|hrac|hráč|player|pxl)|\.(jpe?g|heic)$/i;

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

function layerName(el: Element, fallback: string) {
  return (el.getAttribute("serif:id") || el.getAttributeNS("http://www.serif.com/", "id") || el.getAttribute("id") || el.getAttribute("inkscape:label") || fallback).replace(/_/g, " ").trim();
}

function hasText(el: Element) {
  return el.tagName === "text" || !!el.querySelector("text");
}

function toHex(color: string) {
  const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(color);
  if (!m) return color && color !== "none" ? color : "#FFFFFF";
  return "#" + [m[1], m[2], m[3]].map((v) => Math.round(Number(v)).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function loadImg(url: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("SVG se nepodařilo vykreslit."));
    i.src = url;
  });
}

export async function importSvg(file: File, projectId: string, opts: { textToFields: boolean }): Promise<PsdImportResult> {
  const src = await file.text();
  const doc = new DOMParser().parseFromString(src, "image/svg+xml");
  const root0 = doc.documentElement;
  if (root0.tagName !== "svg") throw new Error("Soubor není platné SVG.");

  // rozměry dokumentu
  const vb = (root0.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  const W = vb.length === 4 && vb[2] ? vb[2] : parseFloat(root0.getAttribute("width") ?? "1080");
  const H = vb.length === 4 && vb[3] ? vb[3] : parseFloat(root0.getAttribute("height") ?? "1350");
  const VX = vb.length === 4 ? vb[0] : 0;
  const VY = vb.length === 4 ? vb[1] : 0;
  const base = bestFormat(W, H);
  const F = FORMATS[base];
  const kx = F.w / W;
  const ky = F.h / H;

  // připojit do stránky (kvůli měření)
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none";
  const svg = document.importNode(root0, true) as unknown as SVGSVGElement;
  svg.setAttribute("width", String(W));
  svg.setAttribute("height", String(H));
  svg.setAttribute("viewBox", `${VX} ${VY} ${W} ${H}`);
  svg.style.visibility = "visible";
  host.appendChild(svg);
  document.body.appendChild(host);

  const elements: TemplateElement[] = [];
  const assets: Asset[] = [];
  const fields: FieldDef[] = [];
  const sample: DataRecord = {};
  const used = new Set<string>();
  const missing = new Set<string>();
  const warnings: string[] = [];
  let texts = 0;
  let images = 0;
  let count = 0;

  try {
    const rootBox = svg.getBoundingClientRect();
    const toUser = (r: DOMRect) => ({ x: r.left - rootBox.left + VX, y: r.top - rootBox.top + VY, w: r.width, h: r.height });

    // vykreslí jeden prvek (se všemi předky kvůli transformacím a průhlednosti)
    const rasterize = async (el: Element, name: string) => {
      const r = toUser(el.getBoundingClientRect());
      if (r.w < 0.5 && r.h < 0.5) return;
      const imgLike = el.tagName === "image" || el.tagName === "use" || (el.querySelectorAll("image,use").length === 1 && el.querySelectorAll("path,rect,circle,ellipse,polygon,text").length === 0);
      const pad = imgLike ? 0 : Math.max(4, Math.max(r.w, r.h) * 0.04);
      // ořez na plochu dokumentu (mimo plátno se nic nevykresluje)
      const x0 = Math.max(VX, r.x - pad);
      const y0 = Math.max(VY, r.y - pad);
      const x1 = Math.min(VX + W, r.x + r.w + pad);
      const y1 = Math.min(VY + H, r.y + r.h + pad);
      if (x1 - x0 < 0.5 || y1 - y0 < 0.5) return;
      const box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      el.setAttribute("data-pk", "1");
      const clone = svg.cloneNode(true) as SVGSVGElement;
      el.removeAttribute("data-pk");
      clone.style.visibility = "hidden";
      clone.setAttribute("visibility", "hidden");
      const target = clone.querySelector('[data-pk="1"]')!;
      target.setAttribute("visibility", "visible");
      (target as SVGElement).style.visibility = "visible";
      target.removeAttribute("data-pk");
      const scale = Math.min(2 * kx, 4096 / Math.max(box.w, box.h));
      const pw = Math.max(1, Math.round(box.w * scale));
      const ph = Math.max(1, Math.round(box.h * scale));
      clone.setAttribute("viewBox", `${box.x} ${box.y} ${box.w} ${box.h}`);
      clone.setAttribute("width", String(pw));
      clone.setAttribute("height", String(ph));
      clone.removeAttribute("style");
      clone.setAttribute("visibility", "hidden");
      const xml = new XMLSerializer().serializeToString(clone);
      const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
      try {
        const img = await loadImg(url);
        const c = document.createElement("canvas");
        c.width = pw;
        c.height = ph;
        const x = c.getContext("2d")!;
        x.drawImage(img, 0, 0, pw, ph);
        let dataUrl: string;
        try {
          const d = x.getImageData(0, 0, pw, ph).data;
          let alpha = false;
          const step = Math.max(4, Math.floor(d.length / 4 / 40000) * 4);
          for (let i = 3; i < d.length; i += step) if (d[i] < 250) {
            alpha = true;
            break;
          }
          dataUrl = alpha ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.92);
        } catch {
          throw new Error("Prohlížeč nedovolil převést SVG na obrázek. Zkuste import v Chrome nebo Edge na počítači.");
        }
        images++;
        const a: Asset = { id: uid("a-"), projectId, name, kind: "element", dataUrl, w: pw, h: ph, createdAt: Date.now() };
        assets.push(a);
        const isImage = el.tagName === "image" || el.tagName === "use" || (el.querySelectorAll("image,use").length === 1 && el.querySelectorAll("path,rect,circle,ellipse,polygon,text").length === 0);
        const isPhoto = isImage && PHOTO_RE.test(name) && r.w * r.h > W * H * 0.25;
        const frame = { x: Math.round((box.x - VX) * kx), y: Math.round((box.y - VY) * ky), w: Math.round(box.w * kx), h: Math.round(box.h * ky) };
        let srcRef = `asset:${a.id}`;
        if (isPhoto) {
          const key = slugKey("photo", used);
          fields.push({ key, label: "Fotka", type: "image" });
          sample[key] = { asset: a.id, zoom: 1, fx: 0.5, fy: 0.5 };
          srcRef = `{{${key}}}`;
        }
        elements.push({ id: uid("el-"), name, type: "image", frame, src: srcRef, fit: isPhoto ? "cover" : "contain", fallback: isPhoto ? "placeholder" : "none", zone: isPhoto ? "hero" : undefined } as ImageElement);
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    const addText = (el: SVGTextElement, name: string) => {
      const cs = getComputedStyle(el);
      // řádky podle y (text + tspany)
      const lineList: string[] = [];
      let cur = "";
      let lastY = el.getAttribute("y");
      const visit = (n: Node) => {
        for (const c of Array.from(n.childNodes)) {
          if (c.nodeType === 3) cur += c.textContent ?? "";
          else if ((c as Element).tagName === "tspan") {
            const y = (c as Element).getAttribute("y");
            if (y !== null && lastY !== null && y !== lastY && cur.trim()) {
              lineList.push(cur);
              cur = "";
            }
            if (y !== null) lastY = y;
            visit(c);
          }
        }
      };
      visit(el);
      if (cur) lineList.push(cur);
      let content = lineList.join("\n");
      const spans = Array.from(el.querySelectorAll("tspan"));
      content = content.replace(/\s+\n/g, "\n").trim();
      if (!content) return;
      texts++;
      const ctm = el.getCTM();
      const scaleY = ctm ? Math.hypot(ctm.c, ctm.d) : 1;
      const size = Math.max(6, Math.round(parseFloat(cs.fontSize || "40") * scaleY * ky));
      const famRaw = (cs.fontFamily || "Barlow").split(",")[0].replace(/["']/g, "").trim();
      const pf = parseFontName(famRaw);
      const cw = parseInt(cs.fontWeight || "400", 10);
      const weight = pf.weight !== 400 ? pf.weight : Number.isFinite(cw) ? cw : 400;
      const italic = pf.italic || cs.fontStyle === "italic";
      if (!FONT_LIBRARY.some((f) => f.family === pf.family)) missing.add(pf.family);
      const anchor = el.getAttribute("text-anchor") || cs.getPropertyValue("text-anchor") || spans[0]?.getAttribute("text-anchor") || "start";
      const align: TextElement["align"] = anchor === "middle" ? "center" : anchor === "end" ? "right" : "left";
      const r = toUser(el.getBoundingClientRect());
      const frame = { x: (r.x - VX) * kx, y: (r.y - VY) * ky, w: r.w * kx, h: r.h * ky };
      const padW = frame.w * 0.3 + size * 0.5;
      const f2 = { x: frame.x, y: frame.y - frame.h * 0.15, w: frame.w + padW, h: frame.h * 1.3 };
      if (align === "center") f2.x -= padW / 2;
      if (align === "right") f2.x -= padW;
      let opacity = 1;
      for (let p: Element | null = el; p && p !== svg; p = p.parentElement) opacity *= parseFloat(getComputedStyle(p).opacity || "1");
      const lines = content.split("\n").length;
      let text = content;
      if (opts.textToFields) {
        const key = slugKey(name && !/^(text|layer|vrstva|group)/i.test(name) ? name : content.slice(0, 20), used);
        fields.push({ key, label: name && name.length < 40 ? name : content.slice(0, 30), type: lines > 1 ? "longtext" : "text" });
        sample[key] = content;
        text = `{{${key}}}`;
      }
      const ls = parseFloat(cs.letterSpacing);
      elements.push({
        id: uid("el-"),
        name: name || content.slice(0, 24),
        type: "text",
        frame: { x: Math.round(f2.x), y: Math.round(f2.y), w: Math.round(f2.w), h: Math.round(f2.h) },
        text,
        font: pf.family,
        weight,
        italic,
        size,
        minSize: Math.round(size * 0.4),
        color: toHex(cs.fill),
        align,
        valign: "middle",
        maxLines: lines,
        lineHeight: lines > 1 ? 1.05 : 1,
        letterSpacing: Number.isFinite(ls) && ls ? ls / parseFloat(cs.fontSize || "40") : undefined,
        opacity: opacity < 0.999 ? Math.round(opacity * 100) / 100 : undefined,
      } as TextElement);
    };

    const walk = async (parent: Element, parentName = "") => {
      const kids = Array.from(parent.children).filter((c) => !SKIP.has(c.tagName));
      for (const el of Array.from(parent.children)) {
        const tag = el.tagName;
        if (SKIP.has(tag)) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none") continue;
        const own = layerName(el, "");
        const name = own || (kids.length === 1 ? parentName : "") || (tag === "text" ? "" : tag === "image" ? "Obrázek" : "Vrstva");
        if (tag === "text") {
          count++;
          addText(el as SVGTextElement, name);
        } else if (GROUPS.has(tag) && hasText(el)) {
          await walk(el, own || (kids.length === 1 ? parentName : ""));
        } else {
          count++;
          await rasterize(el, name);
        }
      }
    };
    await walk(svg);
  } finally {
    host.remove();
  }

  if (!texts) warnings.push("V SVG nejsou žádné texty – pravděpodobně byly při exportu převedeny na křivky. V Affinity při exportu SVG vypněte „Převést text na křivky“.");

  const now = Date.now();
  const template: Template = {
    id: uid("t-"),
    projectId,
    name: file.name.replace(/\.svg$/i, ""),
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
