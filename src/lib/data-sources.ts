// ─────────────────────────────────────────────────────────────
// Datové zdroje – oddělené od šablon (DATA → TEMPLATE → RENDERER)
// Jakékoli sportovní API stačí obalit rozhraním SportsDataProvider.
// ─────────────────────────────────────────────────────────────
import { HAS_SERVER } from "./runtime";
import { parseCsv, toRows } from "./data-import";
import { PLAYERS, PROGRAM_3_KOLO, RESULTS_2_KOLO, STANDINGS, DEMO_TEAMS } from "./demo/data";

export type SportsResource = "matches" | "results" | "teams" | "players" | "standings" | "competitions";

export interface SportsDataProvider {
  id: string;
  name: string;
  get(resource: SportsResource, params?: Record<string, string>): Promise<Record<string, unknown>[]>;
}

export const SPORTS_RESOURCES: { id: SportsResource; label: string; endpoint: string }[] = [
  { id: "matches", label: "Zápasy (program)", endpoint: "/matches" },
  { id: "results", label: "Výsledky", endpoint: "/results" },
  { id: "teams", label: "Týmy", endpoint: "/teams" },
  { id: "players", label: "Hráči", endpoint: "/players" },
  { id: "standings", label: "Tabulka", endpoint: "/standings" },
  { id: "competitions", label: "Soutěže", endpoint: "/competitions" },
];

export const DEMO_API_DATA: Record<SportsResource, Record<string, unknown>[]> = {
  matches: PROGRAM_3_KOLO,
  results: RESULTS_2_KOLO,
  teams: DEMO_TEAMS.map((t) => ({ name: t.name, short: t.short, color: t.color })),
  players: PLAYERS,
  standings: STANDINGS,
  competitions: [
    { id: "nbl", name: "Maxa NBL", season: "2026/27" },
    { id: "zbl", name: "Ženská basketbalová liga", season: "2026/27" },
  ],
};

/** Vestavěný demo zdroj (funguje i bez serveru) */
export const demoProvider: SportsDataProvider = {
  id: "demo",
  name: "Demo NBL (vestavěné)",
  async get(resource) {
    return DEMO_API_DATA[resource] ?? [];
  },
};

/** Obecné REST API: GET {baseUrl}/matches, /teams, /players, /standings, /competitions */
export function restProvider(baseUrl: string, headers: Record<string, string> = {}): SportsDataProvider {
  const base = baseUrl.replace(/\/$/, "");
  return {
    id: "rest:" + base,
    name: base,
    async get(resource, params) {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      const text = await fetchText(`${base}/${resource}${qs}`, headers);
      return toRows(JSON.parse(text));
    },
  };
}

/** Stáhne URL – když prohlížeči vadí CORS a běžíme na serveru, jde přes /api/proxy */
export async function fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const direct = async () => {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`Server vrátil ${r.status}`);
    return r.text();
  };
  try {
    return await direct();
  } catch (e) {
    if (!HAS_SERVER || url.startsWith("/")) throw e;
    const r = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
    if (!r.ok) throw new Error(`Načtení přes server selhalo (${r.status}): ${await r.text()}`);
    return r.text();
  }
}

/** URL se CSV nebo JSON → záznamy */
export async function loadFromUrl(url: string): Promise<Record<string, unknown>[]> {
  const text = await fetchText(url);
  const trimmed = text.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return toRows(JSON.parse(trimmed));
  return parseCsv(trimmed).rows;
}
