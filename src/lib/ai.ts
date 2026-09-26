// ─────────────────────────────────────────────────────────────
// AI asistent – navrhuje TEXTY (titulek, teaser, příspěvek) a může
// vyplnit datová pole. Nikdy nemění design šablony.
//  - server: /api/ai (ANTHROPIC_API_KEY ve Vercelu)
//  - artifact: schopnost "sample" v Claude artefaktu
// ─────────────────────────────────────────────────────────────
import { TARGET } from "./runtime";
import type { FieldDef } from "./types";

export interface AiSuggestion {
  headlines: string[];
  teaser: string;
  social: string;
  hashtags: string[];
  fields: Record<string, string>;
}

export function buildPrompt(input: string, fields: FieldDef[], tone: string) {
  const usable = fields.filter((f) => f.type !== "image" && f.type !== "list");
  return `Jsi zkušený český sportovní redaktor a social media editor (basketbal, NBL).
Uživatel popsal událost:
"""${input}"""

Úkol: navrhni texty pro grafiku a příspěvek na sociální sítě. Tón: ${tone}.
- headlines: 3 krátké úderné titulky do grafiky (max 45 znaků, bez emoji, klidně s [hranatými závorkami] kolem 1–2 slov ke zvýraznění)
- teaser: 1 věta (max 120 znaků)
- social: text příspěvku na Instagram/Facebook (2–4 krátké věty, max 2 emoji)
- hashtags: 3–6 hashtagů bez mezer
- fields: hodnoty datových polí, které z textu jednoznačně plynou. Použij jen tyto klíče: ${usable.map((f) => `${f.key} (${f.label})`).join(", ")}. Nevymýšlej údaje, které v textu nejsou.

Odpověz POUZE validním JSON objektem:
{"headlines":["…"],"teaser":"…","social":"…","hashtags":["#…"],"fields":{"klíč":"hodnota"}}`;
}

function coerce(x: unknown): AiSuggestion {
  const o = (x ?? {}) as Partial<AiSuggestion>;
  return {
    headlines: Array.isArray(o.headlines) ? o.headlines.map(String).slice(0, 5) : [],
    teaser: String(o.teaser ?? ""),
    social: String(o.social ?? ""),
    hashtags: Array.isArray(o.hashtags) ? o.hashtags.map(String) : [],
    fields: o.fields && typeof o.fields === "object" ? Object.fromEntries(Object.entries(o.fields).map(([k, v]) => [k, String(v)])) : {},
  };
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("AI nevrátila čitelnou odpověď.");
  return JSON.parse(text.slice(start, end + 1));
}

type SampleFn = ((input: string, o?: object) => Promise<{ text: string }>) & { json?: (i: string, o?: object) => Promise<unknown> };

async function artifactSample(): Promise<SampleFn | null> {
  const w = window as unknown as { claude?: { use: (n: string) => Promise<unknown> } };
  if (!w.claude?.use) return null;
  return ((await w.claude.use("sample")) as SampleFn) ?? null;
}

export async function aiAvailability(): Promise<{ ok: boolean; reason?: string }> {
  if (TARGET === "artifact") {
    const s = await artifactSample();
    return s ? { ok: true } : { ok: false, reason: "AI je dostupná jen při otevření v Claude." };
  }
  try {
    const r = await fetch("/api/ai", { method: "GET" });
    const j = await r.json();
    return j.configured ? { ok: true } : { ok: false, reason: "Doplňte ANTHROPIC_API_KEY do proměnných prostředí ve Vercelu." };
  } catch {
    return { ok: false, reason: "Server AI neodpovídá." };
  }
}

export async function suggest(input: string, fields: FieldDef[], tone: string): Promise<AiSuggestion> {
  const prompt = buildPrompt(input, fields, tone);
  if (TARGET === "artifact") {
    const s = await artifactSample();
    if (!s) throw new Error("AI není v tomto zobrazení dostupná.");
    try {
      const { text } = await s(prompt, { modelTier: "quick" });
      return coerce(extractJson(text));
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "not_granted") throw new Error("Použití AI nebylo povoleno.");
      if (code === "rate_limited") throw new Error("Příliš mnoho dotazů, zkuste to za chvíli.");
      throw new Error((e as Error).message || "AI se nepodařilo zavolat.");
    }
  }
  const r = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt }) });
  if (!r.ok) throw new Error((await r.text()) || "AI se nepodařilo zavolat.");
  const j = await r.json();
  return coerce(extractJson(j.text));
}
