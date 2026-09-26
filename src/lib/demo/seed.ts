import type { Asset, BrandKit, Dataset, Project, Team, Template } from "../types";
import { DEMO_REPRE_TEAMS, DEMO_TEAMS, PLAYERS, PROGRAM_3_KOLO, RESULTS_2_KOLO, STANDINGS } from "./data";
import { makeArena, makeBallPhoto, makePlayerCutout, makeWordmark } from "./procedural";
import { buildTemplates } from "./templates";
import { OBASKETU_BG } from "./obasketu-bg";

export const SEED_VERSION = 2;
export const BG_ASSET = "p-nbl-bg0";

export const SHARED = "shared";

export function defaultBrand(): BrandKit {
  return {
    colors: { primary: "#5B21B6", secondary: "#2A0B5E", accent: "#FF6A13", dark: "#0B0614", light: "#FFFFFF", text: "#FFFFFF" },
    fonts: { display: { family: "Bebas Neue" }, body: { family: "Barlow Condensed" }, accent: { family: "Barlow" } },
    backgrounds: [],
    elements: [],
    locks: { logo: true, colors: true, fonts: true, photos: false, text: false },
  };
}

const teamsFrom = (pid: string, list: Omit<Team, "id">[]): Team[] => list.map((t, i) => ({ ...t, id: `${pid}-team-${i}` }));

export async function seedDemo(): Promise<{ projects: Project[]; templates: Template[]; assets: Asset[]; datasets: Dataset[] }> {
  const now = Date.now();
  const shared = {
    arena: "demo-arena",
    ball: "demo-ball",
    player: "demo-player",
  };
  const [ball, logoNbl, logoRepre] = await Promise.all([makeBallPhoto(), makeWordmark("obasketu"), makeWordmark("repre", "#FFFFFF", "#D7141A")]);
  const assets: Asset[] = [
    { id: shared.arena, projectId: SHARED, name: "Demo – hala", kind: "photo", dataUrl: makeArena(), w: 1600, h: 2000, createdAt: now },
    { id: shared.ball, projectId: SHARED, name: "Demo – míč", kind: "photo", dataUrl: ball, w: 1600, h: 2000, createdAt: now },
    { id: shared.player, projectId: SHARED, name: "Demo – hráč (bez pozadí)", kind: "photo", dataUrl: makePlayerCutout(), w: 1000, h: 1300, createdAt: now },
  ];

  const nbl: Project = {
    id: "p-nbl",
    name: "NBL",
    parentName: "Obasketu.cz",
    brand: { ...defaultBrand(), logo: "p-nbl-logo", backgrounds: [BG_ASSET] },
    teams: teamsFrom("p-nbl", DEMO_TEAMS),
    createdAt: now,
  };
  const repre: Project = {
    id: "p-repre",
    name: "Reprezentace",
    parentName: "Obasketu.cz",
    brand: {
      ...defaultBrand(),
      colors: { primary: "#11457E", secondary: "#0B2A52", accent: "#D7141A", dark: "#06142A", light: "#FFFFFF", text: "#FFFFFF" },
      fonts: { display: { family: "Anton" }, body: { family: "Barlow Condensed" }, accent: { family: "Barlow" } },
      logo: "p-repre-logo",
    },
    teams: teamsFrom("p-repre", DEMO_REPRE_TEAMS),
    createdAt: now + 1,
  };
  assets.push(
    { id: "p-nbl-logo", projectId: nbl.id, name: "Logo (demo)", kind: "logo", dataUrl: logoNbl, createdAt: now },
    { id: "p-repre-logo", projectId: repre.id, name: "Logo (demo)", kind: "logo", dataUrl: logoRepre, createdAt: now },
    bgAsset(),
  );

  const templates = [...buildTemplates(nbl.id, shared), ...buildTemplates(repre.id, shared)];
  // Reprezentace: přepsat ukázková data na národní týmy
  for (const t of templates.filter((x) => x.projectId === repre.id)) {
    const d = { ...t.sampleData };
    if ("home_team" in d) d.home_team = "Česko";
    if ("away_team" in d) d.away_team = "Srbsko";
    if ("competition" in d) d.competition = "Kvalifikace MS 2027";
    if ("venue" in d) d.venue = "O2 universum, Praha";
    t.sampleData = d;
  }

  const ds = (id: string, name: string, kind: Dataset["kind"], rows: Dataset["rows"], source?: string): Dataset => ({
    id: `${nbl.id}-${id}`,
    projectId: nbl.id,
    name,
    kind,
    rows,
    source,
    updatedAt: now,
  });
  const datasets: Dataset[] = [
    ds("program", "Program 3. kola", "json", PROGRAM_3_KOLO),
    ds("results", "Výsledky 2. kola", "csv", RESULTS_2_KOLO),
    ds("standings", "Tabulka po 2. kole", "json", STANDINGS),
    ds("roster", "Soupiska Basket Brno", "csv", PLAYERS),
  ];

  return { projects: [nbl, repre], templates, assets, datasets };
}

export function bgAsset(): Asset {
  return { id: BG_ASSET, projectId: "p-nbl", name: "Pozadí OBASKETU", kind: "background", dataUrl: OBASKETU_BG, w: 1024, h: 1024, createdAt: Date.now() };
}

/** Aktualizace demo obsahu u existujících instalací (jen neupravené vestavěné šablony). */
export function upgradeTemplates(projectId: string): Template[] {
  const list = buildTemplates(projectId, { arena: "demo-arena", ball: "demo-ball", player: "demo-player" }).filter((t) => /-(result|program)$/.test(t.id));
  if (projectId === "p-repre")
    for (const t of list) if ("home_team" in t.sampleData) t.sampleData = { ...t.sampleData, home_team: "Česko", away_team: "Srbsko" };
  return list;
}
