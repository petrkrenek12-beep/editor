import type { ElementOverride, FormatId, ImageValue, Template, TemplateElement } from "./types";

/** Aplikuje úpravy konkrétní grafiky na šablonu (šablona zůstává beze změny). */
export function applyOverrides(t: Template, overrides?: Record<string, ElementOverride>): Template {
  if (!overrides || !Object.keys(overrides).length) return t;
  return {
    ...t,
    elements: t.elements.map((el) => {
      const o = overrides[el.id];
      if (!o) return el;
      const next = { ...el, ...o, frames: { ...(el.frames ?? {}), ...(o.frames ?? {}) } } as TemplateElement;
      return next;
    }),
  };
}

/** Uloží změnu rámu – v základním formátu mění frame, v ostatních jen přepis pro formát. */
export function frameUpdate(el: TemplateElement, t: Template, format: FormatId, frame: TemplateElement["frame"]): Partial<TemplateElement> {
  if (format === t.baseFormat) return { frame };
  return { frames: { ...(el.frames ?? {}), [format]: frame } };
}

export function imageFieldOf(el: TemplateElement): string | null {
  if (el.type !== "image") return null;
  const m = /^\{\{([^}|]+)\}\}$/.exec(el.src.trim());
  return m ? m[1].trim() : null;
}

export function asImageValue(v: unknown): ImageValue | null {
  if (!v) return null;
  if (typeof v === "string") return { asset: v };
  if (typeof v === "object" && "asset" in (v as object)) return v as ImageValue;
  return null;
}

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
