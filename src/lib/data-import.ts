import Papa from "papaparse";
import { normalize } from "./template-string";
import type { DataRecord, FieldDef, Template } from "./types";

export function parseCsv(text: string): { columns: string[]; rows: Record<string, string>[] } {
  const res = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    delimitersToGuess: [",", ";", "\t", "|"],
  });
  if (res.errors.length && !res.data.length) throw new Error("CSV se nepodařilo přečíst: " + res.errors[0].message);
  const columns = res.meta.fields ?? [];
  return { columns, rows: res.data.map((r) => Object.fromEntries(columns.map((c) => [c, (r[c] ?? "").toString().trim()]))) };
}

export function parseJson(text: string): Record<string, unknown>[] | Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Neplatný JSON: " + (e as Error).message);
  }
}

/** Z libovolného JSON udělá pole záznamů (najde první pole v objektu) */
export function toRows(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  if (json && typeof json === "object") {
    for (const v of Object.values(json)) if (Array.isArray(v) && v.length && typeof v[0] === "object") return v as Record<string, unknown>[];
    return [json as Record<string, unknown>];
  }
  return [];
}

// pomlčky: - \u2013 \u2014 (regexy jako řetězce kvůli bezpečnému kódování v bundlu)
const DASH = "[\\-\\u2013\\u2014]";
const RESULT_RE = new RegExp(`^(.+?)\\s+${DASH}\\s+(.+?)\\s+(\\d{1,3})\\s*[:\\-\\u2013]\\s*(\\d{1,3})(?:\\s*\\((.*)\\))?\\s*$`);
const SCHEDULE_RE = new RegExp(`^(.+?)\\s+${DASH}\\s+(.+?)\\s+(\\d{1,2})\\.\\s*(\\d{1,2})\\.(?:\\s*(\\d{4}))?\\s+(\\d{1,2}[:.]\\d{2})\\s*$`);

/**
 * Rychlé zadání výsledků textem, jeden zápas na řádek:
 *   Nymburk – Brno 92:78
 *   Opava - Děčín 81:76 (18:22, 23:17, 20:19, 20:18)
 */
export function parseResultLines(text: string) {
  const out: Record<string, unknown>[] = [];
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = RESULT_RE.exec(line);
    if (m) out.push({ home: m[1].trim(), away: m[2].trim(), home_score: Number(m[3]), away_score: Number(m[4]), detail: (m[5] ?? "").replace(/,\s*/g, " | ") });
  }
  return out;
}

/** Rozvrh textem: "USK Praha – Sluneta 26.9. 17:30" */
export function parseScheduleLines(text: string, year = new Date().getFullYear()) {
  const out: Record<string, unknown>[] = [];
  for (const raw of text.split(/\n+/)) {
    const m = SCHEDULE_RE.exec(raw.trim());
    if (m) {
      const y = m[5] ? +m[5] : year;
      out.push({
        home: m[1].trim(),
        away: m[2].trim(),
        date: `${y}-${m[4].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
        time: m[6].replace(".", ":"),
      });
    }
  }
  return out;
}

// ── Mapování sloupců na pole šablony ─────────────────────────

const SYNONYMS: Record<string, string[]> = {
  player: ["hrac", "jmeno a prijmeni", "name", "player name", "hráč"],
  first_name: ["jmeno", "first", "firstname", "krestni jmeno"],
  last_name: ["prijmeni", "last", "lastname", "surname"],
  number: ["cislo", "dres", "#", "no", "jersey"],
  position: ["post", "pozice", "pos"],
  height: ["vyska", "cm"],
  age: ["vek", "roky"],
  home_team: ["home", "domaci", "team1", "home team"],
  away_team: ["away", "hoste", "team2", "away team", "guest"],
  home_score: ["home points", "skore domaci", "score1", "hs"],
  away_score: ["away points", "skore hoste", "score2", "as"],
  nationality: ["narodnost", "nation", "country", "stat"],
  date: ["datum", "day"],
  time: ["cas", "hour"],
  venue: ["misto", "hala", "arena"],
};

/** Zdroj hodnoty: "col:Název sloupce", "first:Sloupec" (1. slovo), "last:Sloupec" (zbytek), "" = výchozí hodnota šablony */
export type Mapping = Record<string, string>;

export function autoMap(fields: FieldDef[], columns: string[]): Mapping {
  const m: Mapping = {};
  const cols = columns.map((c) => ({ c, n: normalize(c) }));
  for (const f of fields) {
    if (f.type === "list" || f.type === "image") continue;
    const keys = [normalize(f.key), normalize(f.key.replace(/_/g, " ")), normalize(f.label), ...(SYNONYMS[f.key] ?? []).map(normalize)];
    const hit = cols.find((c) => keys.includes(c.n));
    if (hit) {
      m[f.key] = `col:${hit.c}`;
      continue;
    }
    // jméno/příjmení z jednoho sloupce "player"
    const nameCol = cols.find((c) => ["player", "hrac", "name", "jmeno a prijmeni"].includes(c.n));
    if (nameCol && f.key === "first_name") m[f.key] = `first:${nameCol.c}`;
    if (nameCol && f.key === "last_name") m[f.key] = `last:${nameCol.c}`;
    if (nameCol && f.key === "player") m[f.key] = `col:${nameCol.c}`;
  }
  return m;
}

export function applyMapping(t: Template, row: Record<string, unknown>, mapping: Mapping, base: DataRecord = t.sampleData): DataRecord {
  const data: DataRecord = { ...base };
  for (const [key, src] of Object.entries(mapping)) {
    if (!src) continue;
    const [kind, ...rest] = src.split(":");
    const col = rest.join(":");
    const v = row[col];
    const s = v === undefined || v === null ? "" : String(v).trim();
    if (kind === "col") data[key] = s;
    if (kind === "first") data[key] = s.split(/\s+/)[0] ?? "";
    if (kind === "last") data[key] = s.split(/\s+/).slice(1).join(" ");
  }
  return data;
}

export function mappingOptions(columns: string[]) {
  const opts: { value: string; label: string }[] = [{ value: "", label: "— výchozí ze šablony —" }];
  for (const c of columns) {
    opts.push({ value: `col:${c}`, label: c });
    opts.push({ value: `first:${c}`, label: `${c} → 1. slovo` });
    opts.push({ value: `last:${c}`, label: `${c} → zbytek` });
  }
  return opts;
}
