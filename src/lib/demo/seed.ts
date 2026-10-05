import type { Asset, BrandKit, Channel, Dataset, ImageElement, ListElement, Project, Team, Template, TemplateElement, TextElement } from "../types";
import { DEMO_REPRE_TEAMS, DEMO_TEAMS, PLAYERS, PROGRAM_3_KOLO, RESULTS_2_KOLO, STANDINGS } from "./data";
import { makeArena, makeBallPhoto, makePlayerCutout, makeWordmark } from "./procedural";
import { buildTemplates } from "./templates";
import { OBASKETU_BG } from "./obasketu-bg";
import { STAR_PNG } from "./star";
import { ROWS_BG } from "./rows-bg";
import { BAR_PNG } from "./bar";
import { MAZZARD } from "./mazzard";
import { LINES_JPG } from "./lines";
import { BCL_BG, BCL_KVIS, BCL_KVIS_W, BCL_LOGO, BCL_LOGO_SIZE, BCL_LOGO_WHITE, BCL_SLAVIA, BCL_SLAVIA_W } from "./bcl";
import { ZBL_BG, ZBL_LOGO, ZBL_LOGO_SIZE, ZBL_ROWS_BG, ZBL_TEAMS } from "./zbl";

export const SEED_VERSION = 18;
export const BG_ASSET = "p-nbl-bg0";

export const SHARED = "shared";

export function defaultBrand(): BrandKit {
  return {
    colors: { primary: "#5B21B6", secondary: "#2A0B5E", accent: "#FF4800", dark: "#0B0614", light: "#FFFFFF", text: "#FFFFFF" },
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
    linesAsset(),
    ...fontAssets(),
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

  const zbl = zblProject(nbl.brand, now + 2);
  const bcl = bclProject(nbl.brand, now + 3);
  assets.push(...bcl.assets, { id: "p-bcl-logo", projectId: "p-bcl", name: "Logo (demo)", kind: "logo", dataUrl: logoNbl, createdAt: now });
  templates.push(...builtInTemplates("p-bcl"));
  assets.push(...zbl.assets, { id: "p-zbl-logo", projectId: "p-zbl", name: "Logo (demo)", kind: "logo", dataUrl: logoNbl, createdAt: now });
  templates.push(...builtInTemplates("p-zbl"));
  return { projects: [nbl, repre, zbl.project, bcl.project], templates, assets, datasets };
}

export function bgAsset(): Asset {
  return { id: BG_ASSET, projectId: "p-nbl", name: "Pozadí OBASKETU", kind: "background", dataUrl: OBASKETU_BG, w: 1024, h: 1024, createdAt: Date.now() };
}

/** Vestavěné šablony projektu v aktuální verzi návrhu. */
export function builtInTemplates(projectId: string): Template[] {
  if (projectId === "p-zbl") return zblTemplates();
  if (projectId === "p-bcl") return bclTemplates();
  const list = buildTemplates(projectId, { arena: "demo-arena", ball: "demo-ball", player: "demo-player" }).filter((t) => !t.id.endsWith("-bcl-program"));
  for (const t of list) {
    t.rev = SEED_VERSION;
    t.baseHash = designHash(t);
  }
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
  const pid = /^(p-nbl|p-repre|p-zbl|p-bcl)-/.exec(t.id)?.[1];
  if (t.builtIn && pid) {
    const fresh = builtInTemplates(pid).find((x) => x.id === t.id);
    if (fresh && (t.baseHash !== fresh.baseHash || (t.rev ?? 0) < SEED_VERSION)) return { ...fresh, createdAt: t.createdAt };
  }
  return migrateTemplateV4(t);
}

/** Původní podoba vestavěné šablony (pro „Obnovit původní návrh“). */
export function originalTemplate(id: string): Template | undefined {
  const pid = /^(p-nbl|p-repre|p-zbl|p-bcl)-/.exec(id)?.[1];
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

/** Písmo Mazzard H (pás „Změna v týmu“, Breaking news) – sdílené pro všechny projekty. */
export function fontAssets(): Asset[] {
  return MAZZARD.map((f) => ({ id: "font-" + f.name.replace(/\.otf$/, "").toLowerCase(), projectId: SHARED, name: f.name, kind: "font" as const, dataUrl: f.dataUrl, createdAt: Date.now() }));
}

export function linesAsset(): Asset {
  return { id: "demo-lines", projectId: SHARED, name: "Čáry – míč (režim Screen)", kind: "element", dataUrl: LINES_JPG, w: 1536, h: 1024, createdAt: Date.now() };
}

/** Otisk návrhu šablony (prvky, pole, pozadí) – mění se jen když se změní návrh. */
export function designHash(t: Pick<Template, "elements" | "fields" | "background" | "paginate">): string {
  const str = JSON.stringify([t.elements, t.fields, t.background, t.paginate ?? null]);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Upravená šablona, ke které mezitím vyšel novější vestavěný návrh. */
export function newerDesign(t: Template): Template | undefined {
  if (t.builtIn) return undefined;
  const o = originalTemplate(t.id);
  if (!o || t.baseHash === o.baseHash) return undefined;
  if (designHash(t) === o.baseHash) return undefined;
  return o;
}

// ── ŽBL (ženská liga) ───────────────────────────────────────

export const ZBL_IDS = ["result", "results-panorama", "results-round", "program", "standings", "player-stats", "transfer", "breaking"];

/** Projekt ŽBL: zelené pozadí, logo Chance ŽBL, týmy s barevnými i bílými logy. Brand (logo, fonty) převezme z NBL. */
export function zblProject(nblBrand: BrandKit, createdAt = Date.now()): { project: Project; assets: Asset[] } {
  const pid = "p-zbl";
  const assets: Asset[] = [
    { id: "p-zbl-bg0", projectId: pid, name: "Pozadí ŽBL", kind: "background", dataUrl: ZBL_BG, w: 1080, h: 1350, createdAt },
    { id: "p-zbl-league", projectId: pid, name: "Chance ŽBL", kind: "logo", dataUrl: ZBL_LOGO, w: ZBL_LOGO_SIZE[0], h: ZBL_LOGO_SIZE[1], createdAt },
    { id: "zbl-rows-bg2", projectId: pid, name: "Pozadí řádků programu (ŽBL)", kind: "background", dataUrl: ZBL_ROWS_BG, w: 1254, h: 1254, createdAt },
  ];
  const teams: Team[] = ZBL_TEAMS.map((t, i) => {
    const id = `${pid}-team-${i}`;
    assets.push(
      { id: `${id}-logo`, projectId: pid, name: `${t.name} logo`, kind: "team", dataUrl: t.logo, createdAt },
      { id: `${id}-logo-w`, projectId: pid, name: `${t.name} logo bílé`, kind: "team", dataUrl: t.logoWhite, createdAt },
    );
    return { id, name: t.name, short: t.short, aliases: t.aliases, color: t.color, color2: t.color2, logo: `${id}-logo`, logoWhite: `${id}-logo-w` };
  });
  const project: Project = {
    id: pid,
    name: "ŽBL",
    parentName: nblBrand ? "Obasketu.cz" : undefined,
    brand: {
      ...nblBrand,
      colors: { primary: "#0E6B3A", secondary: "#06331B", accent: "#FF4800", dark: "#040D07", light: "#FFFFFF", text: "#FFFFFF" },
      logo: "p-zbl-logo",
      logoAlt: undefined,
      partnerLogo: "p-zbl-league",
      backgrounds: ["p-zbl-bg0"],
      elements: [],
      channels: nblBrand.channels ?? defaultChannels(),
    },
    teams,
    createdAt,
  };
  return { project, assets };
}

/** Šablony NBL přepsané pro ženskou ligu (hráčka, ŽBL týmy, zelené pozadí řádků). */
function zblTemplates(): Template[] {
  const base = buildTemplates("p-zbl", { arena: "demo-arena", ball: "demo-ball", player: "demo-player" }).filter((t) => ZBL_IDS.includes(t.id.replace(/^p-zbl-/, "")));
  const T = ZBL_TEAMS.map((t) => t.name);
  const fem: [RegExp, string][] = [
    [/Hráč zápasu/g, "Hráčka zápasu"],
    [/Statistiky hráče/g, "Statistiky hráčky"],
    [/Fotka hráče/g, "Fotka hráčky"],
    [/Hráč vlevo/g, "Hráčka vlevo"],
    [/Hráč vpravo/g, "Hráčka vpravo"],
    [/Hráč nad přechodem/g, "Hráčka nad přechodem"],
    [/Hráč před pásem/g, "Hráčka před pásem"],
    [/hráči po stranách/g, "hráčky po stranách"],
    [/"Hráč"/g, '"Hráčka"'],
    [/Ořez hráče/g, "Ořez hráčky"],
    [/hráče nad pás/g, "hráčku nad pás"],
    [/hráč nad pás/g, "hráčka nad pás"],
    [/Vyřízne hráče/g, "Vyřízne hráčku"],
    [/asset:demo-rows-bg/g, "asset:zbl-rows-bg2"],
  ];
  const games = [
    [T[0], T[9], 81, 64, "21:14 | 19:18 | 22:16 | 19:16"],
    [T[1], T[8], 72, 75, "18:20 | 17:19 | 20:17 | 17:19"],
    [T[2], T[7], 88, 59, "24:12 | 20:15 | 22:18 | 22:14"],
    [T[3], T[6], 77, 70, "19:17 | 20:18 | 18:20 | 20:15"],
    [T[4], T[5], 66, 68, "15:16 | 18:17 | 16:19 | 17:16"],
  ];
  const mvps = ["Tereza Nováková (21 PTS, 9 REB)", "Klára Dvořáková (18 PTS, 6 AST)", "Anna Svobodová (16 PTS, 11 REB)", "Lucie Černá (19 PTS)", "Eliška Malá (17 PTS, 7 REB)"];
  return base.map((t) => {
    const nt = JSON.parse(fem.reduce((str, [re, to]) => str.replace(re, to), JSON.stringify(t))) as Template;
    const id = nt.id.replace(/^p-zbl-/, "");
    const d = { ...nt.sampleData };
    if (id === "result") Object.assign(d, { home_team: T[2], away_team: T[8], home_score: 78, away_score: 71, mvp: mvps[0] });
    if (id === "results-panorama")
      d.games = games.map((g, i) => ({ home: g[0], away: g[1], home_score: g[2], away_score: g[3], mvp: mvps[i], photo: { asset: i % 2 ? "demo-ball" : "demo-arena", zoom: 1, fx: 0.5, fy: 0.3 }, credit: "" }));
    if (id === "results-round") d.games = games.map((g) => ({ home: g[0], away: g[1], home_score: g[2], away_score: g[3], detail: g[4] }));
    if (id === "program") Object.assign(d, { dates: "4.10.", round: "2. kolo" });
    if (id === "standings") d.round_label = "Po 1. kole";
    if (id === "results-round") d.round = "1. kolo";
    if (id === "program") d.games = games.map((g, i) => ({ home: g[1], away: g[0], date: "2026-10-04", time: i < 2 ? "17:00" : "18:00", tv: "" }));
    if (id === "standings")
      d.rows = T.map((team, i) => ({ pos: i + 1, team, g: i < 8 ? 1 : 0, w: i < 4 ? 1 : 0, l: i >= 4 && i < 8 ? 1 : 0, pct: i < 4 ? "1.000" : i < 8 ? "0.000" : "" }));
    if (id === "player-stats") Object.assign(d, { player: "Tereza Nováková", s1_value: "21", s1_label: "PTS", s2_value: "9", s2_label: "REB", s3_value: "7/12", s3_label: "FG", opponent: T[3] });
    if (id === "transfer") Object.assign(d, { first_name: "Anna", last_name: "Králová", position: "Rozehrávačka", from_team: "", to_team: T[0] });
    if (id === "breaking") Object.assign(d, { headline: "Žabiny posilují pod košem" });
    if (id === "program") {
      // bez čar nahoře → nadpis a kolo na střed, méně zápasů → větší loga dole, pozadí řádků víc průhledné
      nt.elements = nt.elements
        .filter((e) => e.id !== "lines")
        .map((e) => {
          if (e.id === "title") return { ...e, frame: { ...e.frame, x: 140, w: 800 }, align: "center" } as TemplateElement;
          if (e.id === "pill-bg" || e.id === "pill") return { ...e, frame: { ...e.frame, x: 375 } } as TemplateElement;
          if (e.id === "partner") return { ...e, frame: { x: 290, y: 1112, w: 270, h: 108 } } as TemplateElement;
          if (e.id === "brand-logo") return { ...e, frame: { x: 586, y: 1108, w: 170, h: 116 } } as TemplateElement;
          if (e.type === "list" && e.rowsBg) return { ...e, rowsBg: { ...e.rowsBg, opacity: 0.42, backing: "#000000" } } as TemplateElement;
          return e;
        });
    }
    if (id === "standings") {
      // 10 týmů: 5 postupuje, 5 baráž; vyšší řádky, aby tabulka vyplnila panel
      Object.assign(d, { zone1_to: 5, zone2_to: 10, zone1_label: "Play-off", zone2_label: "Baráž" });
      const f = 74 / 62;
      nt.elements = nt.elements.map((e) => {
        if (e.type !== "list") return e;
        return {
          ...e,
          rowHeight: 74,
          gap: 4,
          children: e.children.map((c) => {
            const fr = { ...c.frame, y: c.frame.y * f, h: c.frame.h * f };
            if (c.type === "text") return { ...c, frame: fr, size: Math.round(c.size * 1.15) } as TemplateElement;
            if (c.type === "image") return { ...c, frame: { ...fr, x: c.frame.x - (c.frame.w * (f - 1)) / 2, w: c.frame.w * f } } as TemplateElement;
            return { ...c, frame: fr } as TemplateElement;
          }),
        } as TemplateElement;
      });
    }
    nt.sampleData = d;
    nt.rev = SEED_VERSION;
    nt.baseHash = designHash(nt);
    return nt;
  });
}

// ── BCL (Liga mistrů FIBA) ──────────────────────────────────

export function bclProject(nblBrand: BrandKit, createdAt = Date.now()): { project: Project; assets: Asset[] } {
  const pid = "p-bcl";
  const A = (id: string, name: string, kind: Asset["kind"], dataUrl: string, w?: number, h?: number): Asset => ({ id, projectId: pid, name, kind, dataUrl, w, h, createdAt });
  const assets: Asset[] = [
    A("p-bcl-bg0", "Pozadí BCL", "background", BCL_BG, 1080, 1350),
    A("p-bcl-league", "BCL (bílé)", "logo", BCL_LOGO_WHITE, BCL_LOGO_SIZE[0], BCL_LOGO_SIZE[1]),
    A("p-bcl-league-color", "BCL (barevné)", "logo", BCL_LOGO, BCL_LOGO_SIZE[0], BCL_LOGO_SIZE[1]),
    A("p-bcl-team-0-logo", "Slavia Praha logo", "team", BCL_SLAVIA),
    A("p-bcl-team-0-logo-w", "Slavia Praha logo bílé", "team", BCL_SLAVIA_W),
    A("p-bcl-team-1-logo", "BK Kvis Pardubice logo", "team", BCL_KVIS),
    A("p-bcl-team-1-logo-w", "BK Kvis Pardubice logo bílé", "team", BCL_KVIS_W),
  ];
  const teams: Team[] = [
    { id: "p-bcl-team-0", name: "Slavia Praha", short: "SLA", aliases: ["Slavia", "SK Slavia Praha", "Slavia Praha ERA NBK", "SKS"], color: "#E3001B", color2: "#FFFFFF", logo: "p-bcl-team-0-logo", logoWhite: "p-bcl-team-0-logo-w" },
    { id: "p-bcl-team-1", name: "BK Kvis Pardubice", short: "PAR", aliases: ["Pardubice", "Kvis Pardubice", "BK Pardubice"], color: "#E30613", color2: "#1D1D1B", logo: "p-bcl-team-1-logo", logoWhite: "p-bcl-team-1-logo-w" },
  ];
  const project: Project = {
    id: pid,
    name: "BCL",
    parentName: "Obasketu.cz",
    brand: {
      ...nblBrand,
      colors: { primary: "#22B8C4", secondary: "#0A1E4A", accent: "#FF4800", dark: "#020D24", light: "#FFFFFF", text: "#FFFFFF" },
      logo: "p-bcl-logo",
      logoAlt: undefined,
      partnerLogo: "p-bcl-league",
      backgrounds: ["p-bcl-bg0"],
      elements: [],
      channels: nblBrand.channels ?? defaultChannels(),
    },
    teams,
    createdAt,
  };
  return { project, assets };
}

function bclTemplates(): Template[] {
  const list = buildTemplates("p-bcl", { arena: "demo-arena", ball: "demo-ball", player: "demo-player" }).filter((t) => /-(result|bcl-program)$/.test(t.id));
  return list.map((t) => {
    if (t.id.endsWith("-result")) t.sampleData = { ...t.sampleData, home_team: "BK Kvis Pardubice", away_team: "Reggiana", home_score: 84, away_score: 79, mvp: "Martin Peterka (19 PTS, 6 REB)" };
    t.rev = SEED_VERSION;
    t.baseHash = designHash(t);
    return t;
  });
}
