import JSZip from "jszip";
import { FORMATS } from "./formats";
import { pageCount, renderToCanvas, type RenderEnv } from "./render";
import type { FormatId } from "./types";
import { normalize } from "./template-string";

export type ImageType = "png" | "jpg";

export function canvasToBlob(c: HTMLCanvasElement, type: ImageType, quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Export se nepovedl"))), type === "png" ? "image/png" : "image/jpeg", quality),
  );
}

export function slug(s: string) {
  return normalize(s).replace(/\s+/g, "-").slice(0, 60) || "grafika";
}

export function fileName(base: string, format: FormatId, type: ImageType, page?: number, pages?: number) {
  const f = FORMATS[format];
  const p = pages && pages > 1 ? `-${String(page).padStart(2, "0")}` : "";
  return `${slug(base)}-${f.w}x${f.h}${p}.${type}`;
}

export async function renderBlob(env: RenderEnv, type: ImageType, scale = 1) {
  const c = await renderToCanvas(env, scale);
  return canvasToBlob(c, type);
}

/** Vykreslí všechny slidy (carousel) v jednom formátu */
export async function renderPages(env: RenderEnv, type: ImageType, scale: number, base: string) {
  const pages = pageCount(env.template, env.data);
  const out: { name: string; blob: Blob }[] = [];
  for (let p = 1; p <= pages; p++) {
    const blob = await renderBlob({ ...env, page: p, pages }, type, scale);
    out.push({ name: fileName(base, env.format, type, p, pages), blob });
  }
  return out;
}

export async function zipFiles(files: { name: string; blob: Blob }[]) {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const f of files) {
    let n = f.name;
    let i = 2;
    while (used.has(n)) n = f.name.replace(/(\.\w+)$/, `-${i++}$1`);
    used.add(n);
    zip.file(n, f.blob);
  }
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}

// ── Stažení / sdílení ───────────────────────────────────────

type DownloadsApi = { save: (r: { filename: string; data: Blob }) => Promise<unknown> };
type ClaudeWindow = { claude?: { use: (n: string) => Promise<unknown> } };

let downloadsApi: Promise<DownloadsApi | null> | null = null;
function artifactDownloads(): Promise<DownloadsApi | null> {
  const w = window as unknown as ClaudeWindow;
  if (!w.claude?.use) return Promise.resolve(null);
  downloadsApi ??= w.claude.use("downloads").then((x) => (x as DownloadsApi) ?? null).catch(() => null);
  return downloadsApi;
}

/** Stáhne soubor. Uvnitř Claude artefaktu použije jeho bezpečné ukládání. */
export async function downloadBlob(blob: Blob, filename: string): Promise<"saved" | "declined"> {
  const api = await artifactDownloads();
  if (api) {
    try {
      await api.save({ filename, data: blob });
      return "saved";
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "declined") return "declined";
      throw new Error("Soubor se nepodařilo uložit (" + (code ?? "chyba") + ").");
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "saved";
}

/** Na mobilu: systémové sdílení → "Uložit obrázek" / Instagram. */
export function canShareFiles() {
  try {
    const test = new File([new Blob(["x"], { type: "image/png" })], "t.png", { type: "image/png" });
    return typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files: [test] });
  } catch {
    return false;
  }
}

export async function shareFiles(files: { name: string; blob: Blob }[], title: string) {
  const f = files.map((x) => new File([x.blob], x.name, { type: x.blob.type || "image/png" }));
  await navigator.share({ files: f, title });
}
