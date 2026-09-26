import type { FormatDef, FormatId } from "./types";

export const FORMATS: Record<FormatId, FormatDef> = {
  ig_portrait: { id: "ig_portrait", label: "Instagram portrait", short: "4:5", w: 1080, h: 1350 },
  ig_square: { id: "ig_square", label: "Instagram square", short: "1:1", w: 1080, h: 1080 },
  ig_story: { id: "ig_story", label: "Instagram Story", short: "9:16", w: 1080, h: 1920 },
  fb: { id: "fb", label: "Facebook", short: "4:5 FB", w: 1200, h: 1500 },
  x: { id: "x", label: "X / Twitter", short: "16:9", w: 1600, h: 900 },
};

export const FORMAT_ORDER: FormatId[] = ["ig_portrait", "ig_square", "ig_story", "fb", "x"];

export const isLandscape = (f: FormatId) => FORMATS[f].w > FORMATS[f].h;
