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

// ── Screenshot (Livesport, Flashscore, web ligy…) → data šablony ──

import type { DataRecord, Team, Template } from "./types";
import { findTeam } from "./template-string";

async function shrinkImage(b: Blob, max = 1568): Promise<Blob> {
  const url = URL.createObjectURL(b);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Obrázek se nepodařilo načíst."));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    const x = c.getContext("2d")!;
    x.fillStyle = "#fff";
    x.fillRect(0, 0, c.width, c.height);
    x.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob((o) => (o ? res(o) : rej(new Error("Převod obrázku selhal."))), "image/jpeg", 0.9));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}

function describeFields(t: Template) {
  return t.fields
    .filter((f) => f.type !== "image" && f.type !== "channel")
    .map((f) => {
      if (f.type === "list")
        return `- "${f.key}" (${f.label}): POLE objektů, každý má klíče ${(f.columns ?? []).filter((c) => c.type !== "channel").map((c) => `"${c.key}" (${c.label}, ${c.type})`).join(", ")}`;
      return `- "${f.key}" (${f.label}, typ ${f.type})`;
    })
    .join("\n");
}

export function buildScreenshotPrompt(t: Template, teams: Team[], today = new Date()) {
  const y = today.getFullYear();
  return `Na obrázku je screenshot sportovních výsledků nebo programu (typicky Livesport / Flashscore, basketbal).
Úkol: vyčti z něj data a vyplň pole grafické šablony „${t.name}“ (${t.description ?? ""}).

Pole šablony:
${describeFields(t)}

Pravidla:
- Týmy piš přesně jedním z těchto názvů, pokud odpovídá (ignoruj sponzory, např. "Slavia Praha ERA NBK" = "Slavia Praha"): ${teams.map((x) => [x.name, ...x.aliases].join(" / ")).join("; ")}. Když tým v seznamu není, napiš název ze screenshotu.
- Datum (typ date) ve formátu RRRR-MM-DD; chybí-li rok, použij ${y} (dnes je ${today.toISOString().slice(0, 10)}).
- Čas ve formátu HH:MM. Skóre jako čísla.
- Kolo piš např. "4. kolo". Termín (dates) krátce, např. "30.9." nebo "30.9. - 1.10.".
- Hráč zápasu: když jsou na obrázku statistiky hráčů a šablona má pole "mvp", NEVYPLŇUJ "mvp" textem, ale přidej klíč "_mvp" = {"name": jméno tak, jak je na screenshotu, "pts": body (sloupec B/PTS), "reb": doskoky (DOS/REB), "ast": asistence (A/AST)} pro hráče s nejvíce body z VÍTĚZNÉHO týmu.
- Seznamy (např. zápasy) vyplň ve stejném pořadí jako na screenshotu, všechny řádky.
- Pole, která ze screenshotu nejdou zjistit, VYNECH (nevymýšlej).

Odpověz POUZE JSON objektem s klíči polí, např. {"home_team":"…","home_score":96}.`;
}

export async function extractFromScreenshot(image: Blob, t: Template, teams: Team[]): Promise<DataRecord> {
  const small = await shrinkImage(image);
  const prompt = buildScreenshotPrompt(t, teams);
  let text: string;
  if (TARGET === "artifact") {
    const s = await artifactSample();
    if (!s) throw new Error("AI není v tomto zobrazení dostupná.");
    const lim = await (s as unknown as { limits?: () => Promise<{ images?: unknown }> }).limits?.().catch(() => null);
    if (lim && !lim.images) throw new Error("Tady nejde AI poslat obrázek. Použijte nasazenou verzi na Vercelu.");
    try {
      text = (await s(prompt, { images: [small], modelTier: "default" } as object)).text;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "not_granted") throw new Error("Použití AI nebylo povoleno.");
      throw new Error((e as Error).message || "AI se nepodařilo zavolat.");
    }
  } else {
    const r = await fetch("/api/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, images: [{ mediaType: "image/jpeg", data: await blobToBase64(small) }] }),
    });
    if (!r.ok) throw new Error((await r.text()) || "AI se nepodařilo zavolat.");
    text = (await r.json()).text;
  }
  const raw = extractJson(text) as Record<string, unknown>;
  // úklid: čísla, týmy na přesné názvy z projektu, jen známá pole
  const out: DataRecord = {};
  const teamName = (v: unknown) => {
    const s = String(v ?? "").trim();
    return findTeam(teams, s)?.name ?? s;
  };
  for (const f of t.fields) {
    if (!(f.key in raw) || f.type === "image" || f.type === "channel") continue;
    const v = raw[f.key];
    if (f.type === "list") {
      if (!Array.isArray(v)) continue;
      out[f.key] = v.map((row) => {
        const r0 = (row ?? {}) as Record<string, unknown>;
        const r1: Record<string, unknown> = {};
        for (const c of f.columns ?? []) {
          if (!(c.key in r0) || c.type === "channel") continue;
          r1[c.key] = c.type === "team" ? teamName(r0[c.key]) : c.type === "number" && r0[c.key] !== "" ? Number(r0[c.key]) : String(r0[c.key] ?? "");
        }
        return r1;
      }) as DataRecord[string];
    } else if (f.type === "team") out[f.key] = teamName(v);
    else if (f.type === "number") out[f.key] = v === "" || v === null ? "" : Number(v);
    else out[f.key] = String(v ?? "");
  }
  // hráč zápasu: vždy body, doskoky a asistence jen když jich má aspoň 5
  const m = raw._mvp as { name?: string; pts?: number; reb?: number; ast?: number } | undefined;
  if (m?.name && t.fields.some((f) => f.key === "mvp")) {
    const parts = [`${Number(m.pts) || 0} PTS`];
    if (Number(m.reb) >= 5) parts.push(`${Number(m.reb)} REB`);
    if (Number(m.ast) >= 5) parts.push(`${Number(m.ast)} AST`);
    out.mvp = `${m.name} (${parts.join(", ")})`;
  }
  if (!Object.keys(out).length) throw new Error("Ze screenshotu se nepodařilo nic vyčíst pro tuto šablonu.");
  return out;
}
