// ─────────────────────────────────────────────────────────────
// Odstranění pozadí fotky – rozhraní + dvě implementace:
//  1) "browser": AI model přímo v prohlížeči (@imgly/background-removal), zdarma
//  2) "removebg": API remove.bg přes /api/remove-bg (klíč v ENV nebo v Nastavení)
// ─────────────────────────────────────────────────────────────
import { TARGET } from "./runtime";

export interface BackgroundRemover {
  id: "browser" | "removebg";
  name: string;
  /** null = dostupné, jinak důvod, proč ne */
  unavailableReason(): string | null;
  remove(image: Blob, onProgress?: (msg: string, ratio?: number) => void): Promise<Blob>;
}

export const browserRemover: BackgroundRemover = {
  id: "browser",
  name: "AI v prohlížeči (zdarma)",
  unavailableReason() {
    if (TARGET === "artifact") return "V živé ukázce není povolené stahování AI modelu. Funguje v nasazené verzi (Vercel).";
    return null;
  },
  async remove(image, onProgress) {
    const mod = await import("@imgly/background-removal");
    onProgress?.("Načítám AI model (poprvé ~40 MB)…", 0);
    const out = await mod.removeBackground(image, {
      model: "isnet_fp16",
      output: { format: "image/png", quality: 1 },
      progress: (key: string, current: number, total: number) => {
        const r = total ? current / total : undefined;
        onProgress?.(key.startsWith("fetch") ? "Stahuji model…" : "Zpracovávám fotku…", r);
      },
    });
    return out;
  },
};

export function removeBgRemover(apiKey?: string): BackgroundRemover {
  return {
    id: "removebg",
    name: "remove.bg (API klíč)",
    unavailableReason() {
      if (TARGET === "artifact") return "remove.bg potřebuje server – funguje v nasazené verzi (Vercel).";
      return null;
    },
    async remove(image, onProgress) {
      onProgress?.("Odesílám na remove.bg…");
      const fd = new FormData();
      fd.append("image", image, "photo.png");
      const r = await fetch("/api/remove-bg", { method: "POST", body: fd, headers: apiKey ? { "x-removebg-key": apiKey } : {} });
      if (!r.ok) throw new Error((await r.text()) || `remove.bg vrátil chybu ${r.status}`);
      return r.blob();
    },
  };
}
