import type { BrandKit, ColorRef, Team } from "./types";
import { findTeam, interpolate, type RenderContext } from "./template-string";

export function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 && h.length !== 8) return null;
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function withAlpha(color: string, a: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

export function luminance(color: string) {
  const rgb = hexToRgb(color);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function readableOn(bg: string) {
  return luminance(bg) > 0.45 ? "#111111" : "#FFFFFF";
}

/**
 * Barvy v šabloně:
 *  "#ff6600"            – pevná barva
 *  "@primary"           – barva z brand kitu
 *  "@primary/60"        – s průhledností 60 %
 *  "@team:{{home_team}}" – barva týmu (@team2: = sekundární)
 */
export function resolveColor(ref: ColorRef | undefined, brand: BrandKit, ctx?: RenderContext, teams?: Team[]): string {
  if (!ref) return "transparent";
  if (!ref.startsWith("@")) return ref;
  let body = ref.slice(1);
  let alpha: number | undefined;
  const slash = body.lastIndexOf("/");
  if (slash > 0 && /^\d+$/.test(body.slice(slash + 1))) {
    alpha = Number(body.slice(slash + 1)) / 100;
    body = body.slice(0, slash);
  }
  let base: string;
  if (body.startsWith("team:") || body.startsWith("team2:")) {
    const second = body.startsWith("team2:");
    const expr = body.slice(second ? 6 : 5);
    const name = ctx ? interpolate(expr, ctx) : expr;
    const t = findTeam(teams ?? ctx?.teams ?? [], name);
    base = t ? (second ? t.color2 : t.color) : brand.colors.primary;
  } else {
    base = (brand.colors as Record<string, string>)[body] ?? "#888888";
  }
  return alpha !== undefined ? withAlpha(base, alpha) : base;
}
