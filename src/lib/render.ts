// ─────────────────────────────────────────────────────────────
// RENDERER: (šablona + data + brand kit + formát) → canvas
// Běží v prohlížeči, výstup má přesně rozměr formátu (× scale).
// ─────────────────────────────────────────────────────────────
import { resolveColor, readableOn } from "./color";
import { fontStack, loadFonts, registerCustomFont, registerFamilies } from "./fonts";
import { FORMATS } from "./formats";
import { loadImage } from "./images";
import { constrain, autoAnchorX, layoutList, resolveElement } from "./layout";
import { findTeam, getValue, interpolate, isEmptyValue, type RenderContext } from "./template-string";
import type {
  BrandKit,
  DataRecord,
  Fill,
  FormatId,
  Frame,
  ImageElement,
  ImageValue,
  ListElement,
  Team,
  Template,
  TemplateElement,
  TextElement,
} from "./types";

export interface RenderEnv {
  template: Template;
  data: DataRecord;
  format: FormatId;
  brand: BrandKit;
  teams: Team[];
  /** asset id → dataURL */
  assets: Record<string, string>;
  page?: number;
  pages?: number;
  /** v editoru ukázat šrafované místo pro chybějící fotky */
  placeholders?: boolean;
  /** editor šablon – ukázat i prázdné sloty pro vlastní obrázky */
  editor?: boolean;
}

export interface HitBox {
  id: string;
  frame: Frame;
  rotation?: number;
}

type Images = Map<string, HTMLImageElement | null>;

// ── zdroje obrázků ───────────────────────────────────────────

interface ImgRef {
  url?: string;
  value?: ImageValue;
  team?: Team;
  teamName?: string;
}

function assetUrl(env: RenderEnv, idOrUrl: string | undefined): string | undefined {
  if (!idOrUrl) return undefined;
  if (/^(data:|blob:|https?:|\/)/.test(idOrUrl)) return idOrUrl;
  return env.assets[idOrUrl];
}

function resolveImage(el: ImageElement, env: RenderEnv, ctx: RenderContext): ImgRef {
  const src = el.src.trim();
  if (src.startsWith("team:")) {
    const name = interpolate(src.slice(5), ctx);
    const team = findTeam(env.teams, name);
    return { team, teamName: name, url: team?.logo ? assetUrl(env, team.logo) : undefined };
  }
  if (src.startsWith("brand:")) {
    const k = src.slice(6);
    if (k === "logo") return { url: assetUrl(env, env.brand.logo) };
    if (k === "logoAlt") return { url: assetUrl(env, env.brand.logoAlt ?? env.brand.logo) };
    if (k === "partner") return { url: assetUrl(env, env.brand.partnerLogo) };
    const m = /^bg(\d+)$/.exec(k);
    if (m) return { url: assetUrl(env, env.brand.backgrounds[+m[1]]) };
    const e = /^el(\d+)$/.exec(k);
    if (e) return { url: assetUrl(env, env.brand.elements[+e[1]]) };
    return {};
  }
  if (src.startsWith("asset:")) return { url: assetUrl(env, src.slice(6)) };
  const m = /^\{\{([^}|]+)\}\}$/.exec(src);
  if (m) {
    const v = getValue(ctx, m[1]);
    if (v && typeof v === "object" && !Array.isArray(v) && "asset" in v) {
      const iv = v as ImageValue;
      return { value: iv, url: assetUrl(env, iv.asset) };
    }
    if (typeof v === "string" && v) return { url: assetUrl(env, v) };
    return {};
  }
  return { url: assetUrl(env, src) };
}

// ── průchod prvky (včetně řádků seznamů) ─────────────────────

function baseContext(env: RenderEnv): RenderContext {
  return { data: env.data, teams: env.teams, page: env.page, pages: env.pages };
}

function listRows(el: ListElement, env: RenderEnv): Record<string, unknown>[] {
  const v = env.data[el.field];
  let rows = Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
  const p = env.template.paginate;
  if (p && p.field === el.field) {
    const page = (env.page ?? 1) - 1;
    rows = rows.slice(page * p.perPage, page * p.perPage + p.perPage);
  }
  if (el.maxRows) rows = rows.slice(0, el.maxRows);
  return rows;
}

function isVisible(el: TemplateElement, env: RenderEnv, ctx: RenderContext) {
  if (el.hidden) return false;
  if (el.hideIn?.includes(env.format)) return false;
  if (el.showIf) {
    const v = getValue(ctx, el.showIf);
    if (isEmptyValue(v)) return false;
  }
  return true;
}

function collect(env: RenderEnv) {
  const urls = new Set<string>();
  const fonts = new Set<string>();
  const visit = (el: TemplateElement, ctx: RenderContext) => {
    if (!isVisible(el, env, ctx)) return;
    if (el.type === "image") {
      const r = resolveImage(el, env, ctx);
      if (r.url) urls.add(r.url);
      if (r.team || el.fallback === "monogram") fonts.add(`400 60px ${fontStack(env.brand.fonts.display.family)}`);
    } else if (el.type === "text") {
      const iu = iconUrl(el, env, ctx);
      if (iu) urls.add(iu);
      const fam = fontFamily(el, env.brand);
      fonts.add(`${el.italic ? "italic " : ""}${el.weight ?? 400} 60px ${fontStack(fam)}`);
    } else if (el.type === "list") {
      listRows(el, env).forEach((row, i) => {
        el.children.forEach((c) => visit(c, { ...ctx, row, rowIndex: i }));
      });
    }
  };
  const ctx = baseContext(env);
  env.template.elements.forEach((e) => visit(e, ctx));
  return { urls: [...urls], fonts: [...fonts] };
}

/** Načte fonty a obrázky, které grafika potřebuje. */
export async function prepare(env: RenderEnv): Promise<Images> {
  const fontsToRegister = [env.brand.fonts.display, env.brand.fonts.body, env.brand.fonts.accent].filter((f) => f.asset);
  await Promise.all(fontsToRegister.map((f) => registerCustomFont(f.family, assetUrl(env, f.asset) ?? "")));
  const { urls, fonts } = collect(env);
  await registerFamilies([...new Set(fonts.map((f) => /"([^"]+)"/.exec(f)?.[1] ?? ""))].filter(Boolean));
  const [imgs] = await Promise.all([Promise.all(urls.map((u) => loadImage(u).then((i) => [u, i] as const))), loadFonts(fonts)]);
  return new Map(imgs);
}

// ── kreslení ────────────────────────────────────────────────

function fontFamily(el: TextElement, brand: BrandKit) {
  if (el.font === "display" || el.font === "body" || el.font === "accent") return brand.fonts[el.font].family;
  return el.font;
}

function makeFill(ctx: CanvasRenderingContext2D, fill: Fill | undefined, f: Frame, env: RenderEnv, rc: RenderContext) {
  if (!fill) return "transparent";
  if (typeof fill === "string") return resolveColor(fill, env.brand, rc);
  if (fill.type === "radial") {
    const g = ctx.createRadialGradient(f.x + f.w / 2, f.y + f.h / 2, 0, f.x + f.w / 2, f.y + f.h / 2, Math.max(f.w, f.h) / 1.4);
    fill.stops.forEach(([o, c]) => g.addColorStop(o, resolveColor(c, env.brand, rc)));
    return g;
  }
  const a = ((fill.angle ?? 90) * Math.PI) / 180;
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  const len = (Math.abs(f.w * Math.cos(a)) + Math.abs(f.h * Math.sin(a))) / 2;
  const g = ctx.createLinearGradient(cx - Math.cos(a) * len, cy - Math.sin(a) * len, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
  fill.stops.forEach(([o, c]) => g.addColorStop(Math.min(1, Math.max(0, o)), resolveColor(c, env.brand, rc)));
  return g;
}

function roundRectPath(ctx: CanvasRenderingContext2D, f: Frame, r: number) {
  const rr = Math.max(0, Math.min(r, f.w / 2, f.h / 2));
  ctx.beginPath();
  ctx.moveTo(f.x + rr, f.y);
  ctx.arcTo(f.x + f.w, f.y, f.x + f.w, f.y + f.h, rr);
  ctx.arcTo(f.x + f.w, f.y + f.h, f.x, f.y + f.h, rr);
  ctx.arcTo(f.x, f.y + f.h, f.x, f.y, rr);
  ctx.arcTo(f.x, f.y, f.x + f.w, f.y, rr);
  ctx.closePath();
}

function applyShadow(ctx: CanvasRenderingContext2D, el: TemplateElement, s: number, env: RenderEnv, rc: RenderContext) {
  if (!el.shadow) return;
  ctx.shadowColor = resolveColor(el.shadow.color, env.brand, rc);
  ctx.shadowBlur = el.shadow.blur * s;
  ctx.shadowOffsetX = el.shadow.x * s;
  ctx.shadowOffsetY = el.shadow.y * s;
}

// Text ───────────────────────────────────────────────────────

interface Run {
  text: string;
  hl: boolean;
}

/** "Adele [exkluzivně] v Praze" → runy se zvýrazněním */
function parseRuns(text: string, highlight: boolean): Run[] {
  if (!highlight) return [{ text, hl: false }];
  const out: Run[] = [];
  const re = /\[([^\]]*)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), hl: false });
    out.push({ text: m[1], hl: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), hl: false });
  return out;
}

interface Word {
  text: string;
  hl: boolean;
  icon?: boolean;
  w: number;
  space: boolean; // mezera před slovem
}

function measure(ctx: CanvasRenderingContext2D, t: string, ls: number) {
  if (!ls) return ctx.measureText(t).width;
  let w = 0;
  for (const ch of t) w += ctx.measureText(ch).width + ls;
  return w - ls;
}

function drawSpaced(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, ls: number, stroke?: boolean) {
  if (!ls) {
    if (stroke) ctx.strokeText(t, x, y);
    else ctx.fillText(t, x, y);
    return;
  }
  let cx = x;
  for (const ch of t) {
    if (stroke) ctx.strokeText(ch, cx, y);
    else ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + ls;
  }
}

function wrap(words: Word[], maxW: number, spaceW: number): Word[][] {
  const lines: Word[][] = [];
  let cur: Word[] = [];
  let w = 0;
  for (const word of words) {
    if (word.text === "\n") {
      lines.push(cur);
      cur = [];
      w = 0;
      continue;
    }
    const add = (cur.length && word.space ? spaceW : 0) + word.w;
    if (cur.length && w + add > maxW) {
      lines.push(cur);
      cur = [{ ...word, space: false }];
      w = word.w;
    } else {
      cur.push(cur.length ? word : { ...word, space: false });
      w += cur.length === 1 ? word.w : add;
    }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

function lineWidth(line: Word[], spaceW: number) {
  return line.reduce((a, w, i) => a + w.w + (i && w.space ? spaceW : 0), 0);
}

function iconUrl(el: TextElement, env: RenderEnv, rc: RenderContext) {
  if (!el.icon?.src) return undefined;
  return resolveImage({ id: "icon", name: "icon", type: "image", frame: el.frame, src: el.icon.src } as ImageElement, env, rc).url;
}

function drawText(ctx: CanvasRenderingContext2D, el: TextElement, frame: Frame, s: number, env: RenderEnv, rc: RenderContext, images?: Images) {
  let content = interpolate(el.text, rc);
  if (el.uppercase) content = content.toLocaleUpperCase("cs-CZ");
  if (!content.trim()) return;
  const family = fontFamily(el, env.brand);
  const weight = el.weight ?? 400;
  const style = el.italic ? "italic " : "";
  const lsEm = el.letterSpacing ?? 0;
  const lhMul = el.lineHeight ?? 1.05;
  const padX = el.pill ? el.pill.padX * s : 0;
  const padY = el.pill ? el.pill.padY * s : 0;

  // svislý text – prohodíme osy
  const box: Frame = el.vertical ? { x: 0, y: 0, w: frame.h, h: frame.w } : { x: 0, y: 0, w: frame.w, h: frame.h };
  const availW = Math.max(4, box.w - padX * 2);
  const availH = Math.max(4, box.h - padY * 2);
  const maxLines = el.maxLines ?? 3;

  const runs = parseRuns(content, !!el.highlight);
  const tokens: { text: string; hl: boolean; space: boolean; icon?: boolean }[] = [];
  // ikona před textem (např. vlastní hvězda u hráče zápasu)
  const iUrl = iconUrl(el, env, rc);
  const iconImg = iUrl ? images?.get(iUrl) ?? null : null;
  if (iconImg) tokens.push({ text: "\u2022", hl: false, space: false, icon: true });
  let pendingSpace = false;
  for (const r of runs) {
    const parts = r.text.split(/(\s+)/);
    for (const p of parts) {
      if (!p) continue;
      if (/^\s+$/.test(p)) {
        if (p.includes("\n")) tokens.push({ text: "\n", hl: false, space: false });
        pendingSpace = true;
        continue;
      }
      tokens.push({ text: p, hl: r.hl, space: pendingSpace });
      pendingSpace = false;
    }
  }

  const layoutAt = (size: number) => {
    ctx.font = `${style}${weight} ${size}px ${fontStack(family)}`;
    const ls = lsEm * size;
    const iconW = iconImg ? size * (el.icon?.scale ?? 1) * (iconImg.naturalWidth / iconImg.naturalHeight) + size * (el.icon?.gap ?? 0.2) : 0;
    const words: Word[] = tokens.map((t) => ({ ...t, w: t.icon ? iconW : t.text === "\n" ? 0 : measure(ctx, t.text, ls) }));
    const spaceW = ctx.measureText(" ").width + ls;
    const lines = wrap(words, availW, spaceW);
    const lh = size * lhMul;
    const widest = Math.max(...lines.map((l) => lineWidth(l, spaceW)));
    const fits = lines.length <= maxLines && lines.length * lh - (lh - size) <= availH + 0.5 && widest <= availW + 0.5;
    return { lines, lh, spaceW, ls, fits, widest };
  };

  // binární hledání největší velikosti, která se vejde
  const maxSize = el.size * s;
  const minSize = Math.max(6, (el.minSize ?? el.size * 0.35) * s);
  let size = maxSize;
  let best = layoutAt(maxSize);
  if (!best.fits) {
    let lo = minSize;
    let hi = maxSize;
    size = minSize;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (layoutAt(mid).fits) {
        lo = mid;
        size = mid;
      } else hi = mid;
    }
    best = layoutAt(size);
  }
  let { lines } = best;
  const { lh, spaceW, ls } = best;

  // i na minimální velikosti přetéká → zkrátit poslední řádek (nikdy nepřekrýt jiné prvky)
  const maxFitLines = Math.max(1, Math.min(maxLines, Math.floor((availH + (lh - size)) / lh)));
  if (lines.length > maxFitLines) lines = lines.slice(0, maxFitLines);
  lines = lines.map((line) => {
    let lw = lineWidth(line, spaceW);
    if (lw <= availW + 0.5) return line;
    const l = line.map((w) => ({ ...w }));
    while (l.length && lw > availW) {
      const last = l[l.length - 1];
      if (last.text.length <= 1) {
        l.pop();
      } else {
        last.text = last.text.slice(0, -2) + "…";
        last.w = measure(ctx, last.text, ls);
      }
      lw = lineWidth(l, spaceW);
    }
    return l;
  });

  // cap height pro opticky přesné svislé centrování
  const capH = ctx.measureText("H").actualBoundingBoxAscent || size * 0.7;
  const blockH = lines.length * lh - (lh - capH);
  const widest = Math.max(...lines.map((l) => lineWidth(l, spaceW)));
  const align = el.align ?? "left";
  const valign = el.valign ?? "middle";

  let top = padY;
  if (valign === "middle") top = (box.h - blockH) / 2;
  if (valign === "bottom") top = box.h - padY - blockH;

  ctx.save();
  if (el.vertical) {
    ctx.translate(frame.x, frame.y + frame.h);
    ctx.rotate(-Math.PI / 2);
  } else {
    ctx.translate(frame.x, frame.y);
  }

  // štítek pod textem
  if (el.pill) {
    const pw = widest + padX * 2;
    const ph = blockH + padY * 2;
    let px = 0;
    if (align === "center") px = (box.w - pw) / 2;
    if (align === "right") px = box.w - pw;
    ctx.save();
    applyShadow(ctx, el, s, env, rc);
    ctx.fillStyle = makeFill(ctx, el.pill.fill, { x: px, y: top - padY, w: pw, h: ph }, env, rc);
    roundRectPath(ctx, { x: px, y: top - padY, w: pw, h: ph }, el.pill.radius * s);
    ctx.fill();
    ctx.restore();
  } else {
    applyShadow(ctx, el, s, env, rc);
  }

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const color = resolveColor(el.color, env.brand, rc);
  const hl = el.highlight ? resolveColor(el.highlight, env.brand, rc) : color;
  lines.forEach((line, i) => {
    const lw = lineWidth(line, spaceW);
    let x = padX;
    if (align === "center") x = (box.w - lw) / 2;
    if (align === "right") x = box.w - padX - lw;
    const y = top + capH + i * lh;
    line.forEach((w, j) => {
      if (j && w.space) x += spaceW;
      if (w.icon && iconImg) {
        const ih = size * (el.icon?.scale ?? 1);
        const iw = ih * (iconImg.naturalWidth / iconImg.naturalHeight);
        ctx.save();
        ctx.shadowColor = "transparent";
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(iconImg, x, y - capH / 2 - ih / 2, iw, ih);
        ctx.restore();
        x += w.w;
        return;
      }
      if (el.strokeText) {
        ctx.save();
        ctx.lineJoin = "round";
        ctx.strokeStyle = resolveColor(el.strokeText.color, env.brand, rc);
        ctx.lineWidth = el.strokeText.width * s;
        drawSpaced(ctx, w.text, x, y, ls, true);
        ctx.restore();
      }
      ctx.fillStyle = w.hl ? hl : color;
      drawSpaced(ctx, w.text, x, y, ls);
      x += w.w;
    });
  });
  ctx.restore();
}

// Obrázky ─────────────────────────────────────────────────────

const processed = new Map<string, HTMLCanvasElement>();

function processedImage(img: HTMLImageElement, tint?: string, gray?: boolean): CanvasImageSource {
  if (!tint && !gray) return img;
  const key = `${img.src.length}:${img.src.slice(-64)}:${tint}:${gray}`;
  let c = processed.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const x = c.getContext("2d")!;
  x.drawImage(img, 0, 0);
  if (gray) {
    const d = x.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const l = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
      d.data[i] = d.data[i + 1] = d.data[i + 2] = l;
    }
    x.putImageData(d, 0, 0);
  }
  if (tint) {
    x.globalCompositeOperation = "source-in";
    x.fillStyle = tint;
    x.fillRect(0, 0, c.width, c.height);
  }
  if (processed.size > 60) processed.clear();
  processed.set(key, c);
  return c;
}

function drawMonogram(ctx: CanvasRenderingContext2D, frame: Frame, label: string, color: string, color2: string, env: RenderEnv) {
  const d = Math.min(frame.w, frame.h);
  const cx = frame.x + frame.w / 2;
  const cy = frame.y + frame.h / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = d * 0.06;
  ctx.strokeStyle = color2;
  ctx.beginPath();
  ctx.arc(cx, cy, d / 2 - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();
  const text = label.slice(0, 3).toUpperCase();
  let size = d * 0.46;
  ctx.font = `400 ${size}px ${fontStack(env.brand.fonts.display.family)}`;
  const w = ctx.measureText(text).width;
  if (w > d * 0.7) size *= (d * 0.7) / w;
  ctx.font = `400 ${size}px ${fontStack(env.brand.fonts.display.family)}`;
  ctx.fillStyle = readableOn(color);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + size * 0.04);
  ctx.restore();
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, f: Frame, label: string) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(f.x, f.y, f.w, f.h);
  ctx.clip();
  ctx.fillStyle = "rgba(120,130,150,0.18)";
  ctx.fillRect(f.x, f.y, f.w, f.h);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  for (let i = -f.h; i < f.w; i += 28) {
    ctx.beginPath();
    ctx.moveTo(f.x + i, f.y + f.h);
    ctx.lineTo(f.x + i + f.h, f.y);
    ctx.stroke();
  }
  const size = Math.max(14, Math.min(40, f.w / 10));
  ctx.font = `600 ${size}px "Barlow Condensed", sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, f.x + f.w / 2, f.y + f.h / 2);
  ctx.restore();
}

function drawImage(ctx: CanvasRenderingContext2D, el: ImageElement, frame: Frame, s: number, env: RenderEnv, rc: RenderContext, images: Images) {
  const ref = resolveImage(el, env, rc);
  const img = ref.url ? images.get(ref.url) : null;
  if (!img) {
    if (ref.team || (el.fallback === "monogram" && ref.teamName)) {
      const t = ref.team;
      drawMonogram(ctx, frame, t?.short ?? ref.teamName ?? "?", t?.color ?? env.brand.colors.primary, t?.color2 ?? "#FFFFFF", env);
    } else if (el.fallback === "monogram" && el.src.startsWith("team:")) {
      // bez jména týmu nic
    } else if (env.placeholders && el.fallback !== "none" && (env.editor || /^\{\{/.test(el.src.trim()))) {
      drawPlaceholder(ctx, frame, el.src.startsWith("brand:") ? "LOGO" : el.src.startsWith("asset:") ? el.name.toUpperCase() : "FOTO");
    }
    return;
  }
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const fit = el.fit ?? "cover";
  let dw: number;
  let dh: number;
  let dx: number;
  let dy: number;
  if (fit === "contain") {
    const k = Math.min(frame.w / iw, frame.h / ih) * (ref.value?.zoom ?? 1);
    dw = iw * k;
    dh = ih * k;
    const al = el.align ?? "center";
    const va = el.valign ?? "middle";
    dx = al === "left" ? frame.x : al === "right" ? frame.x + frame.w - dw : frame.x + (frame.w - dw) / 2;
    dy = va === "top" ? frame.y : va === "bottom" ? frame.y + frame.h - dh : frame.y + (frame.h - dh) / 2;
    if (ref.value && (ref.value.fx !== undefined || ref.value.fy !== undefined)) {
      dx += ((ref.value.fx ?? 0.5) - 0.5) * frame.w;
      dy += ((ref.value.fy ?? 0.5) - 0.5) * frame.h;
    }
  } else {
    const k = Math.max(frame.w / iw, frame.h / ih) * Math.max(1, ref.value?.zoom ?? 1);
    dw = iw * k;
    dh = ih * k;
    const fx = ref.value?.fx ?? 0.5;
    const fy = ref.value?.fy ?? (el.valign === "top" ? 0 : el.valign === "bottom" ? 1 : 0.5);
    dx = frame.x - (dw - frame.w) * fx;
    dy = frame.y - (dh - frame.h) * fy;
  }
  ctx.save();
  if (fit === "cover" || el.radius) {
    roundRectPath(ctx, frame, (el.radius ?? 0) * s);
    ctx.clip();
  }
  applyShadow(ctx, el, s, env, rc);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const source = processedImage(img, el.tint ? resolveColor(el.tint, env.brand, rc) : undefined, el.grayscale);
  // záře kolem loga (jako Outer Glow v Affinity): ze šablony, nebo zaškrtnutím u týmu
  const teamKey = /^team:\{\{([^}|]+)/.exec(el.src.trim())?.[1]?.trim();
  const glow = el.glow ?? (teamKey && (rc.row ? rc.row[`${teamKey}__glow`] : rc.data[`${teamKey}__glow`]) ? { color: "#FFFFFF", radius: 1, intensity: 0.5 } : undefined);
  if (glow) {
    ctx.save();
    ctx.shadowColor = "transparent";
    const halo = processedImage(img, resolveColor(glow.color, env.brand, rc), false);
    const r = Math.max(0.6, glow.radius * s);
    ctx.globalAlpha *= Math.min(1, glow.intensity);
    const steps = Math.max(8, Math.round(r * 6));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      ctx.drawImage(halo, dx + Math.cos(a) * r, dy + Math.sin(a) * r, dw, dh);
    }
    ctx.restore();
  }
  ctx.drawImage(source, dx, dy, dw, dh);
  ctx.restore();
}

// Jeden prvek ─────────────────────────────────────────────────

function drawElement(
  ctx: CanvasRenderingContext2D,
  el: TemplateElement,
  frame: Frame,
  s: number,
  env: RenderEnv,
  rc: RenderContext,
  images: Images,
  hits: HitBox[] | null,
) {
  if (!isVisible(el, env, rc)) return;
  ctx.save();
  ctx.globalAlpha *= el.opacity ?? 1;
  if (el.rotation) {
    const cx = frame.x + frame.w / 2;
    const cy = frame.y + frame.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  const paint = (ctx: CanvasRenderingContext2D) => {
  switch (el.type) {
      case "rect": {
        applyShadow(ctx, el, s, env, rc);
        ctx.fillStyle = makeFill(ctx, el.fill, frame, env, rc);
        roundRectPath(ctx, frame, (el.radius ?? 0) * s);
        ctx.fill();
        if (el.stroke && el.strokeWidth) {
          ctx.shadowColor = "transparent";
          ctx.strokeStyle = resolveColor(el.stroke, env.brand, rc);
          ctx.lineWidth = el.strokeWidth * s;
          ctx.stroke();
        }
        break;
      }
      case "ellipse": {
        applyShadow(ctx, el, s, env, rc);
        ctx.beginPath();
        ctx.ellipse(frame.x + frame.w / 2, frame.y + frame.h / 2, frame.w / 2, frame.h / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = makeFill(ctx, el.fill, frame, env, rc);
        ctx.fill();
        if (el.stroke && el.strokeWidth) {
          ctx.strokeStyle = resolveColor(el.stroke, env.brand, rc);
          ctx.lineWidth = el.strokeWidth * s;
          ctx.stroke();
        }
        break;
      }
      case "line": {
        ctx.fillStyle = resolveColor(el.color, env.brand, rc);
        const t = Math.max(1, el.thickness * s);
        if (frame.w >= frame.h) ctx.fillRect(frame.x, frame.y + (frame.h - t) / 2, frame.w, t);
        else ctx.fillRect(frame.x + (frame.w - t) / 2, frame.y, t, frame.h);
        break;
      }
      case "path": {
        ctx.translate(frame.x, frame.y);
        ctx.scale(frame.w / 100, frame.h / 100);
        const p = new Path2D(el.d);
        applyShadow(ctx, el, s, env, rc);
        if (el.fill) {
          ctx.fillStyle = makeFill(ctx, el.fill, { x: 0, y: 0, w: 100, h: 100 }, env, rc);
          ctx.fill(p);
        }
        if (el.stroke && el.strokeWidth) {
          ctx.strokeStyle = resolveColor(el.stroke, env.brand, rc);
          ctx.lineWidth = (el.strokeWidth * s * 100) / Math.max(frame.w, frame.h);
          ctx.lineCap = "round";
          ctx.stroke(p);
        }
        break;
      }
      case "text":
        drawText(ctx, el, frame, s, env, rc, images);
        break;
      case "image":
        drawImage(ctx, el, frame, s, env, rc, images);
        break;
      case "list": {
        const rows = listRows(el, env);
        const { rows: rf } = layoutList(frame, el.frame.w, el.rowHeight, el.gap, rows.length, el.distribute ?? true);
        rows.forEach((row, i) => {
          const rowCtx: RenderContext = { ...rc, row, rowIndex: i + (env.template.paginate?.field === el.field ? ((env.page ?? 1) - 1) * env.template.paginate.perPage : 0) };
          const B = { w: el.frame.w, h: el.rowHeight };
          for (const c of el.children) {
            const r = constrain(c.frame, B, rf[i], c.anchorX ?? autoAnchorX(c.frame, B.w), c.anchorY ?? "scale");
            const cs = Math.min(rf[i].w / B.w, rf[i].h / B.h);
            drawElement(ctx, c, r.frame, cs, env, rowCtx, images, null);
          }
        });
        break;
      }
    }
  };
  if (el.fade && typeof document !== "undefined") {
    // průhledný přechod (maska) – prvek postupně mizí, např. obrázek přes hráče
    const tmp = document.createElement("canvas");
    tmp.width = ctx.canvas.width;
    tmp.height = ctx.canvas.height;
    const t = tmp.getContext("2d")!;
    t.setTransform(ctx.getTransform());
    paint(t);
    t.globalCompositeOperation = "destination-in";
    const a = ((el.fade.angle ?? 90) * Math.PI) / 180;
    const cx = frame.x + frame.w / 2;
    const cy = frame.y + frame.h / 2;
    const len = (Math.abs(frame.w * Math.cos(a)) + Math.abs(frame.h * Math.sin(a))) / 2;
    const g = t.createLinearGradient(cx - Math.cos(a) * len, cy - Math.sin(a) * len, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    const from = Math.min(1, Math.max(0, el.fade.from));
    const to = Math.min(1, Math.max(from, el.fade.to));
    g.addColorStop(from, "rgba(0,0,0,0)");
    g.addColorStop(to === from ? Math.min(1, from + 0.001) : to, "rgba(0,0,0,1)");
    t.fillStyle = g;
    t.fillRect(-20000, -20000, 40000, 40000);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
  } else paint(ctx);
  ctx.restore();
  if (hits) hits.push({ id: el.id, frame, rotation: el.rotation });
}

/** Synchronní vykreslení (obrázky a fonty už musí být připravené přes prepare). */
export function renderSync(ctx: CanvasRenderingContext2D, env: RenderEnv, images: Images, scale = 1): HitBox[] {
  const fmt = FORMATS[env.format];
  const hits: HitBox[] = [];
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, fmt.w, fmt.h);
  const rc = baseContext(env);
  ctx.fillStyle = makeFill(ctx, env.template.background, { x: 0, y: 0, w: fmt.w, h: fmt.h }, env, rc);
  ctx.fillRect(0, 0, fmt.w, fmt.h);
  for (const el of env.template.elements) {
    const r = resolveElement(el, env.template, env.format);
    drawElement(ctx, el, r.frame, r.s, env, rc, images, hits);
  }
  ctx.restore();
  return hits;
}

export async function renderToCanvas(env: RenderEnv, scale = 1, canvas?: HTMLCanvasElement) {
  const fmt = FORMATS[env.format];
  const c = canvas ?? document.createElement("canvas");
  c.width = Math.round(fmt.w * scale);
  c.height = Math.round(fmt.h * scale);
  const ctx = c.getContext("2d")!;
  const images = await prepare(env);
  renderSync(ctx, env, images, scale);
  return c;
}

/** Počet slidů carouselu pro daná data */
export function pageCount(t: Template, data: DataRecord) {
  if (!t.paginate) return 1;
  const v = data[t.paginate.field];
  const n = Array.isArray(v) ? v.length : 0;
  return Math.max(1, Math.ceil(n / t.paginate.perPage));
}

