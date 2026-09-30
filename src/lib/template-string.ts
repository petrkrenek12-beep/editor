import type { DataRecord, DataValue, ImageValue, Team } from "./types";

export interface RenderContext {
  data: DataRecord;
  teams: Team[];
  /** Řádek seznamu (pokud se vykresluje uvnitř list) */
  row?: Record<string, unknown>;
  rowIndex?: number;
  page?: number;
  pages?: number;
}

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Najde tým podle názvu, zkratky nebo aliasu (bez diakritiky, přibližně). */
export function findTeam(teams: Team[], name: string | undefined | null): Team | undefined {
  if (!name) return undefined;
  const n = normalize(String(name));
  if (!n) return undefined;
  const exact = teams.find(
    (t) => normalize(t.name) === n || normalize(t.short) === n || t.aliases.some((a) => normalize(a) === n),
  );
  if (exact) return exact;
  return teams.find(
    (t) =>
      normalize(t.name).includes(n) ||
      n.includes(normalize(t.short)) ||
      t.aliases.some((a) => {
        const na = normalize(a);
        return na.length > 2 && (n.includes(na) || na.includes(n));
      }),
  );
}

export function getValue(ctx: RenderContext, key: string): DataValue {
  const k = key.trim();
  if (k === "#" || k === "index") return (ctx.rowIndex ?? 0) + 1;
  if (k === "page") return ctx.page ?? 1;
  if (k === "pages") return ctx.pages ?? 1;
  if (k === "odd") return (ctx.rowIndex ?? 0) % 2 === 0 ? "1" : "";
  if (k === "even") return (ctx.rowIndex ?? 0) % 2 === 1 ? "1" : "";
  if (ctx.row && k in ctx.row) return ctx.row[k] as DataValue;
  if (k.startsWith("row.") && ctx.row) return ctx.row[k.slice(4)] as DataValue;
  return ctx.data[k];
}

export function valueToString(v: DataValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if (Array.isArray(v)) return v.length + " položek";
    if ("asset" in v) return (v as ImageValue).asset;
    return "";
  }
  return String(v);
}

const CZ_DAYS = ["NEDĚLE", "PONDĚLÍ", "ÚTERÝ", "STŘEDA", "ČTVRTEK", "PÁTEK", "SOBOTA"];

function parseDate(s: string): Date | null {
  // podporuje 2026-09-26, 26. 9. 2026, 26.9.2026
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const cz = /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})?/.exec(s);
  if (cz) return new Date(cz[3] ? +cz[3] : new Date().getFullYear(), +cz[2] - 1, +cz[1]);
  return null;
}

function applyFilter(val: string, filter: string, ctx: RenderContext): string {
  const [name, ...argParts] = filter.split(":");
  const arg = argParts.join(":");
  switch (name.trim()) {
    case "upper":
      return val.toLocaleUpperCase("cs-CZ");
    case "lower":
      return val.toLocaleLowerCase("cs-CZ");
    case "short": {
      const t = findTeam(ctx.teams, val);
      return t ? t.short : val;
    }
    case "team": {
      const t = findTeam(ctx.teams, val);
      return t ? t.name : val;
    }
    case "day": {
      const d = parseDate(val);
      return d ? CZ_DAYS[d.getDay()] : val;
    }
    case "date": {
      const d = parseDate(val);
      if (!d) return val;
      if (arg === "short") return `${d.getDate()}.${d.getMonth() + 1}.`;
      return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
    }
    case "default":
      return val || arg;
    case "pct": {
      // úspěšnost jako na Livesportu: 0.667 / 1.000
      const n = Number(val.replace(",", "."));
      if (val.trim() === "" || !isFinite(n)) return val;
      return (n > 1 ? n / 100 : n).toFixed(Number(arg) || 3);
    }
    case "pad":
      return val.padStart(Number(arg) || 2, "0");
    default:
      return val;
  }
}

/** "{{home_team|upper}} – {{away_team}}" → text */
export function interpolate(tpl: string, ctx: RenderContext): string {
  return tpl.replace(/\{\{([^}]+)\}\}/g, (_, expr: string) => {
    // {{@join: · |position|height: cm|age: let}} – spojí jen vyplněné části
    if (expr.startsWith("@join:")) {
      const [sep, ...parts] = expr.slice(6).split("|");
      return parts
        .map((p) => {
          const i = p.indexOf(":");
          const key = (i >= 0 ? p.slice(0, i) : p).trim();
          const suffix = i >= 0 ? p.slice(i + 1) : "";
          const v = valueToString(getValue(ctx, key)).trim();
          return v ? v + suffix : "";
        })
        .filter(Boolean)
        .join(sep);
    }
    const [key, ...filters] = expr.split("|");
    let v = valueToString(getValue(ctx, key));
    for (const f of filters) v = applyFilter(v, f, ctx);
    return v;
  });
}

/** Pole použitá v textu šablony */
export function referencedKeys(tpl: string): string[] {
  const out: string[] = [];
  tpl.replace(/\{\{([^}|]+)/g, (_, k: string) => {
    out.push(k.trim());
    return "";
  });
  return out;
}

export function isEmptyValue(v: DataValue) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object" && "asset" in v) return !(v as ImageValue).asset;
  return false;
}

/**
 * Podmínka zobrazení: "klíč" (vyplněno) nebo porovnání "pos <= 8", "pos > zone1_to",
 * pravá strana může být číslo nebo klíč pole.
 */
export function evalCondition(ctx: RenderContext, expr: string): boolean {
  if (expr.includes("||")) return expr.split("||").some((e) => evalCondition(ctx, e.trim()));
  if (expr.includes("&&")) return expr.split("&&").every((e) => evalCondition(ctx, e.trim()));
  const m = /^\s*([^<>=!\s]+)\s*(<=|>=|==|!=|<|>)\s*(.+?)\s*$/.exec(expr);
  if (!m) return !isEmptyValue(getValue(ctx, expr));
  const num = (x: string) => {
    const v = /^-?\d+(\.\d+)?$/.test(x) ? x : valueToString(getValue(ctx, x));
    return Number(String(v).replace(",", "."));
  };
  const a = num(m[1]);
  const b = num(m[3]);
  if (!isFinite(a) || !isFinite(b)) return false;
  switch (m[2]) {
    case "<=": return a <= b;
    case ">=": return a >= b;
    case "<": return a < b;
    case ">": return a > b;
    case "==": return a === b;
    default: return a !== b;
  }
}
