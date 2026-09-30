import type { Asset, BrandKit, Channel, Dataset, ImageElement, ListElement, Project, Team, Template, TemplateElement, TextElement } from "../types";
import { DEMO_REPRE_TEAMS, DEMO_TEAMS, PLAYERS, PROGRAM_3_KOLO, RESULTS_2_KOLO, STANDINGS } from "./data";
import { makeArena, makeBallPhoto, makePlayerCutout, makeWordmark } from "./procedural";
import { buildTemplates } from "./templates";
import { OBASKETU_BG } from "./obasketu-bg";
import { STAR_PNG } from "./star";
import { ROWS_BG } from "./rows-bg";
import { BAR_PNG } from "./bar";

export const SEED_VERSION = 7;
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
    brand: { ...defaultBrand(), logo: "p-nbl-logo", backgrounds: [BG_ASSET], channels: defaultChannels() },
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
    starAsset(),
    rowsBgAsset(),
    barAsset(),
  );

  const templates = [...builtInTemplates(nbl.id), ...builtInTemplates(repre.id)];

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

/** Vestavěné šablony projektu v aktuální verzi návrhu. */
export function builtInTemplates(projectId: string): Template[] {
  const list = buildTemplates(projectId, { arena: "demo-arena", ball: "demo-ball", player: "demo-player" });
  for (const t of list) t.rev = SEED_VERSION;
  if (projectId === "p-repre")
    for (const t of list) {
      const d = { ...t.sampleData };
      if ("home_team" in d) d.home_team = "Česko";
      if ("away_team" in d) d.away_team = "Srbsko";
      if ("competition" in d) d.competition = "Kvalifikace MS 2027";
      if ("venue" in d) d.venue = "O2 universum, Praha";
      t.sampleData = d;
    }
  return list;
}

/**
 * Aktualizace jedné šablony na aktuální verzi aplikace:
 *  - neupravená vestavěná šablona ze starší verze → nahradí se novým návrhem
 *  - upravená šablona → jen bezpečné migrace (bílá loga, pozadí řádků, TV)
 * Vrací null, když není co měnit.
 */
export function upgradeTemplate(t: Template): Template | null {
  const pid = /^(p-nbl|p-repre)-/.exec(t.id)?.[1];
  if (t.builtIn && pid && (t.rev ?? 0) < SEED_VERSION) {
    const fresh = builtInTemplates(pid).find((x) => x.id === t.id);
    if (fresh) return { ...fresh, createdAt: t.createdAt };
  }
  return migrateTemplateV4(t);
}

/** Původní podoba vestavěné šablony (pro „Obnovit původní návrh“). */
export function originalTemplate(id: string): Template | undefined {
  const pid = /^(p-nbl|p-repre)-/.exec(id)?.[1];
  return pid ? builtInTemplates(pid).find((x) => x.id === id) : undefined;
}

export function starAsset(): Asset {
  return { id: "demo-star", projectId: SHARED, name: "Hvězda (hráč zápasu)", kind: "element", dataUrl: STAR_PNG, w: 81, h: 81, createdAt: Date.now() };
}

export const ROWS_BG_ASSET = "demo-rows-bg";

export function rowsBgAsset(): Asset {
  return { id: ROWS_BG_ASSET, projectId: SHARED, name: "Pozadí řádků programu", kind: "background", dataUrl: ROWS_BG, w: 1402, h: 1122, createdAt: Date.now() };
}

export function defaultChannels(): Channel[] {
  return [{ id: "ch-prima-sport", name: "Prima Sport" }];
}

/**
 * Migrace v4 pro šablony, které uživatel upravil:
 *  - loga týmů s bílým „tintem“ → bílá varianta loga (Team.logoWhite)
 *  - program: obrázek v každém řádku → jedno společné pozadí přes všechny řádky, + sloupec TV
 * Vrací null, když se nic nezměnilo.
 */
export function migrateTemplateV4(t: Template): Template | null {
  let changed = false;
  const fixEl = (el: TemplateElement): TemplateElement => {
    if (el.type === "image" && el.src.trim().startsWith("team:") && el.tint && /^#?f{3}(f{3})?$/i.test(el.tint.replace("#", "#"))) {
      changed = true;
      const { tint: _t, ...rest } = el;
      return { ...(rest as ImageElement), logoVariant: "white" };
    }
    if (el.type === "list") {
      let children = el.children.map(fixEl);
      let rowsBg = el.rowsBg;
      const slot = children.find((c) => c.type === "image" && c.id === "bgimg") as ImageElement | undefined;
      if (slot && !rowsBg) {
        const src = slot.src.trim();
        rowsBg = { src: src && src !== "asset:" ? src : `asset:${ROWS_BG_ASSET}`, radius: slot.radius ?? 20, opacity: slot.opacity ?? 0.5, backing: "#000000" };
        children = children.filter((c) => c !== slot && !(c.type === "rect" && c.id === "bg"));
        changed = true;
      }
      // v5: pod pozadí řádků plná černá (jako v Affinity), výchozí obrázek na 50 %
      if (rowsBg && rowsBg.backing === undefined) {
        rowsBg = { ...rowsBg, backing: "#000000", opacity: rowsBg.opacity ?? (rowsBg.src === `asset:${ROWS_BG_ASSET}` ? 0.5 : undefined) };
        changed = true;
      }
      if (/-program$/.test(t.id) && el.field === "games" && !children.some((c) => c.id === "tv")) {
        changed = true;
        children = children.map((c) => (c.type === "text" && (c.id === "day" || c.id === "time") ? { ...c, hideIf: "tv" } : c));
        const day = children.find((c) => c.id === "day") as TextElement | undefined;
        const time = children.find((c) => c.id === "time") as TextElement | undefined;
        const idx = children.findIndex((c) => c.id === "time");
        const extra: TemplateElement[] = [];
        if (day) extra.push({ ...day, id: "day-tv", name: "Den (s TV)", hideIf: undefined, showIf: "tv", frame: { ...day.frame, y: 4, h: 52 }, size: Math.round((day.size ?? 62) * 0.9) } as TextElement);
        if (time) extra.push({ ...time, id: "time-tv", name: "Čas (s TV)", hideIf: undefined, showIf: "tv", frame: { ...time.frame, y: 52, h: 40 }, size: Math.round((time.size ?? 40) * 0.95) } as TextElement);
        const fx = day?.frame ?? { x: 160, y: 0, w: 229, h: 0 };
        extra.push({ id: "tv", name: "Logo TV", type: "image", frame: { x: fx.x + 25, y: 93, w: fx.w - 50, h: 30 }, src: "channel:{{tv}}", fit: "contain", showIf: "tv", fallback: "none" } as ImageElement);
        children.splice(idx >= 0 ? idx + 1 : children.length, 0, ...extra);
      }
      if (children !== el.children || rowsBg !== el.rowsBg) return { ...el, children, rowsBg } as ListElement;
    }
    return el;
  };
  const elements = t.elements.map(fixEl);
  let fields = t.fields;
  if (/-program$/.test(t.id)) {
    fields = t.fields.map((f) =>
      f.type === "list" && f.key === "games" && !(f.columns ?? []).some((c) => c.key === "tv")
        ? ((changed = true), { ...f, columns: [...(f.columns ?? []), { key: "tv", label: "TV", type: "channel" as const }] })
        : f,
    );
  }
  return changed ? { ...t, elements, fields } : null;
}

export function barAsset(): Asset {
  return { id: "demo-bar", projectId: SHARED, name: "Oranžová čárka (před jménem)", kind: "element", dataUrl: BAR_PNG, w: 14, h: 72, createdAt: Date.now() };
}
