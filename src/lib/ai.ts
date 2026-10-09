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
        return `- "${f.key}" (${f.label}): POLE objektů, každý má klíče ${(f.columns ?? []).filter((c) => c.type !== "channel" && c.type !== "image").map((c) => `"${c.key}" (${c.label}, ${c.type})`).join(", ")}`;
      return `- "${f.key}" (${f.label}, typ ${f.type})`;
    })
    .join("\n");
}

export function buildScreenshotPrompt(t: Template, teams: Team[], _today = new Date()) {
  return `Na obrázku je screenshot sportovních výsledků nebo programu (typicky Livesport / Flashscore, basketbal).
Úkol: vyčti z něj data a vyplň pole grafické šablony „${t.name}“ (${t.description ?? ""}).

Pole šablony:
${describeFields(t)}

Pravidla:
- Týmy piš přesně jedním z těchto názvů, pokud odpovídá (ignoruj sponzory, např. "Slavia Praha ERA NBK" = "Slavia Praha"): ${teams.map((x) => [x.name, ...x.aliases].join(" / ")).join("; ")}. Když tým v seznamu není, napiš název ze screenshotu.
- Datum (typ date) opiš PŘESNĚ jako DEN.MĚSÍC. v českém pořadí – nejdřív den, potom měsíc (např. "11.10." = 11. října). Nikdy neprohazuj den a měsíc a nepiš rok.
- Čas ve formátu HH:MM. Skóre jako čísla.
- VÝSLEDEK: když je na některém obrázku zápas ještě rozehraný (např. „Period 4 01:01“, běžící čas) a na jiném je „Konec“ / „Final“, ber skóre i čtvrtiny z KONEČNÉHO.
- ČTVRTINY (pole "detail" nebo pole s „čtvrtiny“ v názvu): skóre každé čtvrtiny ve tvaru domácí:hosté oddělené " · ", např. "30:12 · 23:11 · 22:16 · 29:11" (prodloužení přidej na konec). Na Livesportu je blok „Skóre“ se dvěma řádky (domácí nahoře, hosté dole): první číslo je celkové skóre, další sloupce jsou čtvrtiny – spáruj vždy čísla ze stejného sloupce. Na FIBA LiveStats je malá tabulka CHO/SLO se čtvrtinami a celkem na konci.
- Kolo piš např. "4. kolo". Termín (dates) krátce, např. "30.9." nebo "30.9. - 1.10.".
- HRÁČ ZÁPASU – pokud má šablona pole "mvp" nebo "mvp_name", NEVYPLŇUJ je textem, ale přidej klíč "_mvp". Postup:
  1. Najdi na obrázcích tabulku statistik hráčů (Livesport/Flashscore záložka „Statistiky hráčů“ nebo „Sestavy“, FIBA LiveStats, box score ligy). Sloupce bývají: B / PTS / BOD (body), DOS / REB / D (doskoky), AS / AST / A (asistence), ZIS / STL (zisky), BL / BLK (bloky), EFF / VAL / PIR / HOD (hodnocení).
  2. Tabulka bývá rozdělená po týmech (dva bloky nebo přepínač s názvy/logy týmů). Urči, který blok patří VÍTĚZNÉMU týmu (podle skóre zápasu). Když není jasné, vezmi hráče s nejvyšší hodnotou EFF/VAL/PIR v celém zápase.
  3. Z vítězného týmu vyber hráče s nejvyšším EFF/VAL/PIR; když tento sloupec není, hráče s nejvíce body.
  4. Výsledek: "_mvp": {"name": CELÉ jméno ve tvaru „Křestní Příjmení“ – když je kdekoli na obrázcích celé křestní jméno (vyskakovací karta hráče, profil, „Nejlepší hráči“), použij ho; prostřední jména vynech („Karoline Elizabeth Striplin“ → „Karoline Striplin“). Jen když celé jméno nikde není, napiš zkratku ve tvaru „K. Striplin“ (ne „Striplin K.“), "team": jeho tým, "pts": číslo, "reb": číslo, "ast": číslo, "stl": číslo, "blk": číslo, "eff": číslo} – vynech jen čísla, která na obrázku nejsou.
  5. Livesport často ukazuje i blok „Nejlepší hráči“ / „Top hráči“ u přehledu zápasu – i ten použij.
  Když na žádném obrázku statistiky hráčů nejsou, "_mvp" vůbec nepřidávej (nevymýšlej).
- Když má seznam zápasů sloupec "mvp", napiš do něj nejlepšího hráče vítězného týmu ve tvaru "Jméno Příjmení (21 PTS, 8 AST)" – body vždy, REB a AST jen když jich má aspoň 5.
- Seznamy (např. zápasy) vyplň ve stejném pořadí jako na screenshotu, všechny řádky.
- Pole, která ze screenshotu nejdou zjistit, VYNECH (nevymýšlej).

Odpověz POUZE JSON objektem s klíči polí, např. {"home_team":"…","home_score":96}.`;
}

export async function extractFromScreenshot(image: Blob | Blob[], t: Template, teams: Team[]): Promise<DataRecord> {
  const list = (Array.isArray(image) ? image : [image]).slice(-3);
  const smalls = await Promise.all(list.map((b) => shrinkImage(b)));
  const small = smalls[0];
  const prompt = (list.length > 1 ? `Máš ${list.length} obrázky ze stejného zápasu/kola (např. výsledek + statistiky hráčů) – kombinuj údaje ze všech.\n` : "") + buildScreenshotPrompt(t, teams);
  let text: string;
  if (TARGET === "artifact") {
    const s = await artifactSample();
    if (!s) throw new Error("AI není v tomto zobrazení dostupná.");
    const lim = await (s as unknown as { limits?: () => Promise<{ images?: unknown }> }).limits?.().catch(() => null);
    if (lim && !lim.images) throw new Error("Tady nejde AI poslat obrázek. Použijte nasazenou verzi na Vercelu.");
    try {
      text = (await s(prompt, { images: smalls, modelTier: "default" } as object)).text;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "not_granted") throw new Error("Použití AI nebylo povoleno.");
      throw new Error((e as Error).message || "AI se nepodařilo zavolat.");
    }
  } else {
    const r = await fetch("/api/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, images: await Promise.all(smalls.map(async (b) => ({ mediaType: "image/jpeg", data: await blobToBase64(b) }))) }),
    });
    if (!r.ok) throw new Error((await r.text()) || "AI se nepodařilo zavolat.");
    text = (await r.json()).text;
  }
  const raw = extractJson(text) as Record<string, unknown>;
  // úklid: čísla, týmy na přesné názvy z projektu, jen známá pole
  const out: DataRecord = {};
  const dateOf = (v: unknown) => toIsoDate(String(v ?? ""));
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
          if (!(c.key in r0) || c.type === "channel" || c.type === "image") continue;
          r1[c.key] = c.type === "team" ? teamName(r0[c.key]) : c.type === "date" ? dateOf(r0[c.key]) : c.type === "number" && r0[c.key] !== "" ? Number(r0[c.key]) : String(r0[c.key] ?? "");
        }
        return r1;
      }) as DataRecord[string];
    } else if (f.type === "team") out[f.key] = teamName(v);
    else if (f.type === "date") out[f.key] = dateOf(v);
    else if (f.type === "number") out[f.key] = v === "" || v === null ? "" : Number(v);
    else out[f.key] = String(v ?? "");
  }
  // čtvrtiny: sjednotit formát na "30:12 · 23:11 · …"
  for (const f of t.fields) {
    if (f.type !== "text" || typeof out[f.key] !== "string") continue;
    if (!(f.key === "detail" || /čtvrtin|quarters/i.test(f.label))) continue;
    const pairs = [...String(out[f.key]).matchAll(/(\d{1,3})\s*[-:–—]\s*(\d{1,3})/g)].map((x) => `${x[1]}:${x[2]}`);
    if (pairs.length >= 2) out[f.key] = pairs.join(" · ");
  }
  // hráč zápasu: vždy body; doskoky a asistence od 5, jinak doplnit EFF/zisky/bloky
  const m = raw._mvp as { name?: string; pts?: number; reb?: number; ast?: number; stl?: number; blk?: number; eff?: number } | undefined;
  if (m?.name) {
    // "Striplin K." → "K. Striplin"
    const nm = String(m.name).trim().replace(/\s+/g, " ");
    const rev = /^(.+?)\s+([A-ZÁ-Ž]\.)$/u.exec(nm);
    m.name = rev ? `${rev[2]} ${rev[1]}` : nm;
    const num = (v: unknown) => (v === undefined || v === null || v === "" || isNaN(Number(v)) ? undefined : Number(v));
    const pts = num(m.pts) ?? 0;
    const stats: [number, string][] = [[pts, "PTS"]];
    const reb = num(m.reb), ast = num(m.ast), eff = num(m.eff), stl = num(m.stl), blk = num(m.blk);
    if (reb !== undefined && reb >= 5) stats.push([reb, "REB"]);
    if (ast !== undefined && ast >= 5) stats.push([ast, "AST"]);
    if (t.fields.some((f) => f.key === "mvp")) out.mvp = `${m.name} (${stats.map(([v, l]) => `${v} ${l}`).join(", ")})`;
    if (t.fields.some((f) => f.key === "mvp_name")) {
      out.mvp_name = m.name;
      // tři čísla do panelu: PTS + REB/AST (≥5) a doplnit EFF, zisky, bloky, případně nižší REB/AST
      const pool: [number | undefined, string][] = [[eff, "EFF"], [stl !== undefined && stl >= 3 ? stl : undefined, "STL"], [blk !== undefined && blk >= 3 ? blk : undefined, "BLK"], [reb !== undefined && reb < 5 ? reb : undefined, "REB"], [ast !== undefined && ast < 5 ? ast : undefined, "AST"]];
      for (const [v, l] of pool) if (stats.length < 3 && v !== undefined) stats.push([v, l]);
      stats.slice(0, 3).forEach(([v, l], i) => {
        out[`s${i + 1}_value`] = String(v);
        out[`s${i + 1}_label`] = l;
      });
      for (let i = stats.length; i < 3; i++) {
        out[`s${i + 1}_value`] = "";
        out[`s${i + 1}_label`] = "";
      }
    }
  }
  if (!Object.keys(out).length) throw new Error("Ze screenshotu se nepodařilo nic vyčíst pro tuto šablonu.");
  return out;
}

/** "11.10." / "11. 10. 2026" / "2026-10-11" → "2026-10-11" (den vždy první). Bez roku: nejbližší budoucí/nedávné datum. */
export function toIsoDate(raw: string, today = new Date()): string {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = /(\d{1,2})\s*[./]\s*(\d{1,2})\s*[./]?\s*(\d{4})?/.exec(s);
  if (!m) return s;
  const d = +m[1];
  const mo = +m[2];
  let y = m[3] ? +m[3] : today.getFullYear();
  if (!m[3]) {
    const cand = new Date(y, mo - 1, d);
    const diff = (cand.getTime() - today.getTime()) / 86400000;
    if (diff < -180) y += 1;
    else if (diff > 180) y -= 1;
  }
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
