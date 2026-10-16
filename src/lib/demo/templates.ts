// 16 předpřipravených sportovních šablon. Všechny barvy a fonty
// odkazují na Brand kit (@primary, display …), takže se přebarví
// podle projektu. Data jsou v sampleData, nikdy ne v prvcích.
import { FORMAT_ORDER } from "../formats";
import type {
  AnchorX,
  AnchorY,
  FieldDef,
  Fill,
  FormatId,
  ImageElement,
  LineElement,
  ListElement,
  PathElement,
  RectElement,
  Template,
  TemplateElement,
  TextElement,
  DataRecord,
} from "../types";
import { PROGRAM_3_KOLO, RESULTS_2_KOLO, STANDINGS } from "./data";

type Box = [number, number, number, number];
const F = ([x, y, w, h]: Box) => ({ x, y, w, h });

type Common = Partial<{
  anchorX: AnchorX;
  anchorY: AnchorY;
  zone: "bg" | "hero" | "content";
  opacity: number;
  showIf: string;
  hideIn: FormatId[];
  locked: boolean;
  rotation: number;
  shadow: { color: string; blur: number; x: number; y: number };
}>;

const rect = (id: string, name: string, b: Box, fill: Fill, o: Common & Partial<RectElement> = {}): RectElement => ({
  id,
  name,
  type: "rect",
  frame: F(b),
  fill,
  ...o,
});

const text = (id: string, name: string, b: Box, t: string, o: Common & Partial<TextElement> = {}): TextElement => ({
  id,
  name,
  type: "text",
  frame: F(b),
  text: t,
  font: "display",
  size: 60,
  color: "#FFFFFF",
  align: "left",
  maxLines: 1,
  ...o,
});

const img = (id: string, name: string, b: Box, src: string, o: Common & Partial<ImageElement> = {}): ImageElement => ({
  id,
  name,
  type: "image",
  frame: F(b),
  src,
  fit: "contain",
  ...o,
});

const logo = (id: string, name: string, b: Box, teamField: string, o: Common & Partial<ImageElement> = {}) =>
  img(id, name, b, `team:{{${teamField}}}`, { fallback: "monogram", ...o });

const line = (id: string, name: string, b: Box, color: string, thickness: number, o: Common = {}): LineElement => ({
  id,
  name,
  type: "line",
  frame: F(b),
  color,
  thickness,
  ...o,
});

const path = (id: string, name: string, b: Box, d: string, o: Common & Partial<PathElement> = {}): PathElement => ({
  id,
  name,
  type: "path",
  frame: F(b),
  d,
  ...o,
});

const list = (
  id: string,
  name: string,
  b: Box,
  field: string,
  rowHeight: number,
  gap: number,
  children: TemplateElement[],
  o: Common & Partial<ListElement> = {},
): ListElement => ({ id, name, type: "list", frame: F(b), field, rowHeight, gap, children, distribute: false, ...o });

const brandLogo = (b: Box, o: Common & Partial<ImageElement> = {}) =>
  img("brand-logo", "Logo projektu", b, "brand:logo", { locked: true, fallback: "none", ...o });

const lin = (angle: number, ...stops: [number, string][]): Fill => ({ type: "linear", angle, stops });

const SWOOSH_A = "M100 0 C 78 22, 52 44, 0 100";
const SWOOSH_B = "M100 16 C 80 40, 58 62, 18 100";

// Pole, která se opakují
const f = {
  home: { key: "home_team", label: "Domácí tým", type: "team" } as FieldDef,
  away: { key: "away_team", label: "Hosté", type: "team" } as FieldDef,
  hs: { key: "home_score", label: "Skóre domácí", type: "number" } as FieldDef,
  as: { key: "away_score", label: "Skóre hosté", type: "number" } as FieldDef,
  comp: { key: "competition", label: "Soutěž", type: "text" } as FieldDef,
  round: { key: "round", label: "Kolo", type: "text" } as FieldDef,
  date: { key: "date", label: "Datum", type: "date" } as FieldDef,
  time: { key: "time", label: "Čas", type: "text", placeholder: "18:00" } as FieldDef,
  venue: { key: "venue", label: "Místo", type: "text" } as FieldDef,
  photo: { key: "photo", label: "Fotka", type: "image" } as FieldDef,
  credit: { key: "photo_credit", label: "Autor fotky", type: "text" } as FieldDef,
};

// ── BCL premium (podle EuroLeague „Rivalry Series“) – společné pozadí a hlavička ──
const METAL = lin(90, [0, "#FFFFFF"], [0.55, "#EEF2F6"], [1, "#AEB8C6"]);
/** Světelný vír v barvě projektu (textura tex-vortex: barevná vrstva + bílé jádro + záře) */
function bclVortexBg(): TemplateElement[] {
  const S = { fit: "cover" as const, fallback: "none" as const, blend: "screen" as const, anchorX: "stretch" as const, anchorY: "stretch" as const, zone: "bg" as const };
  return [
    rect("bloom-top", "Záře nahoře", [190, -330, 700, 700], { type: "radial", stops: [[0, "@primary/45"], [0.4, "@primary/12"], [0.69, "@primary/0"], [1, "@primary/0"]] }, { blend: "screen", anchorY: "top" }),
    img("vortex-glow", "Světelný vír – záře", [0, 0, 1080, 1350], "asset:tex-vortex", { ...S, lumaKey: 0.75, tint: "@primary", blur: 18, opacity: 0.5 }),
    img("vortex", "Světelný vír (barva projektu)", [0, 0, 1080, 1350], "asset:tex-vortex", { ...S, lumaKey: 0.9, tint: "@primary", opacity: 1 }),
    img("vortex-hl", "Světelný vír – bílé jádro", [0, 0, 1080, 1350], "asset:tex-vortex", { ...S, lumaKey: 2.3, opacity: 0.85 }),
    img("halftone", "Rastr teček", [0, 0, 1080, 1350], "asset:tex-halftone", { ...S, lumaKey: 1, opacity: 0.05 }),
  ];
}
/** Logo ligy, kovový nadpis a stříbrný pruh s podtitulkem (jako „RIVALRY / SERIES“). */
function bclHeader(title: string, subtitle: string, size = 98): TemplateElement[] {
  return [
    img("league", "Logo ligy", [400, 30, 280, 70], "brand:partner", { fit: "contain", fallback: "none", anchorY: "top" }),
    text("title", "Nadpis", [170, 104 + (98 - size) / 2, 740, size + 6], title, { font: "Russo One", weight: 400, size, minSize: 40, uppercase: true, align: "center", letterSpacing: 0.01, fill: METAL, shadow: { color: "rgba(0,0,0,0.5)", blur: 26, x: 0, y: 8 }, anchorY: "top" }),
    text("subtitle", "Pruh pod nadpisem", [200, 214, 680, 40], subtitle, { font: "Saira Condensed", weight: 700, size: 22, minSize: 14, uppercase: true, align: "center", letterSpacing: 0.42, wordSpacing: 0.5, color: "@dark", pill: { fill: lin(0, [0, "#AEB8C6"], [0.5, "#FFFFFF"], [1, "#AEB8C6"]), padX: 26, padY: 5, radius: 2 }, showIf: subtitle.replace(/[{}]/g, ""), anchorY: "top" }),
  ];
}

const PHOTO = (asset: string) => ({ asset, zoom: 1, fx: 0.5, fy: 0.3 });

interface TDef {
  id: string;
  name: string;
  category: string;
  description: string;
  baseFormat?: FormatId;
  background: Fill;
  fields: FieldDef[];
  sampleData: DataRecord;
  elements: TemplateElement[];
  paginate?: Template["paginate"];
  finish?: Template["finish"];
  palette?: Template["palette"];
}

/** Svislé kotvení skupin prvků – co drží pohromadě při změně formátu (Story ↔ čtverec). */
const ANCHORS: Record<string, Record<string, AnchorY>> = {
  invite: { "home-logo": "center", vs: "center", "away-logo": "center", "home-name": "center", "away-name": "center" },
  matchday: { comp: "bottom", "home-logo": "bottom", vs: "bottom", "away-logo": "bottom", teams: "bottom", time: "bottom", date: "bottom", venue: "bottom" },
  lineup: { players: "stretch", kicker: "top", when: "top" },
  transfer: { band: "center", "band-text": "center", name: "bottom", details: "bottom", "from-logo": "bottom", arrow: "bottom", "to-logo": "bottom", "to-logo-solo": "bottom" },
  "player-stats": { name: "center", s1: "center", s1b: "center", s1l: "center", s2: "center", s2b: "center", s2l: "center", s3: "center", s3b: "center", s3l: "center", date: "center", "comp-logo": "center", partner: "center" },
  standings: { rows: "stretch", "side-pill": "center", side: "center" },
  "final-standings": { p1: "center", p2: "center", p3: "center", l1: "center", l2: "center", l3: "center", n1: "center", n2: "center", n3: "center", r1: "center", r2: "center", r3: "center", rest: "bottom" },
  anniversary: { kicker: "center", number: "center", unit: "center", headline: "center", name: "center" },
  breaking: { headline: "bottom" },
  news: { headline: "bottom" },
  "results-carousel": { games: "stretch" },
  program: { games: "stretch" },
  "results-round": { games: "stretch" },
  "program-premium": { games: "stretch" },
  streak: { "streak-n": "center", "streak-w": "center", "kicker-own": "center", "rec-l": "center", record: "center", "rec-r": "center", games: "center", bloom: "center" },
  quote: { mark: "bottom", marks: "bottom", quote: "bottom", "quote-c": "bottom", "name-box": "bottom", "speaker-logo": "bottom", name: "bottom" },
};

export function buildTemplates(projectId: string, a: { arena: string; ball: string; player: string }): Template[] {
  const now = Date.now();
  const defs: TDef[] = [
    // 1 ── VÝSLEDEK ZÁPASU (podle vaší šablony: fotka + obrázek pozadí s přechodem)
    {
      id: "result",
      name: "Výsledek zápasu",
      category: "Zápas",
      description: "Fotka přes celou plochu, přechod do pozadí z brand kitu, loga, skóre, hráč zápasu.",
      background: "@dark",
      fields: [f.home, f.away, f.hs, f.as, { key: "mvp", label: "Hráč zápasu", type: "text", placeholder: "Martin Svoboda (19 PTS, 13 REB)" }, f.photo, f.credit],
      sampleData: {
        home_team: "Sluneta Ústí nad Labem",
        away_team: "Sršni Písek",
        home_score: 78,
        away_score: 80,
        mvp: "Martin Svoboda (19 PTS, 13 REB)",
        photo: PHOTO(a.arena),
        photo_credit: "Hana Kozmová",
      },
      elements: [
        img("photo", "Fotka", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "placeholder" }),
        img("bg-fade", "Pozadí s přechodem", [0, 0, 1080, 1350], "brand:bg0", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch", fallback: "none", fade: { angle: 90, from: 0.42, to: 0.76 } }),
        text("credit", "Foto credit", [520, 22, 530, 42], "Foto: {{photo_credit}}", { font: "body", italic: true, weight: 600, size: 30, align: "right", showIf: "photo_credit", anchorX: "right", anchorY: "top", shadow: { color: "rgba(0,0,0,0.5)", blur: 8, x: 0, y: 2 } }),
        logo("home-logo", "Logo domácí", [160, 1026, 240, 136], "home_team"),
        text("score", "Skóre", [396, 1036, 288, 124], "{{home_score}} : {{away_score}}", { size: 142, align: "center", minSize: 70 }),
        logo("away-logo", "Logo hosté", [680, 1026, 240, 136], "away_team"),
        line("divider", "Linka", [105, 1178, 870, 4], "#FFFFFF", 3),
        text("mvp", "Hráč zápasu", [90, 1190, 900, 62], "{{mvp}}", { font: "body", italic: true, weight: 600, size: 38, align: "center", showIf: "mvp", icon: { src: "asset:demo-star", scale: 1.8, gap: 0.12 } }),
        img("partner", "Liga / partner", [396, 1258, 170, 66], "brand:partner", { fallback: "none", align: "right", locked: true }),
        brandLogo([578, 1254, 110, 74], { align: "left" }),
      ],
    },
    // 2 ── POZVÁNKA NA ZÁPAS
    {
      id: "invite",
      name: "Pozvánka na zápas",
      category: "Zápas",
      description: "Velký titulek, soupeři, den a čas, vstupenky.",
      background: "@dark",
      fields: [{ key: "title", label: "Titulek", type: "text" }, f.home, f.away, f.comp, f.round, f.date, f.time, f.venue, { key: "tickets", label: "Vstupenky / výzva", type: "text" }, f.photo],
      sampleData: {
        title: "Přijďte nás podpořit",
        home_team: "Basket Brno",
        away_team: "BK Kvis Pardubice",
        competition: "Maxa NBL",
        round: "3. kolo",
        date: "2026-09-26",
        time: "18:00",
        venue: "Hala Vodova, Brno",
        tickets: "Vstupenky na basketbrno.cz",
        photo: PHOTO(a.arena),
      },
      elements: [
        img("photo", "Fotka", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch" }),
        rect("shade", "Ztmavení", [0, 0, 1080, 1350], lin(90, [0, "@dark/55"], [0.5, "@secondary/80"], [1, "@dark/95"]), { zone: "bg", anchorX: "stretch", anchorY: "stretch" }),
        brandLogo([440, 60, 200, 70], { anchorY: "top" }),
        text("eyebrow", "Soutěž", [240, 170, 600, 56], "{{competition}} · {{round}}", { font: "body", weight: 800, size: 28, align: "center", uppercase: true, letterSpacing: 0.08, pill: { fill: "@accent", padX: 24, padY: 12, radius: 8 } }),
        text("title", "Titulek", [60, 250, 960, 230], "{{title}}", { size: 140, align: "center", uppercase: true, maxLines: 2, lineHeight: 0.92 }),
        logo("home-logo", "Logo domácí", [110, 530, 300, 300], "home_team", { shadow: { color: "rgba(0,0,0,0.45)", blur: 30, x: 0, y: 12 } }),
        text("vs", "VS", [440, 610, 200, 140], "VS", { size: 120, align: "center", color: "@accent" }),
        logo("away-logo", "Logo hosté", [670, 530, 300, 300], "away_team", { shadow: { color: "rgba(0,0,0,0.45)", blur: 30, x: 0, y: 12 } }),
        text("home-name", "Domácí", [60, 850, 400, 90], "{{home_team}}", { font: "body", weight: 800, size: 38, align: "center", uppercase: true, maxLines: 2, lineHeight: 1 }),
        text("away-name", "Hosté", [620, 850, 400, 90], "{{away_team}}", { font: "body", weight: 800, size: 38, align: "center", uppercase: true, maxLines: 2, lineHeight: 1 }),
        text("when", "Den a čas", [60, 965, 960, 130], "{{date|day}} {{date|date:short}} · {{time}}", { size: 120, align: "center" }),
        text("venue", "Místo", [60, 1098, 960, 50], "{{venue}}", { font: "body", weight: 600, size: 34, align: "center", opacity: 0.85 }),
        text("tickets", "Vstupenky", [140, 1190, 800, 64], "{{tickets}}", { font: "body", weight: 800, size: 30, align: "center", color: "@secondary", uppercase: true, pill: { fill: "#FFFFFF", padX: 28, padY: 14, radius: 40 }, showIf: "tickets" }),
      ],
    },
    // 3 ── ZÁPASOVÝ DEN
    {
      id: "matchday",
      name: "Zápasový den",
      category: "Zápas",
      description: "Výrazný titulek, vyříznutý hráč, čas výkopu vlevo.",
      background: lin(160, [0, "@primary"], [1, "@dark"]),
      fields: [
        { key: "title_1", label: "Titulek 1", type: "text" },
        { key: "title_2", label: "Titulek 2 (obrys)", type: "text" },
        f.home,
        f.away,
        f.comp,
        f.date,
        f.time,
        f.venue,
        { key: "photo", label: "Hráč (ideálně bez pozadí)", type: "image" },
      ],
      sampleData: {
        title_1: "Zápasový",
        title_2: "den",
        home_team: "Basket Brno",
        away_team: "BK Kvis Pardubice",
        competition: "Maxa NBL",
        date: "2026-09-26",
        time: "18:00",
        venue: "Hala Vodova, Brno",
        photo: { asset: a.player },
      },
      elements: [
        path("sw1", "Linka 1", [620, 0, 460, 560], SWOOSH_A, { stroke: "#FFFFFF", strokeWidth: 5, opacity: 0.5, anchorX: "right", anchorY: "top" }),
        text("t1", "Titulek 1", [40, 40, 1000, 190], "{{title_1}}", { size: 215, uppercase: true, align: "left" }),
        text("t2", "Titulek 2", [40, 205, 1000, 190], "{{title_2}}", { size: 215, uppercase: true, align: "left", color: "rgba(0,0,0,0)", strokeText: { color: "@accent", width: 4 } }),
        img("photo", "Hráč", [380, 250, 700, 1100], "{{photo}}", { zone: "hero", align: "right", valign: "bottom", fallback: "placeholder", shadow: { color: "rgba(0,0,0,0.5)", blur: 40, x: -10, y: 10 } }),
        text("comp", "Soutěž", [60, 470, 440, 56], "{{competition}}", { font: "body", weight: 800, size: 28, uppercase: true, letterSpacing: 0.08, pill: { fill: "@accent", padX: 20, padY: 12, radius: 6 } }),
        logo("home-logo", "Logo domácí", [60, 570, 180, 180], "home_team"),
        text("vs", "VS", [240, 615, 100, 90], "VS", { size: 70, align: "center", color: "@accent" }),
        logo("away-logo", "Logo hosté", [340, 570, 180, 180], "away_team"),
        text("teams", "Soupeři", [60, 770, 470, 110], "{{home_team}} vs {{away_team}}", { font: "body", weight: 800, size: 40, uppercase: true, maxLines: 2, lineHeight: 1.02 }),
        text("time", "Čas", [60, 900, 460, 190], "{{time}}", { size: 200 }),
        text("date", "Den", [60, 1090, 460, 50], "{{date|day}} {{date|date}}", { font: "body", weight: 800, size: 36, color: "@accent" }),
        text("venue", "Místo", [60, 1142, 460, 90], "{{venue}}", { font: "body", weight: 600, size: 30, maxLines: 2, valign: "top" }),
        brandLogo([60, 1262, 200, 58], { align: "left" }),
      ],
    },
    // 4 ── SESTAVA
    {
      id: "lineup",
      name: "Sestava",
      category: "Zápas",
      description: "Základní pětka, lavička a trenér vedle fotky.",
      background: "@dark",
      fields: [
        { key: "title", label: "Titulek", type: "text" },
        { key: "kicker", label: "Nadpis seznamu", type: "text" },
        f.home,
        f.away,
        f.date,
        f.time,
        {
          key: "players",
          label: "Hráči",
          type: "list",
          columns: [
            { key: "number", label: "#", type: "text" },
            { key: "name", label: "Jméno", type: "text" },
            { key: "position", label: "Post", type: "text" },
          ],
        },
        { key: "bench", label: "Lavička", type: "longtext" },
        { key: "coach", label: "Trenér", type: "text" },
        f.photo,
      ],
      sampleData: {
        title: "Dnes nastoupí",
        kicker: "Základní pětka",
        home_team: "Basket Brno",
        away_team: "BK Kvis Pardubice",
        date: "2026-09-26",
        time: "18:00",
        players: [
          { number: "8", name: "Jan Novák", position: "PG" },
          { number: "4", name: "Martin Dvořák", position: "SG" },
          { number: "12", name: "Petr Svoboda", position: "SF" },
          { number: "15", name: "Tomáš Kříž", position: "PF" },
          { number: "22", name: "Jermaine Webb", position: "C" },
        ],
        bench: "7 Veselý, 9 Horák, 10 Marek, 11 Pokorný, 14 Beneš, 21 Fiala",
        coach: "Pavel Benda",
        photo: PHOTO(a.arena),
      },
      elements: [
        img("photo", "Fotka", [380, 0, 700, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "right", anchorY: "stretch", fallback: "placeholder" }),
        rect("fade", "Přechod", [380, 0, 320, 1350], lin(0, [0, "@dark"], [1, "@dark/0"]), { anchorY: "stretch", hideIn: ["x"] }),
        logo("home-logo", "Logo domácí", [60, 50, 110, 110], "home_team"),
        text("colon", "Dvojtečka", [170, 60, 50, 90], ":", { size: 80, align: "center" }),
        logo("away-logo", "Logo hosté", [220, 50, 110, 110], "away_team"),
        brandLogo([880, 40, 160, 56], { align: "right" }),
        text("kicker", "Nadpis", [60, 190, 460, 76], "{{kicker}}", { size: 70, uppercase: true, color: "@accent" }),
        text("when", "Termín", [60, 266, 460, 40], "{{date|day}} {{date|date}} · {{time}}", { font: "body", weight: 600, size: 26, opacity: 0.8 }),
        list("players", "Hráči", [60, 330, 460, 560], "players", 76, 12, [
          rect("row-bg", "Pozadí řádku", [0, 0, 460, 76], "@secondary/85", { radius: 10 }),
          text("num", "Číslo", [0, 0, 90, 76], "{{number}}", { size: 50, align: "center", color: "@accent" }),
          text("name", "Jméno", [96, 0, 270, 76], "{{name}}", { font: "body", weight: 700, size: 32, uppercase: true }),
          text("pos", "Post", [370, 0, 76, 76], "{{position}}", { font: "body", weight: 600, size: 24, align: "right", opacity: 0.6 }),
        ]),
        text("bench-label", "Lavička", [60, 912, 460, 40], "Lavička", { font: "body", weight: 800, size: 26, uppercase: true, color: "@accent", letterSpacing: 0.08 }),
        text("bench", "Lavička hráči", [60, 954, 460, 150], "{{bench}}", { font: "body", weight: 500, size: 28, maxLines: 5, valign: "top", lineHeight: 1.25 }),
        text("coach", "Trenér", [60, 1110, 460, 40], "Trenér: {{coach}}", { font: "body", weight: 600, size: 24, opacity: 0.75, showIf: "coach" }),
        rect("bar", "Spodní pruh", [0, 1190, 1080, 160], "@primary", { anchorX: "stretch", anchorY: "bottom" }),
        text("title", "Titulek", [40, 1205, 1000, 130], "{{title}}", { size: 120, align: "center", uppercase: true }),
      ],
    },
    // 5 ── ZMĚNA V TÝMU (podle vaší šablony: pás přes fotku, hráč před pásem, logo → logo)
    {
      id: "transfer",
      name: "Změna v týmu",
      category: "Hráči",
      description: "Fotka přes celou plochu, oranžový pás za hráčem, jméno s čárkou, parametry hráče a loga klubů (bez předchozího klubu jen nový tým).",
      background: "@dark",
      fields: [
        { key: "kicker", label: "Text pásu", type: "text" },
        { key: "first_name", label: "Jméno", type: "text" },
        { key: "last_name", label: "Příjmení", type: "text" },
        { key: "position", label: "Post", type: "text", placeholder: "Rozehrávač" },
        { key: "height", label: "Výška (cm)", type: "number" },
        { key: "age", label: "Věk", type: "number" },
        { key: "from_team", label: "Z klubu (prázdné = jen nový tým)", type: "team" },
        { key: "from_logo", label: "Vlastní logo – z klubu (zahraniční tým)", type: "image" },
        { key: "to_team", label: "Do klubu", type: "team" },
        { key: "to_logo", label: "Vlastní logo – do klubu", type: "image" },
        { key: "photo", label: "Fotka hráče (s pozadím)", type: "image", help: "Pod pás jde fotka s pozadím. Nad pás: „Nahrát ořez“ (PNG ořez ze stejné fotky, stejný rozměr) nebo „Vyříznout AI“." },
      ],
      sampleData: {
        kicker: "Změna v týmu",
        first_name: "Niels",
        last_name: "Lane",
        position: "Křídlo",
        height: 198,
        age: 26,
        from_team: "Slavia Praha",
        to_team: "Sluneta Ústí nad Labem",
        photo: PHOTO(a.arena),
      },
      elements: [
        img("photo", "Fotka", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "placeholder" }),
        rect("band", "Pás", [0, 694, 1080, 56], "@accent", { anchorX: "stretch" }),
        text("band-text", "Text pásu", [0, 694, 1080, 56], "{{kicker}}", { font: "Mazzard H", weight: 600, size: 30, uppercase: true, letterSpacing: 0.1, ticker: { count: 4, gap: 0.8, alternate: true, lightWeight: 300, offset: 18 }, anchorX: "stretch" }),
        img("photo-cut", "Hráč před pásem", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", useCutout: true, fallback: "none" }),
        img("fade", "Přechod dole", [0, 0, 1080, 1350], "brand:bg0", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch", fallback: "none", fade: { angle: 90, from: 0.6, to: 0.86 } }),
        text("name", "Jméno", [60, 980, 960, 90], "{{first_name}} {{last_name}}", { font: "Mazzard H", weight: 600, size: 70, uppercase: true, align: "center", icon: { src: "asset:demo-bar", scale: 1.1, gap: 0.22 } }),
        text("details", "Parametry", [140, 1076, 800, 50], "{{@join: · |position|height: cm|age: let}}", { font: "body", weight: 800, size: 26, uppercase: true, align: "center", color: "@dark", pill: { fill: "#FFFFFF", padX: 20, padY: 8, radius: 4 }, showIf: "position || height || age" }),
        logo("from-logo", "Z klubu", [240, 1140, 200, 150], "from_team", { override: "{{from_logo}}", showIf: "from_team || from_logo" }),
        path("arrow", "Šipka", [496, 1180, 88, 70], "M0 0 L24 0 L50 50 L24 100 L0 100 L26 50 Z M46 0 L70 0 L96 50 L70 100 L46 100 L72 50 Z", { fill: "#FFFFFF", showIf: "from_team || from_logo" }),
        logo("to-logo", "Do klubu", [640, 1140, 200, 150], "to_team", { override: "{{to_logo}}", showIf: "from_team || from_logo" }),
        logo("to-logo-solo", "Nový tým (bez předchozího)", [440, 1140, 200, 150], "to_team", { override: "{{to_logo}}", hideIf: "from_team || from_logo" }),
        brandLogo([930, 1236, 110, 90], { align: "right" }),
      ],
    },
    // 6 ── NOVÝ HRÁČ
    {
      id: "welcome",
      name: "Nový hráč",
      category: "Hráči",
      description: "Uvítání posily s velkým číslem dresu.",
      background: "@primary",
      fields: [
        { key: "kicker", label: "Nadpis", type: "text" },
        { key: "first_name", label: "Jméno", type: "text" },
        { key: "last_name", label: "Příjmení", type: "text" },
        { key: "number", label: "Číslo dresu", type: "text" },
        { key: "position", label: "Post", type: "text" },
        { key: "height", label: "Výška (cm)", type: "number" },
        { key: "age", label: "Věk", type: "number" },
        { key: "nationality", label: "Národnost", type: "text" },
        { key: "photo", label: "Hráč (ideálně bez pozadí)", type: "image" },
      ],
      sampleData: {
        kicker: "Vítej v Brně!",
        first_name: "Jermaine",
        last_name: "Webb",
        number: "22",
        position: "Pivot",
        height: 206,
        age: 28,
        nationality: "USA",
        photo: { asset: a.player },
      },
      elements: [
        text("number", "Číslo", [300, 120, 780, 900], "{{number}}", { size: 950, align: "center", color: "@secondary", opacity: 0.6 }),
        path("sw1", "Linka", [0, 700, 560, 650], "M0 20 C 40 40, 70 70, 100 100", { stroke: "@accent", strokeWidth: 6, opacity: 0.8 }),
        img("photo", "Hráč", [180, 170, 900, 1180], "{{photo}}", { zone: "hero", valign: "bottom", align: "right", fallback: "placeholder", shadow: { color: "rgba(0,0,0,0.45)", blur: 40, x: 0, y: 10 } }),
        text("kicker", "Nadpis", [60, 60, 760, 130], "{{kicker}}", { size: 130, uppercase: true }),
        brandLogo([870, 60, 170, 60], { align: "right" }),
        rect("name-bg", "Pozadí jména", [0, 1000, 780, 250], "@dark", { anchorX: "left", anchorY: "bottom" }),
        text("first", "Jméno", [60, 1020, 700, 70], "{{first_name}}", { font: "body", weight: 700, size: 58, uppercase: true }),
        text("last", "Příjmení", [60, 1085, 700, 150], "{{last_name}}", { size: 160, uppercase: true, color: "@accent" }),
        text("facts", "Parametry", [60, 1266, 800, 50], "{{position}}  |  {{height}} cm  |  {{age}} let  |  {{nationality}}", { font: "body", weight: 800, size: 28, uppercase: true, letterSpacing: 0.04 }),
      ],
    },
    // 7 ── STATISTIKY HRÁČE (styl podle vaší PSD šablony)
    {
      id: "player-stats",
      name: "Statistiky hráče",
      category: "Hráči",
      description: "Svislé jméno, tři čísla se štítky, fotka vpravo.",
      background: "@secondary",
      fields: [
        { key: "player", label: "Hráč", type: "text" },
        { key: "s1_value", label: "Stat 1 – hodnota", type: "text" },
        { key: "s1_label", label: "Stat 1 – popisek", type: "text" },
        { key: "s2_value", label: "Stat 2 – hodnota", type: "text" },
        { key: "s2_label", label: "Stat 2 – popisek", type: "text" },
        { key: "s3_value", label: "Stat 3 – hodnota", type: "text" },
        { key: "s3_label", label: "Stat 3 – popisek", type: "text" },
        f.date,
        { key: "opponent", label: "Soupeř (celý název)", type: "team" },
        { key: "comp_logo", label: "Logo soutěže (jinak z brand kitu)", type: "image" },
        { key: "photo", label: "Fotka hráče (s pozadím)", type: "image", help: "Hráče nad přechod a čáry dáte tlačítkem „Nahrát ořez“ (PNG ze stejné fotky) nebo „Vyříznout AI“." },
      ],
      sampleData: {
        player: "Jermaine Webb",
        s1_value: "17",
        s1_label: "PTS",
        s2_value: "18",
        s2_label: "REB",
        s3_value: "6/17",
        s3_label: "FG",
        date: "2026-09-19",
        opponent: "BK Kvis Pardubice",
        competition: "Maxa NBL",
        photo: PHOTO(a.arena),
      },
      elements: [
        img("photo", "Fotka (s pozadím)", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "placeholder" }),
        img("fade", "Přechod zleva (brand kit)", [0, 0, 1080, 1350], "brand:bg0", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch", fallback: "none", fade: { angle: 180, from: 0.42, to: 0.7 } }),
        img("lines", "Čáry", [-1038, -426, 2458, 1638], "asset:demo-lines", { fit: "cover", lumaKey: 8, fade: { angle: 0, from: 0.62, to: 0.74 }, anchorX: "right", anchorY: "top", fallback: "none", hideIn: ["x"] }),
        img("photo-cut", "Hráč nad přechodem", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", useCutout: true, fallback: "none" }),
        brandLogo([36, 38, 84, 64], { align: "left" }),
        text("name", "Jméno svisle", [22, 190, 80, 620], "{{player}}", { font: "Mazzard H", weight: 900, size: 70, uppercase: true, vertical: true, align: "center" }),
        text("s1", "Stat 1", [143, 124, 300, 172], "{{s1_value}}", { size: 200, minSize: 90 }),
        rect("s1b", "Stat 1 štítek – plocha", [145, 312, 118, 40], "@accent"),
        text("s1l", "Stat 1 štítek", [145, 312, 118, 40], "{{s1_label}}", { font: "body", weight: 700, size: 30, uppercase: true, align: "center" }),
        text("s2", "Stat 2", [143, 380, 300, 172], "{{s2_value}}", { size: 200, minSize: 90 }),
        rect("s2b", "Stat 2 štítek – plocha", [145, 568, 118, 40], "@accent"),
        text("s2l", "Stat 2 štítek", [145, 568, 118, 40], "{{s2_label}}", { font: "body", weight: 700, size: 30, uppercase: true, align: "center" }),
        text("s3", "Stat 3", [143, 636, 300, 172], "{{s3_value}}", { size: 200, minSize: 90 }),
        rect("s3b", "Stat 3 štítek – plocha", [145, 824, 118, 40], "@accent"),
        text("s3l", "Stat 3 štítek", [145, 824, 118, 40], "{{s3_label}}", { font: "body", weight: 700, size: 30, uppercase: true, align: "center" }),
        text("date", "Datum a soupeř", [56, 900, 460, 40], "{{date|date:tight}} vs {{opponent|upper}}", { font: "Mazzard H", weight: 600, size: 25 }),
        img("comp-logo", "Logo soutěže", [84, 990, 236, 52], "{{comp_logo}}", { fit: "contain", align: "left", showIf: "comp_logo", fallback: "none" }),
        img("partner", "Liga / partner", [84, 990, 236, 52], "brand:partner", { fit: "contain", align: "left", hideIf: "comp_logo", fallback: "none" }),
      ],
    },
    // 8 ── TABULKA SOUTĚŽE (úspěšnost jako na Livesportu, barevné postupové pozice)
    {
      id: "standings",
      name: "Tabulka soutěže",
      category: "Soutěž",
      description: "Z / V / P / PCT, první skupina a druhá skupina postupujících barevně, logo soutěže dole.",
      background: "@dark",
      fields: [
        { key: "title", label: "Titulek", type: "text" },
        { key: "round_label", label: "Štítek (bočně)", type: "text", placeholder: "Po 3. kole" },
        {
          key: "rows",
          label: "Tabulka",
          type: "list",
          columns: [
            { key: "pos", label: "#", type: "number" },
            { key: "team", label: "Tým", type: "team" },
            { key: "g", label: "Z (zápasy)", type: "number" },
            { key: "w", label: "V (výhry)", type: "number" },
            { key: "l", label: "P (prohry)", type: "number" },
            { key: "pct", label: "PCT (úspěšnost)", type: "text" },
          ],
        },
        { key: "zone1_to", label: "Barva 1: pozice 1 až", type: "number" },
        { key: "zone2_to", label: "Barva 2: pozice do", type: "number" },
        { key: "zone1_label", label: "Popisek barvy 1 (nepovinné)", type: "text" },
        { key: "zone2_label", label: "Popisek barvy 2 (nepovinné)", type: "text" },
        { key: "comp_logo", label: "Logo soutěže (jinak z brand kitu)", type: "image" },
      ],
      sampleData: { title: "Tabulka", round_label: "Po 3. kole", rows: STANDINGS, zone1_to: 8, zone2_to: 12, zone1_label: "", zone2_label: "" },
      elements: [
        img("bg", "Pozadí (brand kit)", [0, 0, 1080, 1350], "brand:bg0", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch", fallback: "none" }),
        img("lines", "Čáry nahoře", [620, 0, 460, 430], "asset:", { fit: "contain", align: "right", valign: "top", anchorX: "right", anchorY: "top", fallback: "placeholder" }),
        rect("card", "Panel", [142, 92, 880, 1116], "@dark/85", { radius: 34, anchorY: "stretch" }),
        rect("side-pill", "Boční štítek", [64, 230, 78, 330], "@accent", { radius: 14, showIf: "round_label" }),
        text("side", "Boční text", [64, 230, 78, 330], "{{round_label}}", { font: "body", weight: 800, size: 40, uppercase: true, align: "center", vertical: true, showIf: "round_label" }),
        text("title", "Titulek", [182, 118, 800, 170], "{{title}}", { size: 190, uppercase: true, align: "center", color: "@accent" }),
        text("h-team", "Hlavička tým", [348, 300, 300, 34], "Tým", { font: "body", weight: 800, size: 22, uppercase: true, opacity: 0.55 }),
        text("h-g", "Hlavička Z", [680, 300, 70, 34], "Z", { font: "body", weight: 800, size: 22, align: "center", opacity: 0.55 }),
        text("h-w", "Hlavička V", [750, 300, 70, 34], "V", { font: "body", weight: 800, size: 22, align: "center", opacity: 0.55 }),
        text("h-l", "Hlavička P", [820, 300, 70, 34], "P", { font: "body", weight: 800, size: 22, align: "center", opacity: 0.55 }),
        text("h-pct", "Hlavička PCT", [890, 300, 90, 34], "PCT", { font: "body", weight: 800, size: 22, align: "center", opacity: 0.55 }),
        list("rows", "Řádky", [182, 342, 800, 788], "rows", 62, 4, [
          rect("stripe", "Pruh (liché řádky)", [0, 0, 800, 62], "@primary/35", { radius: 8, showIf: "odd" }),
          rect("zone1", "Barva 1 (postup)", [10, 12, 52, 38], "@accent", { radius: 6, showIf: "pos <= zone1_to" }),
          rect("zone2", "Barva 2 (postup)", [10, 12, 52, 38], "@light/28", { radius: 6, showIf: "pos > zone1_to", hideIf: "pos > zone2_to" }),
          text("pos", "Pořadí", [10, 12, 52, 38], "{{pos}}.", { font: "body", weight: 800, size: 26, align: "center" }),
          logo("logo", "Logo", [78, 6, 76, 50], "team", { logoVariant: "white", equalize: 0.7 }),
          text("team", "Tým", [166, 8, 326, 46], "{{team}}", { font: "body", weight: 800, size: 30, uppercase: true }),
          text("g", "Zápasy", [498, 8, 70, 46], "{{g}}", { font: "body", weight: 600, size: 30, align: "center" }),
          text("w", "Výhry", [568, 8, 70, 46], "{{w}}", { font: "body", weight: 600, size: 30, align: "center" }),
          text("l", "Prohry", [638, 8, 70, 46], "{{l}}", { font: "body", weight: 600, size: 30, align: "center" }),
          text("pct", "PCT", [708, 8, 90, 46], "{{pct|pct}}", { font: "body", weight: 800, size: 30, align: "center", color: "@accent" }),
        ]),
        rect("leg1-dot", "Legenda 1 barva", [200, 1152, 26, 26], "@accent", { radius: 5, showIf: "zone1_label" }),
        text("leg1", "Legenda 1", [236, 1146, 330, 38], "{{zone1_label}}", { font: "body", weight: 700, size: 24, showIf: "zone1_label" }),
        rect("leg2-dot", "Legenda 2 barva", [590, 1152, 26, 26], "@light/28", { radius: 5, showIf: "zone2_label" }),
        text("leg2", "Legenda 2", [626, 1146, 340, 38], "{{zone2_label}}", { font: "body", weight: 700, size: 24, showIf: "zone2_label" }),
        img("comp-logo", "Logo soutěže", [360, 1240, 210, 76], "{{comp_logo}}", { fit: "contain", align: "right", showIf: "comp_logo", fallback: "none" }),
        img("partner", "Liga / partner", [360, 1240, 210, 76], "brand:partner", { fallback: "none", align: "right", hideIf: "comp_logo" }),
        brandLogo([590, 1238, 120, 80], { align: "left" }),
      ],
    },
    // 9 ── KONEČNÉ POŘADÍ
    {
      id: "final-standings",
      name: "Konečné pořadí",
      category: "Soutěž",
      description: "Stupně vítězů pro první tři a zbytek pořadí pod nimi.",
      background: { type: "radial", stops: [[0, "@primary"], [1, "@dark"]] },
      fields: [
        { key: "title", label: "Titulek", type: "text" },
        f.comp,
        { key: "season", label: "Sezóna", type: "text" },
        { key: "first", label: "1. místo", type: "team" },
        { key: "second", label: "2. místo", type: "team" },
        { key: "third", label: "3. místo", type: "team" },
        { key: "rest", label: "Další pořadí", type: "list", columns: [{ key: "pos", label: "#", type: "number" }, { key: "team", label: "Tým", type: "team" }] },
      ],
      sampleData: {
        title: "Konečné pořadí",
        competition: "Maxa NBL",
        season: "2025/26",
        first: "BK Kvis Pardubice",
        second: "BK Opava",
        third: "Basket Brno",
        rest: STANDINGS.slice(3, 8).map((r) => ({ pos: r.pos, team: r.team })),
      },
      elements: [
        text("title", "Titulek", [60, 60, 960, 140], "{{title}}", { size: 140, uppercase: true, align: "center" }),
        text("sub", "Soutěž", [60, 195, 960, 50], "{{competition}} {{season}}", { font: "body", weight: 800, size: 32, uppercase: true, color: "@accent", align: "center" }),
        rect("p2", "Stupeň 2", [70, 470, 300, 420], "@secondary", { radius: 16 }),
        logo("l2", "Logo 2", [120, 500, 200, 200], "second"),
        text("n2", "Tým 2", [80, 710, 280, 76], "{{second}}", { font: "body", weight: 800, size: 30, uppercase: true, align: "center", maxLines: 2, lineHeight: 1 }),
        text("r2", "Místo 2", [80, 790, 280, 90], "2.", { size: 100, align: "center", color: "#C9D1D9" }),
        rect("p1", "Stupeň 1", [390, 380, 300, 510], "@accent", { radius: 16 }),
        logo("l1", "Logo 1", [415, 405, 250, 250], "first"),
        text("n1", "Tým 1", [400, 668, 280, 80], "{{first}}", { font: "body", weight: 800, size: 34, uppercase: true, align: "center", maxLines: 2, lineHeight: 1 }),
        text("r1", "Místo 1", [400, 755, 280, 125], "1.", { size: 130, align: "center" }),
        rect("p3", "Stupeň 3", [710, 540, 300, 350], "@secondary", { radius: 16 }),
        logo("l3", "Logo 3", [770, 565, 180, 180], "third"),
        text("n3", "Tým 3", [720, 752, 280, 64], "{{third}}", { font: "body", weight: 800, size: 28, uppercase: true, align: "center", maxLines: 2, lineHeight: 1 }),
        text("r3", "Místo 3", [720, 815, 280, 70], "3.", { size: 80, align: "center", color: "#D9975B" }),
        list("rest", "Další týmy", [120, 930, 840, 320], "rest", 58, 8, [
          text("pos", "Pořadí", [0, 0, 80, 58], "{{pos}}.", { size: 38, color: "@accent" }),
          logo("logo", "Logo", [90, 7, 44, 44], "team"),
          text("team", "Tým", [150, 0, 690, 58], "{{team}}", { font: "body", weight: 700, size: 30, uppercase: true }),
        ]),
        brandLogo([440, 1270, 200, 56]),
      ],
    },
    // 10 ── VÝROČÍ / JUBILEUM
    {
      id: "anniversary",
      name: "Výročí / jubileum",
      category: "Klub",
      description: "Obří číslo, popisek a jméno – pro milníky hráčů i klubu.",
      background: "@dark",
      fields: [
        { key: "kicker", label: "Nadpis", type: "text" },
        { key: "number", label: "Číslo", type: "text" },
        { key: "unit", label: "Jednotka", type: "text" },
        { key: "headline", label: "Text", type: "longtext" },
        { key: "name", label: "Jméno", type: "text" },
        f.photo,
      ],
      sampleData: {
        kicker: "Jubileum",
        number: "300",
        unit: "zápasů v NBL",
        headline: "Kapitán dnes odehrál svůj třístý zápas v nejvyšší soutěži. Gratulujeme!",
        name: "Jan Novák",
        photo: PHOTO(a.ball),
      },
      elements: [
        img("photo", "Fotka", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch", grayscale: true, opacity: 0.5 }),
        rect("shade", "Ztmavení", [0, 0, 1080, 1350], lin(90, [0, "@secondary/40"], [1, "@dark/95"]), { zone: "bg", anchorX: "stretch", anchorY: "stretch" }),
        text("kicker", "Nadpis", [60, 140, 960, 58], "{{kicker}}", { font: "body", weight: 800, size: 30, uppercase: true, align: "center", letterSpacing: 0.1, pill: { fill: "@accent", padX: 24, padY: 12, radius: 6 } }),
        text("number", "Číslo", [40, 230, 1000, 560], "{{number}}", { size: 620, align: "center", color: "@accent" }),
        text("unit", "Jednotka", [60, 780, 960, 130], "{{unit}}", { size: 120, align: "center", uppercase: true }),
        text("headline", "Text", [80, 925, 920, 200], "{{headline}}", { font: "body", weight: 600, size: 40, align: "center", maxLines: 3, lineHeight: 1.2 }),
        text("name", "Jméno", [80, 1140, 920, 80], "{{name}}", { font: "body", weight: 800, size: 46, align: "center", uppercase: true, color: "@accent", letterSpacing: 0.04 }),
        brandLogo([440, 1262, 200, 58]),
      ],
    },
    // 11 ── CITÁT (podle vaší šablony)
    {
      id: "quote",
      name: "Citát",
      category: "Obsah",
      description: "Fotka, pás s logy nahoře, velké uvozovky, citát a jmenovka s vlajkou/logem. Bez jména se citát vycentruje.",
      background: "@dark",
      fields: [
        { key: "quote", label: "Citát", type: "longtext" },
        { key: "speaker_first", label: "Jméno", type: "text" },
        { key: "speaker_last", label: "Příjmení (tučně)", type: "text", help: "Když je prázdné, citát se vycentruje bez jmenovky." },
        { key: "speaker_logo", label: "Vlajka / logo u jména", type: "image" },
        f.photo,
        f.credit,
        { key: "comp_logo", label: "Logo akce dole (jinak logo projektu)", type: "image" },
      ],
      sampleData: {
        quote: "Holky se snaží být pozitivní, ale na druhou stranu ví, co je čeká.",
        speaker_first: "Romana",
        speaker_last: "Ptáčková",
        photo: PHOTO(a.arena),
        photo_credit: "CZ.BASKETBALL",
      },
      elements: [
        img("photo", "Fotka", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "placeholder" }),
        rect("shade", "Ztmavení dole", [0, 0, 1080, 1350], lin(90, [0, "@dark/0"], [0.4, "@dark/10"], [0.62, "@dark/70"], [1, "@dark/95"]), { zone: "bg", anchorX: "stretch", anchorY: "stretch" }),
        rect("band", "Pás nahoře", [0, 0, 1080, 64], "@accent", { anchorX: "stretch", anchorY: "top" }),
        img("band-logos", "Loga v pásu", [8, 6, 1072, 52], "brand:logo", { repeat: { gap: 26 }, anchorX: "stretch", anchorY: "top", fallback: "none" }),
        text("credit", "Foto credit", [520, 78, 530, 40], "Foto: {{photo_credit}}", { font: "body", italic: true, weight: 600, size: 26, align: "right", showIf: "photo_credit", anchorX: "right", anchorY: "top", shadow: { color: "rgba(0,0,0,0.5)", blur: 8, x: 0, y: 2 } }),
        text("mark", "Uvozovka", [690, 470, 300, 250], "“", { font: "Anton", size: 480, color: "@accent", align: "right", valign: "top", showIf: "speaker_last" }),
        text("marks", "Uvozovky (střed)", [290, 500, 500, 250], "“ ”", { font: "Anton", size: 480, color: "@accent", align: "center", valign: "top", hideIf: "speaker_last" }),
        text("quote", "Citát", [150, 710, 840, 290], "{{quote}}", { font: "Anton", size: 86, uppercase: true, align: "right", maxLines: 3, lineHeight: 1.02, showIf: "speaker_last" }),
        text("quote-c", "Citát (střed)", [110, 740, 860, 400], "{{quote}}", { font: "Anton", size: 120, uppercase: true, align: "center", maxLines: 4, lineHeight: 1.02, hideIf: "speaker_last" }),
        rect("name-box", "Jmenovka", [540, 1022, 450, 84], "@accent", { showIf: "speaker_last" }),
        img("speaker-logo", "Vlajka / logo", [436, 1004, 120, 120], "{{speaker_logo}}", { fit: "cover", radius: 60, showIf: "speaker_logo", fallback: "none" }),
        text("name", "Jméno", [570, 1022, 410, 84], "{{speaker_first}} [{{speaker_last}}]", { font: "body", weight: 400, highlightWeight: 800, highlight: "#FFFFFF", size: 54, uppercase: true, align: "center", showIf: "speaker_last" }),
        img("comp-logo", "Logo akce", [380, 1200, 320, 120], "{{comp_logo}}", { fit: "contain", showIf: "comp_logo", fallback: "none" }),
        brandLogo([480, 1230, 120, 90], { hideIf: "comp_logo" }),
      ],
    },
    // 12 ── BREAKING NEWS (podle vaší šablony)
    {
      id: "breaking",
      name: "Breaking news",
      category: "Obsah",
      description: "Oranžový rámeček s pásem BREAKING NEWS, fotka, přechod a velký titulek.",
      background: "@accent",
      fields: [
        { key: "label", label: "Text pásu", type: "text" },
        { key: "headline", label: "Titulek", type: "longtext", help: "[Slova v závorkách] se zvýrazní." },
        f.photo,
      ],
      sampleData: {
        label: "Breaking news",
        headline: "Eliška Joklová končí v Minnesotě",
        photo: PHOTO(a.arena),
      },
      elements: [
        img("photo", "Fotka", [40, 72, 1000, 1238], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "placeholder" }),
        rect("frame", "Linka rámečku", [40, 72, 1000, 1238], "rgba(0,0,0,0)", { stroke: "#FFFFFF", strokeWidth: 2, anchorX: "stretch", anchorY: "stretch" }),
        img("fade", "Přechod (i přes rámeček)", [0, 0, 1080, 1350], "brand:bg0", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch", fallback: "none", fade: { angle: 90, from: 0.5, to: 0.82 } }),
        text("band-text", "Text pásu", [0, 4, 1080, 66], "{{label}}", { font: "Mazzard H", weight: 900, size: 44, uppercase: true, ticker: { count: 3, gap: 0.3, alternate: true, lightWeight: 300, offset: 64 }, anchorX: "stretch", anchorY: "top" }),
        text("headline", "Titulek", [90, 960, 900, 250], "{{headline}}", { size: 130, uppercase: true, align: "center", maxLines: 2, lineHeight: 0.98, highlight: "@accent", valign: "bottom", shadow: { color: "rgba(0,0,0,0.45)", blur: 18, x: 0, y: 4 } }),
        brandLogo([480, 1228, 120, 72]),
      ],
    },
    // 12b ── AKTUALITA (podle vaší šablony – 1 nebo 2 fotky)
    {
      id: "news",
      name: "Aktualita",
      category: "Obsah",
      description: "Jedna fotka přes celou plochu, nebo dvě vedle sebe. Přechod do pozadí, velký titulek, credit fotky.",
      background: "@dark",
      fields: [
        { key: "headline", label: "Titulek", type: "longtext", help: "[Slova v závorkách] se zvýrazní." },
        f.photo,
        { key: "photo2", label: "Druhá fotka (nepovinné – rozdělí plochu)", type: "image" },
        f.credit,
      ],
      sampleData: { headline: "Nové ženské basketbalové dresy poprvé v akci", photo: PHOTO(a.arena), photo2: PHOTO(a.player), photo_credit: "CZ BASKETBALL/Václav Mudra" },
      elements: [
        img("photo", "Fotka", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "placeholder", hideIf: "photo2" }),
        img("photo-l", "Fotka vlevo", [0, 0, 538, 1350], "{{photo}}", { fit: "cover", anchorY: "stretch", fallback: "placeholder", showIf: "photo2" }),
        img("photo-r", "Fotka vpravo", [542, 0, 538, 1350], "{{photo2}}", { fit: "cover", anchorX: "right", anchorY: "stretch", showIf: "photo2" }),
        rect("divider", "Dělicí linka", [538, 0, 4, 1350], "#FFFFFF", { anchorY: "stretch", showIf: "photo2" }),
        img("fade", "Přechod", [0, 0, 1080, 1350], "brand:bg0", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch", fallback: "none", fade: { angle: 90, from: 0.55, to: 0.84 } }),
        text("credit", "Foto credit", [520, 16, 540, 40], "Foto: {{photo_credit}}", { font: "body", italic: true, weight: 600, size: 26, align: "right", showIf: "photo_credit", anchorX: "right", anchorY: "top", shadow: { color: "rgba(0,0,0,0.5)", blur: 8, x: 0, y: 2 } }),
        text("headline", "Titulek", [50, 960, 980, 250], "{{headline}}", { size: 130, uppercase: true, align: "center", maxLines: 2, lineHeight: 0.98, highlight: "@accent", valign: "bottom", shadow: { color: "rgba(0,0,0,0.45)", blur: 18, x: 0, y: 4 } }),
        brandLogo([480, 1232, 120, 80]),
      ],
    },
    // 13 ── CAROUSEL S VÝSLEDKY
    {
      id: "results-carousel",
      name: "Carousel s výsledky",
      category: "Soutěž",
      description: "Libovolný počet zápasů → automaticky rozdělí na slidy po 4.",
      background: lin(160, [0, "@secondary"], [1, "@dark"]),
      paginate: { field: "games", perPage: 4 },
      fields: [
        { key: "title", label: "Titulek", type: "text" },
        f.comp,
        f.round,
        {
          key: "games",
          label: "Zápasy",
          type: "list",
          help: "Vložte i jako text: Nymburk – Brno 92:78",
          columns: [
            { key: "home", label: "Domácí", type: "team" },
            { key: "away", label: "Hosté", type: "team" },
            { key: "home_score", label: "Skóre D", type: "number" },
            { key: "away_score", label: "Skóre H", type: "number" },
            { key: "detail", label: "Čtvrtiny", type: "text" },
          ],
        },
        { key: "footer", label: "Patička", type: "text" },
      ],
      sampleData: { title: "Výsledky", competition: "Maxa NBL", round: "2. kolo", games: RESULTS_2_KOLO, footer: "Posuňte pro další →" },
      elements: [
        text("wm", "Vodoznak", [900, 0, 180, 1350], "{{title}}", { size: 240, vertical: true, uppercase: true, align: "center", color: "rgba(0,0,0,0)", strokeText: { color: "#FFFFFF", width: 2 }, opacity: 0.22, anchorX: "right", anchorY: "stretch", hideIn: ["x"] }),
        text("title", "Titulek", [60, 60, 780, 140], "{{title}}", { size: 150, uppercase: true }),
        text("sub", "Soutěž", [60, 195, 780, 50], "{{competition}} · {{round}}", { font: "body", weight: 800, size: 30, uppercase: true, color: "@accent" }),
        text("page", "Strana", [860, 80, 160, 60], "{{page}}/{{pages}}", { size: 56, align: "right", opacity: 0.7 }),
        list(
          "games",
          "Zápasy",
          [60, 290, 960, 930],
          "games",
          200,
          24,
          [
            rect("bg", "Pozadí", [0, 0, 960, 200], "@dark/60", { radius: 16 }),
            logo("hl", "Logo D", [30, 22, 110, 110], "home"),
            text("hn", "Domácí", [0, 140, 170, 44], "{{home|short}}", { font: "body", weight: 800, size: 28, align: "center" }),
            text("hs", "Skóre D", [190, 25, 220, 140], "{{home_score}}", { fitWith: "{{away_score}}", size: 150, align: "right" }),
            text("colon", ":", [410, 25, 140, 140], ":", { size: 120, align: "center", color: "@accent" }),
            text("as", "Skóre H", [550, 25, 220, 140], "{{away_score}}", { fitWith: "{{home_score}}", size: 150, align: "left" }),
            logo("al", "Logo H", [820, 22, 110, 110], "away"),
            text("an", "Hosté", [790, 140, 170, 44], "{{away|short}}", { font: "body", weight: 800, size: 28, align: "center" }),
            text("detail", "Čtvrtiny", [190, 158, 580, 36], "{{detail}}", { font: "body", weight: 500, size: 24, align: "center", opacity: 0.7 }),
          ],
          { distribute: true },
        ),
        text("footer", "Patička", [60, 1255, 600, 50], "{{footer}}", { font: "body", weight: 800, size: 28, uppercase: true, color: "@accent" }),
        brandLogo([840, 1260, 180, 58], { align: "right" }),
      ],
    },
    // 14 ── STORY: DNES HRAJEME
    {
      id: "story-today",
      name: "Story: Dnes hrajeme",
      category: "Stories & Reels",
      description: "Story 9:16 – vše důležité v bezpečné zóně mimo UI Instagramu.",
      baseFormat: "ig_story",
      background: lin(160, [0, "@primary"], [1, "@dark"]),
      fields: [{ key: "kicker", label: "Titulek", type: "text" }, f.home, f.away, f.time, f.venue, { key: "cta", label: "Výzva (odkaz)", type: "text" }, f.photo],
      sampleData: {
        kicker: "Dnes hrajeme",
        home_team: "Basket Brno",
        away_team: "BK Kvis Pardubice",
        time: "18:00",
        venue: "Hala Vodova, Brno",
        cta: "Vstupenky v odkazu",
        photo: PHOTO(a.arena),
      },
      elements: [
        img("photo", "Fotka", [0, 0, 1080, 1100], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "top", fallback: "placeholder" }),
        rect("fade", "Přechod", [0, 650, 1080, 450], lin(90, [0, "@dark/0"], [1, "@dark"]), { anchorX: "stretch", anchorY: "top", hideIn: ["x"] }),
        rect("block", "Spodní blok", [0, 1099, 1080, 821], "@dark", { anchorX: "stretch", anchorY: "bottom", hideIn: ["x"] }),
        brandLogo([440, 250, 200, 70], { anchorY: "top" }),
        text("kicker", "Titulek", [60, 900, 960, 150], "{{kicker}}", { size: 160, uppercase: true, align: "center" }),
        logo("home-logo", "Logo domácí", [150, 1060, 250, 250], "home_team"),
        text("vs", "VS", [440, 1120, 200, 130], "VS", { size: 110, align: "center", color: "@accent" }),
        logo("away-logo", "Logo hosté", [680, 1060, 250, 250], "away_team"),
        text("hn", "Domácí", [60, 1320, 440, 60], "{{home_team|short}}", { font: "body", weight: 800, size: 40, align: "center" }),
        text("an", "Hosté", [580, 1320, 440, 60], "{{away_team|short}}", { font: "body", weight: 800, size: 40, align: "center" }),
        text("time", "Čas", [60, 1390, 960, 170], "{{time}}", { size: 190, align: "center", color: "@accent" }),
        text("venue", "Místo", [60, 1555, 960, 56], "{{venue}}", { font: "body", weight: 600, size: 36, align: "center" }),
        text("cta", "Výzva", [190, 1620, 700, 70], "{{cta}}", { font: "body", weight: 800, size: 32, uppercase: true, align: "center", color: "@dark", pill: { fill: "#FFFFFF", padX: 30, padY: 14, radius: 40 }, showIf: "cta" }),
      ],
    },
    // 15 ── REELS COVER
    {
      id: "reels-cover",
      name: "Reels cover",
      category: "Stories & Reels",
      description: "Titulek drží ve středu, aby se neořízl v mřížce profilu (4:5).",
      baseFormat: "ig_story",
      background: "@dark",
      fields: [{ key: "kicker", label: "Štítek", type: "text" }, { key: "title", label: "Titulek", type: "longtext", help: "[Slova v závorkách] se zvýrazní." }, { key: "subtitle", label: "Podtitulek", type: "text" }, f.photo],
      sampleData: { kicker: "Epizoda 4", title: "Den [s týmem] před derby", subtitle: "Zákulisí zápasu Brno – Nymburk", photo: PHOTO(a.ball) },
      elements: [
        img("photo", "Fotka", [0, 0, 1080, 1920], "{{photo}}", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch" }),
        rect("shade", "Ztmavení", [0, 0, 1080, 1920], lin(90, [0, "@dark/10"], [0.5, "@dark/45"], [1, "@dark/90"]), { zone: "bg", anchorX: "stretch", anchorY: "stretch" }),
        text("kicker", "Štítek", [60, 420, 960, 62], "{{kicker}}", { font: "body", weight: 800, size: 32, uppercase: true, align: "center", letterSpacing: 0.1, pill: { fill: "@accent", padX: 24, padY: 12, radius: 6 }, anchorY: "center" }),
        text("title", "Titulek", [60, 510, 960, 560], "{{title}}", { size: 210, uppercase: true, align: "center", maxLines: 3, lineHeight: 0.9, highlight: "@accent", anchorY: "center" }),
        text("subtitle", "Podtitulek", [80, 1090, 920, 140], "{{subtitle}}", { font: "body", weight: 700, size: 46, align: "center", maxLines: 2, anchorY: "center" }),
        brandLogo([440, 1480, 200, 70], { anchorY: "center" }),
      ],
    },
    // 16 ── PROGRAM KOLA (podle vaší šablony)
    {
      id: "program",
      name: "Program kola",
      category: "Soutěž",
      description: "Pozadí z brand kitu, hráči po stranách s přechodem, 6 zápasů. Čáry a pozadí řádků si nahrajete sami.",
      background: "@dark",
      fields: [
        { key: "title", label: "Titulek", type: "text" },
        { key: "dates", label: "Termín", type: "text", placeholder: "23.9." },
        f.round,
        {
          key: "games",
          label: "Zápasy",
          type: "list",
          columns: [
            { key: "home", label: "Domácí", type: "team" },
            { key: "away", label: "Hosté", type: "team" },
            { key: "date", label: "Datum", type: "date" },
            { key: "time", label: "Čas", type: "text" },
            { key: "tv", label: "TV", type: "channel" },
          ],
        },
        { key: "photo_left", label: "Hráč vlevo (bez pozadí)", type: "image" },
        { key: "photo_right", label: "Hráč vpravo (bez pozadí)", type: "image" },
      ],
      sampleData: { title: "Program", dates: "23.9.", round: "2. kolo", games: PROGRAM_3_KOLO.map((g, i) => ({ ...g, date: "2026-09-23", time: "18:00", tv: i === 0 ? "Prima Sport" : "" })), photo_left: { asset: a.player }, photo_right: { asset: a.player } },
      elements: [
        img("bg", "Pozadí (brand kit)", [0, 0, 1080, 1350], "brand:bg0", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch", fallback: "none" }),
        img("pl", "Hráč vlevo", [-330, 215, 873, 1135], "{{photo_left}}", { align: "left", valign: "bottom", showIf: "photo_left", hideIn: ["x"], anchorX: "left", anchorY: "bottom" }),
        img("pr", "Hráč vpravo", [537, 215, 873, 1135], "{{photo_right}}", { align: "right", valign: "bottom", showIf: "photo_right", hideIn: ["x"], anchorX: "right", anchorY: "bottom" }),
        img("fade", "Přechod přes hráče", [0, 0, 1080, 1350], "brand:bg0", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch", fallback: "none", fade: { angle: 90, from: 0.55, to: 0.84 } }),
        img("lines", "Čáry nahoře", [620, 0, 460, 430], "asset:", { fit: "contain", align: "right", valign: "top", anchorX: "right", anchorY: "top", fallback: "placeholder" }),
        text("title", "Titulek", [262, 34, 560, 132], "{{title}}", { size: 178, uppercase: true, align: "left", color: "@accent", letterSpacing: -0.01 }),
        rect("pill-bg", "Štítek", [263, 170, 330, 52], "@accent", { radius: 3 }),
        text("pill", "Termín", [263, 170, 330, 52], "{{dates}} | {{round}}", { font: "body", weight: 700, size: 34, uppercase: true, align: "center" }),
        list("games", "Zápasy", [266, 263, 549, 943], "games", 131, 31, [
          logo("hl", "Logo D", [16, 8, 140, 115], "home", { logoVariant: "white" }),
          text("day", "Den", [160, 20, 229, 56], "{{date|day}}", { size: 62, align: "center", hideIf: "tv" }),
          text("time", "Čas", [160, 76, 229, 38], "{{time}}", { size: 40, align: "center", hideIf: "tv" }),
          text("day-tv", "Den (s TV)", [160, 4, 229, 52], "{{date|day}}", { size: 56, align: "center", showIf: "tv" }),
          text("time-tv", "Čas (s TV)", [160, 52, 229, 40], "{{time}}", { size: 38, align: "center", showIf: "tv" }),
          img("tv", "Logo TV", [185, 93, 179, 30], "channel:{{tv}}", { fit: "contain", showIf: "tv", fallback: "none" }),
          logo("al", "Logo H", [393, 8, 140, 115], "away", { logoVariant: "white" }),
        ], { rowsBg: { src: "asset:demo-rows-bg", radius: 20, opacity: 0.5, backing: "#000000" } }),
        img("partner", "Liga / partner", [396, 1250, 170, 66], "brand:partner", { fallback: "none", align: "right", locked: true }),
        brandLogo([578, 1246, 110, 74], { align: "left" }),
      ],
    },
    // 17 ── VÝSLEDKY KOLA (jeden slide, minimalistický styl)
    {
      id: "results-round",
      name: "Výsledky kola",
      category: "Soutěž",
      description: "Celé kolo na jednom slidu: loga, skóre a čtvrtiny. Pozadí z brand kitu, logo soutěže dole.",
      background: "@dark",
      fields: [
        { key: "title", label: "Titulek", type: "text" },
        f.round,
        {
          key: "games",
          label: "Zápasy",
          type: "list",
          help: "Vložte i jako text: Nymburk – Brno 92:78",
          columns: [
            { key: "home", label: "Domácí", type: "team" },
            { key: "away", label: "Hosté", type: "team" },
            { key: "home_score", label: "Skóre D", type: "number" },
            { key: "away_score", label: "Skóre H", type: "number" },
            { key: "detail", label: "Čtvrtiny", type: "text" },
          ],
        },
        { key: "loser", label: "Poražený tým", type: "select", options: ["Ztlumit a černobíle", "Ztlumit", "Černobíle", "Nic"] },
        { key: "comp_logo", label: "Logo soutěže (jinak z brand kitu)", type: "image" },
      ],
      sampleData: { title: "Výsledky", round: "2. kolo", games: RESULTS_2_KOLO.slice(0, 6), loser: "Ztlumit a černobíle" },
      elements: [
        img("bg", "Pozadí (brand kit)", [0, 0, 1080, 1350], "brand:bg0", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch", fallback: "none" }),
        rect("shade", "Ztmavení", [0, 0, 1080, 1350], lin(90, [0, "@dark/15"], [0.5, "@dark/45"], [1, "@dark/25"]), { zone: "bg", anchorX: "stretch", anchorY: "stretch" }),
        img("lines", "Čáry nahoře", [620, 0, 460, 430], "asset:", { fit: "contain", align: "right", valign: "top", anchorX: "right", anchorY: "top", fallback: "placeholder" }),
        text("title", "Titulek", [140, 40, 800, 160], "{{title}}", { size: 196, uppercase: true, align: "center", color: "@accent", letterSpacing: -0.01 }),
        text("round", "Kolo", [240, 206, 600, 58], "{{round}}", { font: "body", weight: 700, size: 36, uppercase: true, align: "center", pill: { fill: "@accent", padX: 30, padY: 8, radius: 3 } }),
        list("games", "Zápasy", [140, 296, 800, 910], "games", 140, 14, [
          rect("bg", "Pozadí řádku", [0, 0, 800, 140], "@dark/45", { radius: 18 }),
          logo("hl", "Logo D", [34, 14, 180, 112], "home", { logoVariant: "white", equalize: 0.55, dim: { when: "home_score < away_score", opacity: 0.45, gray: true, mode: "loser" } }),
          text("hs", "Skóre D", [220, 8, 165, 92], "{{home_score}}", { fitWith: "{{away_score}}", size: 104, align: "right", dim: { when: "home_score < away_score", opacity: 0.4, mode: "loser" } }),
          text("colon", "Dvojtečka", [385, 8, 30, 92], ":", { size: 104, align: "center", color: "@accent" }),
          text("as", "Skóre H", [415, 8, 165, 92], "{{away_score}}", { fitWith: "{{home_score}}", size: 104, align: "left", dim: { when: "away_score < home_score", opacity: 0.4, mode: "loser" } }),
          text("detail", "Čtvrtiny", [180, 100, 440, 30], "{{detail}}", { font: "body", weight: 500, size: 24, align: "center", opacity: 0.55, showIf: "detail" }),
          logo("al", "Logo H", [586, 14, 180, 112], "away", { logoVariant: "white", equalize: 0.55, dim: { when: "away_score < home_score", opacity: 0.45, gray: true, mode: "loser" } }),
        ]),
        img("comp-logo", "Logo soutěže", [360, 1240, 210, 76], "{{comp_logo}}", { fit: "contain", align: "right", showIf: "comp_logo", fallback: "none" }),
        img("partner", "Liga / partner", [360, 1240, 210, 76], "brand:partner", { fallback: "none", align: "right", hideIf: "comp_logo" }),
        brandLogo([590, 1238, 120, 80], { align: "left" }),
      ],
    },
    // 18 ── VÝSLEDKY ZÁPASŮ – CAROUSEL (co slide, to zápas; přechod plynule přes slidy)
    {
      id: "results-panorama",
      name: "Výsledky zápasů – carousel",
      category: "Zápas",
      description: "Až 6 zápasů vedle sebe jako carousel: každý slide má vlastní fotku, přechod plynule navazuje (1.–2. slide jeden obrázek, 3.–4. zrcadlově, 5.–6. znovu).",
      background: "@dark",
      paginate: { field: "games", perPage: 1, rowAsData: true },
      fields: [
        {
          key: "games",
          label: "Zápasy (1 zápas = 1 slide)",
          type: "list",
          help: "Fotku přidáte kliknutím na políčko ve sloupci Fotka. Posun výřezu: tažením v náhledu.",
          columns: [
            { key: "home", label: "Domácí", type: "team" },
            { key: "away", label: "Hosté", type: "team" },
            { key: "home_score", label: "Skóre D", type: "number" },
            { key: "away_score", label: "Skóre H", type: "number" },
            { key: "mvp", label: "Hráč zápasu", type: "text" },
            { key: "photo", label: "Fotka", type: "image" },
            { key: "credit", label: "Foto", type: "text" },
          ],
        },
      ],
      sampleData: {
        games: RESULTS_2_KOLO.slice(0, 6).map((g, i) => ({
          home: g.home,
          away: g.away,
          home_score: g.home_score,
          away_score: g.away_score,
          mvp: ["Jan Štěrba (16 PTS, 13 REB)", "Robert Bonham (19 PTS, 5 AST)", "Andre Screen (26 PTS, 12 REB)", "Martin Svoboda (23 PTS, 7 REB)", "Javian McCollum (20 PTS, 5 AST)", "Jabari Mcghee (27 PTS, 5 REB)"][i],
          photo: PHOTO(i % 2 ? a.ball : a.arena),
          credit: "Hana Kozmová",
        })),
      },
      elements: [
        img("photo", "Fotka", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "placeholder" }),
        img("bg-fade", "Přechod (přes slidy)", [0, 0, 1080, 1350], "brand:bg0", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch", fallback: "none", fade: { angle: 90, from: 0.42, to: 0.76 }, panorama: { span: 2, mirror: true } }),
        text("credit", "Foto credit", [520, 22, 530, 42], "Foto: {{credit}}", { font: "body", italic: true, weight: 600, size: 30, align: "right", showIf: "credit", anchorX: "right", anchorY: "top", shadow: { color: "rgba(0,0,0,0.5)", blur: 8, x: 0, y: 2 } }),
        logo("home-logo", "Logo domácí", [160, 1026, 240, 136], "home"),
        text("score", "Skóre", [396, 1036, 288, 124], "{{home_score}} : {{away_score}}", { size: 142, align: "center", minSize: 70 }),
        logo("away-logo", "Logo hosté", [680, 1026, 240, 136], "away"),
        line("divider", "Linka", [105, 1178, 870, 4], "#FFFFFF", 3),
        text("mvp", "Hráč zápasu", [90, 1190, 900, 62], "{{mvp}}", { font: "body", italic: true, weight: 600, size: 38, align: "center", showIf: "mvp", icon: { src: "asset:demo-star", scale: 1.8, gap: 0.12 } }),
        img("partner", "Liga / partner", [396, 1258, 170, 66], "brand:partner", { fallback: "none", align: "right", locked: true }),
        brandLogo([578, 1254, 110, 74], { align: "left" }),
      ],
    },
    // 19 ── KOLÁŽ HRÁČŮ (2–4 fotky se statistikami)
    {
      id: "collage",
      name: "Koláž hráčů",
      category: "Hráči",
      description: "2 až 4 fotky na jednom posteru, u každé jméno a statistiky. Rozložení se samo přizpůsobí počtu fotek, titulek je nepovinný.",
      background: "@dark",
      fields: [
        { key: "title", label: "Titulek (nepovinné)", type: "text" },
        { key: "subtitle", label: "Podtitulek / kolo (nepovinné)", type: "text" },
        ...[1, 2, 3, 4].flatMap((n): FieldDef[] => [
          { key: `p${n}_photo`, label: `${n}. fotka${n > 2 ? " (nepovinná)" : ""}`, type: "image" },
          { key: `p${n}_name`, label: `${n}. jméno`, type: "text" },
          { key: `p${n}_stats`, label: `${n}. statistiky`, type: "text", placeholder: "24 PTS · 8 REB · 5 AST" },
          { key: `p${n}_team`, label: `${n}. tým (logo, nepovinné)`, type: "team" },
        ]),
      ],
      sampleData: {
        title: "Hráči kola",
        subtitle: "4. kolo Maxa NBL",
        p1_photo: PHOTO(a.arena), p1_name: "Jaborri McGhee", p1_stats: "27 PTS · 5 REB", p1_team: "Sluneta Ústí nad Labem",
        p2_photo: PHOTO(a.ball), p2_name: "Javian McCollum", p2_stats: "20 PTS · 5 AST", p2_team: "Slavia Praha",
        p3_photo: PHOTO(a.arena), p3_name: "Andre Screen", p3_stats: "26 PTS · 12 REB", p3_team: "NH Ostrava",
        p4_photo: PHOTO(a.ball), p4_name: "Martin Svoboda", p4_stats: "23 PTS · 7 REB", p4_team: "Sršni Písek",
      },
      elements: collageElements(),
    },
    // 20 ── FORMA / SÉRIE TÝMU (výhry a prohry v řadě)
    {
      id: "streak",
      name: "Forma týmu – série",
      category: "Klub",
      description: "Prémiová forma týmu: fotka se ztrácí do tmavé, obří kovové číslo série („9 výher v řadě“), bilance a skleněné dlaždice s logy soupeřů (výhra zeleně, prohra červeně, logo soupeře u prohry volitelně ztlumené / černobílé); velké číslo a bilanci lze skrýt. Série i bilance se spočítají samy.",
      background: "@dark",
      finish: { grain: 14, vignette: 34 },
      fields: [
        { key: "team", label: "Tým", type: "team" },
        { key: "headline", label: "Titulek dole", type: "text", placeholder: "Dlouhá neporazitelnost Nymburka je u konce" },
        { key: "kicker", label: "Nadpis nahoře (prázdné = série se spočítá sama)", type: "text" },
        { key: "hero", label: "Velké číslo série a bilance", type: "select", options: ["Zobrazit", "Skrýt"] },
        { key: "loss_dim", label: "Loga soupeřů u proher", type: "select", options: ["Nic", "Ztlumit", "Černobíle", "Ztlumit a černobíle"] },
        {
          key: "games",
          label: "Zápasy (od nejstaršího)",
          type: "list",
          help: "Do sloupce Výsledek pište V nebo P.",
          columns: [
            { key: "result", label: "Výsledek (V/P)", type: "text" },
            { key: "opp", label: "Soupeř", type: "team" },
            { key: "score", label: "Skóre (nepovinné)", type: "text" },
          ],
        },
        f.photo,
        f.credit,
        { key: "comp_logo", label: "Logo soutěže (jinak z brand kitu)", type: "image" },
      ],
      sampleData: {
        team: "BK Kvis Pardubice",
        headline: "Pardubice drží šňůru bez porážky",
        kicker: "",
        hero: "Zobrazit",
        loss_dim: "Nic",
        games: [
          ["V", "NH Ostrava"], ["V", "BK Armex Energy Děčín"], ["P", "Slavia Praha"], ["V", "Sluneta Ústí nad Labem"], ["V", "Sršni Písek"], ["V", "Basket Brno"],
          ["V", "NH Ostrava"], ["V", "BK Opava"], ["V", "USK Praha"], ["V", "BK Olomoucko"], ["V", "BK GAPA Hradec Králové"], ["V", "BK Lokomotiva Plzeň"],
        ].map(([result, opp]) => ({ result, opp, score: "" })),
        photo: PHOTO(a.arena),
        photo_credit: "",
      },
      elements: [
        img("photo", "Fotka", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "placeholder" }),
        // fotka se dole ztrácí do tmavé barvy, nahoře jemné ztmavení pro logo
        rect("shade", "Přechod do tmavé", [0, 0, 1080, 1350], lin(90, [0, "@dark/55"], [0.16, "@dark/10"], [0.34, "@dark/25"], [0.55, "@dark/88"], [0.7, "@dark/97"], [1, "@dark"]), { zone: "bg", anchorX: "stretch", anchorY: "stretch" }),
        // prémiové světlo v barvě projektu
        img("silk", "Hedvábné světlo (barva projektu)", [0, 560, 1080, 790], "asset:tex-silk", { fit: "cover", lumaKey: 1.6, tint: "@primary", blend: "screen", opacity: 0.55, fallback: "none", anchorX: "stretch", anchorY: "bottom" }),
        img("silk-hl", "Hedvábné světlo – lesk", [0, 560, 1080, 790], "asset:tex-silk", { fit: "cover", lumaKey: 4.5, blend: "screen", opacity: 0.16, fallback: "none", anchorX: "stretch", anchorY: "bottom" }),
        rect("bloom", "Záře za číslem", [140, 300, 800, 620], { type: "radial", stops: [[0, "@primary/45"], [0.4, "@primary/12"], [0.69, "@primary/0"], [1, "@primary/0"]] }, { blend: "screen", hideIf: "hero == Skrýt" }),
        img("halftone", "Rastr teček", [0, 0, 1080, 1350], "asset:tex-halftone", { fit: "cover", lumaKey: 1, blend: "screen", opacity: 0.05, fallback: "none", anchorX: "stretch", anchorY: "stretch" }),
        brandLogo([40, 40, 92, 62], { align: "left", anchorY: "top" }),
        text("credit", "Foto credit", [560, 36, 480, 42], "Foto: {{photo_credit}}", { font: "body", italic: true, weight: 600, size: 26, align: "right", opacity: 0.8, showIf: "photo_credit", anchorX: "right", anchorY: "top", shadow: { color: "rgba(0,0,0,0.5)", blur: 8, x: 0, y: 2 } }),
        img("comp-logo", "Logo soutěže", [390, 40, 300, 90], "{{comp_logo}}", { fit: "contain", showIf: "comp_logo", fallback: "none", anchorY: "top" }),
        img("partner", "Liga / partner", [390, 40, 300, 90], "brand:partner", { fit: "contain", hideIf: "comp_logo", fallback: "none", anchorY: "top" }),
        // série: obří kovové číslo + slova pod ním
        text("streak-n", "Série – číslo", [140, 330, 800, 330], "{{@streakn:games}}", { font: "Mazzard H", weight: 900, size: 340, minSize: 120, align: "center", valign: "bottom", letterSpacing: -0.04, fill: lin(90, [0, "#FFFFFF"], [0.55, "#F1EEF6"], [1, "#B9B2C6"]), shadow: { color: "rgba(0,0,0,0.55)", blur: 40, x: 0, y: 14 }, hideIf: "kicker || hero == Skrýt" }),
        text("streak-w", "Série – text", [100, 668, 880, 58], "{{@streakw:games}}", { font: "Mazzard H", weight: 600, size: 46, uppercase: true, align: "center", letterSpacing: 0.22, hideIf: "kicker || hero == Skrýt", shadow: { color: "rgba(0,0,0,0.5)", blur: 14, x: 0, y: 3 } }),
        text("kicker-own", "Nadpis (vlastní)", [80, 480, 920, 240], "{{kicker}}", { font: "Mazzard H", weight: 900, size: 150, minSize: 60, uppercase: true, align: "center", valign: "bottom", maxLines: 2, lineHeight: 0.95, fill: lin(90, [0, "#FFFFFF"], [0.55, "#F1EEF6"], [1, "#B9B2C6"]), showIf: "kicker", shadow: { color: "rgba(0,0,0,0.55)", blur: 30, x: 0, y: 10 } }),
        rect("rec-l", "Bilance – linka vlevo", [330, 762, 70, 1.5], "rgba(255,255,255,0.5)", { hideIf: "hero == Skrýt" }),
        text("record", "Bilance", [400, 742, 280, 42], "Bilance [{{@record:games}}]", { font: "Mazzard H", weight: 600, size: 26, uppercase: true, align: "center", letterSpacing: 0.16, highlight: "@accent", highlightWeight: 900, hideIf: "hero == Skrýt" }),
        rect("rec-r", "Bilance – linka vpravo", [680, 762, 70, 1.5], "rgba(255,255,255,0.5)", { hideIf: "hero == Skrýt" }),
        // forma: skleněné dlaždice s logem soupeře, V/P v pruhu dole (výhra = barva projektu, prohra ztlumená)
        list("games", "Série zápasů", [70, 818, 940, 368], "games", 168, 16, [
          rect("tile", "Dlaždice – sklo", [0, 0, 144, 168], lin(90, [0, "rgba(255,255,255,0.13)"], [1, "rgba(255,255,255,0.04)"]), { radius: 14, stroke: "rgba(255,255,255,0.18)", strokeWidth: 1.5, shadow: { color: "rgba(0,0,0,0.35)", blur: 18, x: 0, y: 8 } }),
          logo("opp", "Soupeř", [24, 14, 96, 84], "opp", { equalize: 0.72, dim: { when: "result == P || result == L", opacity: 0.45, gray: true, mode: "loss_dim" } }),
          text("score", "Skóre", [0, 98, 144, 24], "{{score}}", { font: "Mazzard H", weight: 600, size: 18, align: "center", opacity: 0.8, showIf: "score" }),
          path("band-w", "Pruh výhra", [0, 126, 144, 42], "M0 0 L100 0 L100 66 Q100 100 90 100 L10 100 Q0 100 0 66 Z", { fill: lin(90, [0, "#22B455"], [1, "#16893F"]), showIf: "result == V || result == W" }),
          path("band-l", "Pruh prohra", [0, 126, 144, 42], "M0 0 L100 0 L100 66 Q100 100 90 100 L10 100 Q0 100 0 66 Z", { fill: lin(90, [0, "#E2283E"], [1, "#B01B2E"]), showIf: "result == P || result == L" }),
          text("letter", "V / P", [0, 126, 144, 42], "{{result|upper}}", { font: "Mazzard H", weight: 900, size: 28, align: "center" }),
        ], { grid: { cols: 6, colWidth: 144, colGap: 15 }, center: true }),
        // titulek dole s logem týmu
        logo("team-logo", "Logo týmu", [60, 1210, 110, 96], "team", { logoVariant: "white", anchorY: "bottom" }),
        rect("bar", "Čárka", [188, 1214, 4, 88], "@accent", { anchorY: "bottom" }),
        text("headline", "Titulek", [210, 1210, 830, 96], "{{headline}}", { font: "Mazzard H", weight: 600, size: 40, uppercase: true, maxLines: 2, lineHeight: 1.1, anchorY: "bottom" }),
      ],
    },
    // 21 ── PROGRAM BCL – PREMIUM (podle EuroLeague „Rivalry Series“: světelný vír, kovový nadpis, závorky kolem času).
    //       1 zápas = rozložení jako předloha (dva hráči, loga pod nimi, čas uprostřed), 2+ zápasy = karty mezi hráči.
    {
      id: "bcl-program",
      name: "Program – Liga mistrů",
      category: "Soutěž",
      description: "Prémiový program BCL podle EuroLeague Rivalry: světelný vír v barvách projektu, kovový nadpis, čas v rohových závorkách. Jeden zápas = dva hráči s logy a časem uprostřed, víc zápasů = skleněné karty mezi hráči.",
      background: { type: "radial", stops: [[0, "@secondary"], [0.6, "@dark"], [1, "@dark"]] },
      finish: { grain: 14, vignette: 38 },
      fields: [
        { key: "title", label: "Nadpis", type: "text" },
        { key: "subtitle", label: "Pruh pod nadpisem", type: "text", placeholder: "Liga mistrů FIBA · 2. kolo" },
        {
          key: "games",
          label: "Zápasy",
          type: "list",
          help: "Jeden zápas = velké rozložení s hráči (jako EuroLeague Rivalry). Loga soupeřů: vyberte tým, nebo nahrajte logo přímo do řádku.",
          columns: [
            { key: "home", label: "Domácí", type: "team" },
            { key: "away", label: "Hosté", type: "team" },
            { key: "date", label: "Datum", type: "date" },
            { key: "time", label: "Čas", type: "text" },
            { key: "venue", label: "Město / hala", type: "text" },
            { key: "tv", label: "TV", type: "channel" },
            { key: "home_logo", label: "Logo D (vlastní)", type: "image" },
            { key: "away_logo", label: "Logo H (vlastní)", type: "image" },
          ],
        },
        { key: "photo_left", label: "Hráč vlevo (vyříznutý)", type: "image" },
        { key: "photo_right", label: "Hráč vpravo (vyříznutý)", type: "image" },
        { key: "name_left", label: "Příjmení hráče vlevo (jen 1 zápas)", type: "text" },
        { key: "name_right", label: "Příjmení hráče vpravo (jen 1 zápas)", type: "text" },
      ],
      sampleData: {
        title: "Program",
        subtitle: "Liga mistrů FIBA · 2. kolo",
        games: [
          { home: "Reggiana", away: "BK Kvis Pardubice", date: "2026-10-06", time: "20:00", venue: "Reggio Emilia", tv: "" },
          { home: "Slavia Praha", away: "Alba Berlín", date: "2026-10-07", time: "18:00", venue: "Praha", tv: "" },
        ],
        photo_left: { asset: a.player },
        photo_right: { asset: a.player },
        name_left: "",
        name_right: "",
      },
      elements: (() => {
        const ONE = "games.length == 1";
        const corner = (id: string, name: string, b: Box, d: string, o: Common = {}): TemplateElement => path(id, name, b, d, { stroke: "#FFFFFF", strokeWidth: 2.5, opacity: 0.9, ...o });
        const brackets = (pre: string, x: number, y: number, w: number, h: number, sz: number, o: Common = {}): TemplateElement[] => [
          corner(`${pre}-tl`, "Závorka 1", [x, y, sz, sz], "M0 100 L0 0 L100 0", o),
          corner(`${pre}-tr`, "Závorka 2", [x + w - sz, y, sz, sz], "M0 0 L100 0 L100 100", o),
          corner(`${pre}-bl`, "Závorka 3", [x, y + h - sz, sz, sz], "M0 0 L0 100 L100 100", o),
          corner(`${pre}-br`, "Závorka 4", [x + w - sz, y + h - sz, sz, sz], "M100 0 L100 100 L0 100", o),
        ];
        const one = { showIf: ONE, hideIn: ["x"] as FormatId[], anchorY: "bottom" as const };
        const many = { hideIf: ONE };
        return [
          ...bclVortexBg(),
          // ── hlavička (společná)
          ...bclHeader("{{title}}", "{{subtitle}}"),
          // ── 1 ZÁPAS ─────────────────────────────────────────────
          text("name-l", "Příjmení vlevo", [50, 64, 300, 50], "{{name_left}}", { font: "Saira Condensed", weight: 600, size: 38, uppercase: true, align: "left", letterSpacing: 0.08, opacity: 0.72, showIf: `${ONE} && name_left`, anchorX: "left", anchorY: "top" }),
          text("name-r", "Příjmení vpravo", [730, 64, 300, 50], "{{name_right}}", { font: "Saira Condensed", weight: 600, size: 38, uppercase: true, align: "right", letterSpacing: 0.08, opacity: 0.72, showIf: `${ONE} && name_right`, anchorX: "right", anchorY: "top" }),
          rect("one-glow-l", "Záře za hráčem vlevo", [-120, 260, 680, 760], { type: "radial", stops: [[0, "@primary/30"], [0.45, "@primary/8"], [0.7, "@primary/0"], [1, "@primary/0"]] }, { blend: "screen", ...one }),
          rect("one-glow-r", "Záře za hráčem vpravo", [520, 260, 680, 760], { type: "radial", stops: [[0, "@primary/30"], [0.45, "@primary/8"], [0.7, "@primary/0"], [1, "@primary/0"]] }, { blend: "screen", ...one }),
          img("one-pl", "Hráč vlevo (1 zápas)", [-10, 286, 560, 660], "{{photo_left}}", { fit: "contain", valign: "top", fade: { angle: 270, from: 0.06, to: 0.46 }, shadow: { color: "rgba(0,0,0,0.45)", blur: 40, x: 0, y: 10 }, ...one, showIf: `${ONE} && photo_left`, anchorY: "bottom" }),
          img("one-pr", "Hráč vpravo (1 zápas)", [530, 286, 560, 660], "{{photo_right}}", { fit: "contain", valign: "top", fade: { angle: 270, from: 0.06, to: 0.46 }, shadow: { color: "rgba(0,0,0,0.45)", blur: 40, x: 0, y: 10 }, ...one, showIf: `${ONE} && photo_right`, anchorY: "bottom" }),
          rect("one-dim", "Ztmavení pod logy", [0, 700, 1080, 520], lin(90, [0, "@dark/0"], [0.35, "@dark/70"], [0.7, "@dark/55"], [1, "@dark/0"]), { showIf: ONE, anchorY: "bottom" }),
          logo("one-hl", "Logo domácí (1 zápas)", [70, 770, 300, 240], "games.0.home", { override: "{{games.0.home_logo}}", logoVariant: "white", equalize: 0.62, shadow: { color: "rgba(0,0,0,0.55)", blur: 30, x: 0, y: 10 }, showIf: ONE, anchorY: "bottom" }),
          logo("one-al", "Logo hosté (1 zápas)", [710, 770, 300, 240], "games.0.away", { override: "{{games.0.away_logo}}", logoVariant: "white", equalize: 0.62, shadow: { color: "rgba(0,0,0,0.55)", blur: 30, x: 0, y: 10 }, showIf: ONE, anchorY: "bottom" }),
          ...brackets("one-br", 376, 812, 328, 156, 26, { showIf: ONE, anchorY: "bottom" }),
          text("one-time", "Čas (1 zápas)", [392, 824, 296, 84], "{{games.0.time}}", { font: "Saira Condensed", weight: 800, size: 86, align: "center", letterSpacing: 0.01, shadow: { color: "rgba(0,0,0,0.4)", blur: 16, x: 0, y: 4 }, showIf: ONE, anchorY: "bottom" }),
          text("one-when", "Datum a místo (1 zápas)", [392, 908, 296, 44], "{{games.0.date|date:spaced}}  |  {{games.0.venue}}", { font: "Saira Condensed", weight: 500, size: 34, minSize: 20, uppercase: true, align: "center", letterSpacing: 0.04, showIf: `${ONE} && games.0.venue`, anchorY: "bottom" }),
          text("one-day", "Den a datum (1 zápas)", [392, 908, 296, 44], "{{games.0.date|day}}  {{games.0.date|date:spaced}}", { font: "Saira Condensed", weight: 500, size: 34, minSize: 20, uppercase: true, align: "center", letterSpacing: 0.04, showIf: ONE, hideIf: "games.0.venue", anchorY: "bottom" }),
          text("one-live", "Živě na", [390, 1052, 300, 36], "Živě na", { font: "Saira Condensed", weight: 800, size: 30, uppercase: true, align: "center", letterSpacing: 0.14, showIf: `${ONE} && games.0.tv`, anchorY: "bottom" }),
          img("one-tv", "Logo TV (1 zápas)", [380, 1092, 320, 70], "channel:{{games.0.tv}}", { fit: "contain", fallback: "none", showIf: `${ONE} && games.0.tv`, anchorY: "bottom" }),
          // ── VÍC ZÁPASŮ ──────────────────────────────────────────
          img("pl", "Hráč vlevo", [-230, 330, 660, 1020], "{{photo_left}}", { fit: "contain", align: "left", valign: "bottom", anchorX: "left", anchorY: "bottom", hideIn: ["x"], ...many, showIf: "photo_left" }),
          img("pr", "Hráč vpravo", [650, 330, 660, 1020], "{{photo_right}}", { fit: "contain", align: "right", valign: "bottom", anchorX: "right", anchorY: "bottom", hideIn: ["x"], ...many, showIf: "photo_right" }),
          rect("many-dim", "Ztmavení za kartami", [100, 300, 880, 1000], { type: "radial", stops: [[0, "@dark/80"], [0.45, "@dark/55"], [0.7, "@dark/0"], [1, "@dark/0"]] }, { ...many, hideIn: ["x"] }),
          rect("many-dim-b", "Ztmavení dole", [0, 980, 1080, 370], lin(90, [0, "@dark/0"], [0.6, "@dark/45"], [1, "@dark/65"]), { ...many, anchorX: "stretch", anchorY: "bottom" }),
          list("games", "Zápasy", [200, 316, 680, 900], "games", 172, 26, [
            rect("card", "Karta – sklo", [0, 0, 680, 172], lin(0, [0, "@secondary/78"], [0.5, "@dark/82"], [1, "@secondary/78"]), { radius: 6, stroke: "rgba(255,255,255,0.16)", strokeWidth: 1.5, shadow: { color: "rgba(0,0,0,0.55)", blur: 36, x: 0, y: 14 } }),
            rect("edge", "Světelná hrana", [40, 0, 600, 2], lin(0, [0, "@primary/0"], [0.5, "@primary"], [1, "@primary/0"])),
            rect("edge-b", "Světelná hrana dole", [140, 170.5, 400, 1.5], lin(0, [0, "@primary/0"], [0.5, "@primary/60"], [1, "@primary/0"])),
            rect("edge-hl", "Světelná hrana – lesk", [200, 0, 280, 1.5], lin(0, [0, "rgba(255,255,255,0)"], [0.5, "rgba(255,255,255,0.9)"], [1, "rgba(255,255,255,0)"])),
            logo("hl", "Logo D", [24, 16, 150, 140], "home", { override: "{{home_logo}}", logoVariant: "white", equalize: 0.64 }),
            logo("al", "Logo H", [506, 16, 150, 140], "away", { override: "{{away_logo}}", logoVariant: "white", equalize: 0.64 }),
            ...brackets("cb", 206, 16, 268, 140, 18),
            text("time", "Čas", [214, 24, 252, 78], "{{time}}", { font: "Saira Condensed", weight: 800, size: 74, align: "center", hideIf: "tv" }),
            text("when", "Den a datum", [214, 104, 252, 40], "{{date|day}}  {{date|date:spaced}}", { font: "Saira Condensed", weight: 500, size: 30, minSize: 18, uppercase: true, align: "center", letterSpacing: 0.04, opacity: 0.9, hideIf: "tv" }),
            text("time-tv", "Čas (s TV)", [214, 20, 252, 64], "{{time}}", { font: "Saira Condensed", weight: 800, size: 62, align: "center", showIf: "tv" }),
            text("when-tv", "Den a datum (s TV)", [214, 84, 252, 34], "{{date|day}}  {{date|date:spaced}}", { font: "Saira Condensed", weight: 500, size: 27, minSize: 18, uppercase: true, align: "center", letterSpacing: 0.04, opacity: 0.9, showIf: "tv" }),
            img("tv", "Logo TV", [270, 122, 140, 28], "channel:{{tv}}", { fit: "contain", showIf: "tv", fallback: "none" }),
          ], { ...many, anchorY: "stretch" }),
          // ── patička
          brandLogo([430, 1262, 220, 58], { anchorY: "bottom" }),
        ];
      })(),
    },
    // 22 ── VÝSLEDEK BCL (styl „FINAL“ panelu – skleněný panel, štítek, hráč zápasu)
    {
      id: "bcl-result",
      name: "Výsledek zápasu – BCL",
      category: "Zápas",
      description: "Fotka přes celou plochu, štítek KONEC, skleněný panel se skóre a logy (lze nahrát ručně), bilance týmů a pruh s hráčem zápasu.",
      background: "@dark",
      fields: [
        { key: "round", label: "Kolo (svisle vlevo nahoře)", type: "text", placeholder: "1. kolo" },
        { key: "status", label: "Štítek", type: "text", placeholder: "Konec / Po prodloužení" },
        f.home,
        { key: "home_logo", label: "Logo domácích (vlastní)", type: "image" },
        { key: "home_record", label: "Bilance domácích", type: "text", placeholder: "2-1" },
        f.away,
        { key: "away_logo", label: "Logo hostů (vlastní)", type: "image" },
        { key: "away_record", label: "Bilance hostů", type: "text", placeholder: "1-2" },
        f.hs,
        f.as,
        { key: "mvp_name", label: "Hráč zápasu", type: "text" },
        { key: "s1_value", label: "Stat 1 – číslo", type: "text" },
        { key: "s1_label", label: "Stat 1 – popisek", type: "text" },
        { key: "s2_value", label: "Stat 2 – číslo", type: "text" },
        { key: "s2_label", label: "Stat 2 – popisek", type: "text" },
        { key: "s3_value", label: "Stat 3 – číslo", type: "text" },
        { key: "s3_label", label: "Stat 3 – popisek", type: "text" },
        f.photo,
        f.credit,
      ],
      sampleData: {
        round: "1. kolo",
        status: "Konec",
        home_team: "BK Kvis Pardubice",
        home_record: "1-0",
        away_team: "Reggiana",
        away_record: "0-1",
        home_score: 84,
        away_score: 79,
        mvp_name: "Martin Peterka",
        s1_value: "19",
        s1_label: "PTS",
        s2_value: "6",
        s2_label: "REB",
        s3_value: "22",
        s3_label: "EFF",
        photo: PHOTO(a.arena),
        photo_credit: "",
      },
      elements: [
        img("photo", "Fotka", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "placeholder" }),
        rect("shade", "Přechod dole", [0, 0, 1080, 1350], lin(90, [0, "@dark/0"], [0.4, "@dark/0"], [0.58, "@dark/75"], [0.8, "@dark"], [1, "@dark"]), { zone: "bg", anchorX: "stretch", anchorY: "stretch" }),
        rect("glow", "Tyrkysová záře", [0, 1080, 1080, 270], lin(90, [0, "@primary/0"], [1, "@primary/30"]), { anchorX: "stretch", anchorY: "bottom" }),
        rect("round-bg", "Kolo – plocha", [34, 34, 62, 210], "@dark/85", { radius: 10, showIf: "round", anchorY: "top" }),
        text("round", "Kolo", [34, 34, 62, 210], "{{round}}", { font: "Saira Condensed", weight: 800, size: 36, uppercase: true, vertical: true, align: "center", color: "@primary", letterSpacing: 0.06, showIf: "round", anchorY: "top" }),
        text("credit", "Foto credit", [520, 30, 530, 40], "Foto: {{photo_credit}}", { font: "body", italic: true, weight: 600, size: 26, align: "right", showIf: "photo_credit", anchorX: "right", anchorY: "top", shadow: { color: "rgba(0,0,0,0.5)", blur: 8, x: 0, y: 2 } }),
        rect("panel", "Skleněný panel", [60, 832, 960, 262], "@secondary/60", { radius: 34, stroke: "@primary/45", strokeWidth: 2, shadow: { color: "rgba(0,0,0,0.45)", blur: 40, x: 0, y: 14 } }),
        rect("rec-h-bg", "Bilance D – plocha", [96, 806, 124, 46], "#F2F6F8", { radius: 10, showIf: "home_record" }),
        text("rec-h", "Bilance D", [96, 806, 124, 46], "{{home_record}}", { font: "Saira Condensed", weight: 800, size: 32, align: "center", color: "@dark", showIf: "home_record" }),
        rect("rec-a-bg", "Bilance H – plocha", [860, 806, 124, 46], "#F2F6F8", { radius: 10, showIf: "away_record" }),
        text("rec-a", "Bilance H", [860, 806, 124, 46], "{{away_record}}", { font: "Saira Condensed", weight: 800, size: 32, align: "center", color: "@dark", showIf: "away_record" }),
        path("status-bg", "Štítek – plocha", [320, 786, 440, 84], "M10 0 L90 0 Q100 0 100 50 Q100 100 90 100 L10 100 Q0 100 0 50 Q0 0 10 0 Z", { fill: "@primary", shadow: { color: "rgba(0,0,0,0.35)", blur: 18, x: 0, y: 6 } }),
        text("status", "Štítek", [344, 786, 392, 84], "{{status}}", { font: "Russo One", weight: 400, size: 50, minSize: 26, uppercase: true, align: "center", color: "@dark", letterSpacing: 0.04 }),
        logo("home-logo", "Logo domácí", [96, 890, 220, 170], "home_team", { override: "{{home_logo}}", equalize: 0.62 }),
        text("hs", "Skóre D", [318, 880, 210, 190], "{{home_score}}", { fitWith: "{{away_score}}", font: "Saira Condensed", weight: 800, size: 176, align: "center", dim: { when: "home_score < away_score", opacity: 0.45 } }),
        rect("divider", "Dělicí čára", [538, 900, 4, 150], "@primary"),
        text("as", "Skóre H", [552, 880, 210, 190], "{{away_score}}", { fitWith: "{{home_score}}", font: "Saira Condensed", weight: 800, size: 176, align: "center", dim: { when: "away_score < home_score", opacity: 0.45 } }),
        logo("away-logo", "Logo hosté", [764, 890, 220, 170], "away_team", { override: "{{away_logo}}", equalize: 0.62 }),
        path("mvp-bg", "Hráč zápasu – plocha", [60, 1118, 470, 74], "M3 0 L100 0 L95 100 L3 100 Q0 100 0 86 L0 14 Q0 0 3 0 Z", { fill: "@primary", showIf: "mvp_name" }),
        text("mvp", "Hráč zápasu", [84, 1118, 410, 74], "{{mvp_name}}", { font: "Russo One", weight: 400, size: 38, uppercase: true, align: "center", color: "@dark", showIf: "mvp_name" }),
        rect("stats-bg", "Statistiky – plocha", [512, 1118, 508, 74], "@secondary/75", { radius: 14, showIf: "mvp_name" }),
        text("s1", "Stat 1", [530, 1118, 156, 74], "{{s1_value}} [{{s1_label}}]", { font: "Saira Condensed", weight: 800, size: 48, align: "center", highlight: "@primary", showIf: "s1_value" }),
        text("s2", "Stat 2", [688, 1118, 156, 74], "{{s2_value}} [{{s2_label}}]", { font: "Saira Condensed", weight: 800, size: 48, align: "center", highlight: "@primary", showIf: "s2_value" }),
        text("s3", "Stat 3", [846, 1118, 156, 74], "{{s3_value}} [{{s3_label}}]", { font: "Saira Condensed", weight: 800, size: 48, align: "center", highlight: "@primary", showIf: "s3_value" }),
        img("partner", "Logo BCL", [368, 1222, 190, 96], "brand:partner", { fit: "contain", align: "right", fallback: "none", anchorY: "bottom" }),
        rect("sep", "Dělicí čára", [578, 1226, 2, 88], "#FFFFFF", { anchorY: "bottom" }),
        brandLogo([600, 1224, 120, 92], { align: "left", anchorY: "bottom" }),
      ],
    },
    // 22b ── HRÁČ ZÁPASU – BCL (stejný jazyk jako Program BCL: vír, kovový nadpis, čísla v závorkách)
    {
      id: "bcl-mvp",
      name: "Hráč zápasu – Liga mistrů",
      category: "Hráči",
      description: "Hráč zápasu v prémiovém stylu BCL (podle EuroLeague Rivalry): světelný vír, vyříznutý hráč uprostřed, kovové příjmení, tři čísla v rohových závorkách a výsledek s logy dole. Nevyříznutá fotka se roztáhne přes celé pozadí.",
      background: { type: "radial", stops: [[0, "@secondary"], [0.6, "@dark"], [1, "@dark"]] },
      finish: { grain: 14, vignette: 38 },
      fields: [
        { key: "title", label: "Nadpis", type: "text", placeholder: "Hráč zápasu" },
        { key: "subtitle", label: "Pruh pod nadpisem", type: "text", placeholder: "Liga mistrů FIBA · 2. kolo" },
        { key: "first_name", label: "Jméno", type: "text" },
        { key: "last_name", label: "Příjmení", type: "text" },
        { key: "team", label: "Tým hráče", type: "team" },
        { key: "opponent", label: "Soupeř", type: "team" },
        { key: "team_score", label: "Skóre týmu hráče", type: "number" },
        { key: "opponent_score", label: "Skóre soupeře", type: "number" },
        { key: "s1_value", label: "Stat 1 – číslo", type: "text" },
        { key: "s1_label", label: "Stat 1 – popisek", type: "text" },
        { key: "s2_value", label: "Stat 2 – číslo", type: "text" },
        { key: "s2_label", label: "Stat 2 – popisek", type: "text" },
        { key: "s3_value", label: "Stat 3 – číslo", type: "text" },
        { key: "s3_label", label: "Stat 3 – popisek", type: "text" },
        { key: "photo", label: "Fotka hráče (nejlépe vyříznutá)", type: "image" },
        f.credit,
        { key: "team_logo", label: "Logo týmu (vlastní)", type: "image" },
        { key: "opponent_logo", label: "Logo soupeře (vlastní)", type: "image" },
      ],
      sampleData: {
        title: "Hráč zápasu",
        subtitle: "Liga mistrů FIBA · 2. kolo",
        first_name: "Martin",
        last_name: "Peterka",
        team: "BK Kvis Pardubice",
        opponent: "Slavia Praha",
        team_score: 84,
        opponent_score: 79,
        s1_value: "24",
        s1_label: "Body",
        s2_value: "9",
        s2_label: "Doskoky",
        s3_value: "27",
        s3_label: "Efektivita",
        photo: { asset: a.player },
        photo_credit: "",
      },
      elements: (() => {
        const corner = (id: string, b: Box, d: string, o: Common = {}): TemplateElement => path(id, "Rohová závorka", b, d, { stroke: "#FFFFFF", strokeWidth: 2.5, opacity: 0.9, anchorY: "bottom", ...o });
        const stats = [3, 2].flatMap((n): TemplateElement[] =>
          Array.from({ length: n }, (_, i): TemplateElement[] => {
            const w = n === 3 ? 268 : 330;
            const x = 540 - (w * n) / 2 + i * w;
            const cond = { showIf: `s${n}_value`, ...(n < 3 ? { hideIf: "s3_value" } : {}), anchorY: "bottom" as const };
            const sfx = n < 3 ? "-2" : "";
            const nm = (t: string) => `${t}${n < 3 ? " (2 staty)" : ""}`;
            const out: TemplateElement[] = [
              text(`v${i + 1}${sfx}`, nm(`Stat ${i + 1}`), [x, 1060, w, 100], `{{s${i + 1}_value}}`, { font: "Saira Condensed", weight: 800, size: 104, minSize: 50, align: "center", valign: "bottom", fill: METAL, shadow: { color: "rgba(0,0,0,0.45)", blur: 18, x: 0, y: 6 }, ...cond }),
              text(`l${i + 1}${sfx}`, nm(`Stat ${i + 1} popisek`), [x + 10, 1164, w - 20, 34], `{{s${i + 1}_label}}`, { font: "Saira Condensed", weight: 700, size: 25, minSize: 16, uppercase: true, align: "center", letterSpacing: 0.2, color: "@primary", ...cond }),
            ];
            if (i > 0) out.push(rect(`d${i + 1}${sfx}`, nm(`Oddělovač ${i}`), [x - 0.75, 1090, 1.5, 96], lin(90, [0, "rgba(255,255,255,0)"], [0.5, "rgba(255,255,255,0.45)"], [1, "rgba(255,255,255,0)"]), cond));
            return out;
          }).flat(),
        );
        return [
          // nevyříznutá fotka: přes celé pozadí, vír a ztmavení přes ni
          img("photo-full", "Fotka (nevyříznutá)", [0, 250, 1080, 1100], "{{photo}}", { fit: "cover", onlyUncut: true, fade: { angle: 90, from: 0, to: 0.22 }, zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "none" }),
          rect("photo-full-dim", "Ztmavení fotky", [0, 0, 1080, 1350], lin(90, [0, "@dark/0"], [0.45, "@dark/10"], [0.7, "@dark/80"], [1, "@dark"]), { showIf: "photo", hideIf: "photo.cut", zone: "bg", anchorX: "stretch", anchorY: "stretch" }),
          ...bclVortexBg(),
          ...bclHeader("{{title}}", "{{subtitle}}", 74),
          // vyříznutý hráč uprostřed
          rect("player-glow", "Záře za hráčem", [90, 240, 900, 900], { type: "radial", stops: [[0, "@primary/38"], [0.4, "@primary/10"], [0.69, "@primary/0"], [1, "@primary/0"]] }, { blend: "screen", showIf: "photo.cut", anchorY: "bottom" }),
          img("player", "Hráč (vyříznutý)", [70, 262, 940, 840], "{{photo}}", { fit: "contain", valign: "top", useCutout: true, fade: { angle: 270, from: 0.04, to: 0.36 }, shadow: { color: "rgba(0,0,0,0.5)", blur: 44, x: 0, y: 12 }, fallback: "none", anchorY: "bottom" }),
          rect("name-dim", "Ztmavení pod jménem", [0, 820, 1080, 530], lin(90, [0, "@dark/0"], [0.3, "@dark/72"], [0.75, "@dark/70"], [1, "@dark/40"]), { anchorX: "stretch", anchorY: "bottom" }),
          text("first", "Jméno", [140, 880, 800, 50], "{{first_name}}", { font: "Saira Condensed", weight: 500, size: 44, minSize: 26, uppercase: true, align: "center", letterSpacing: 0.3, opacity: 0.9, anchorY: "bottom" }),
          text("last", "Příjmení", [80, 926, 920, 112], "{{last_name}}", { font: "Russo One", weight: 400, size: 112, minSize: 54, uppercase: true, align: "center", letterSpacing: 0.01, fill: METAL, shadow: { color: "rgba(0,0,0,0.55)", blur: 28, x: 0, y: 8 }, anchorY: "bottom" }),
          corner("c-tl", [96, 1056, 28, 28], "M0 100 L0 0 L100 0"),
          corner("c-tr", [956, 1056, 28, 28], "M0 0 L100 0 L100 100"),
          corner("c-bl", [96, 1182, 28, 28], "M0 0 L0 100 L100 100"),
          corner("c-br", [956, 1182, 28, 28], "M100 0 L100 100 L0 100"),
          ...stats,
          // výsledek s logy (skupina na střed)
          logo("team-logo", "Logo týmu", [338, 1238, 96, 76], "team", { override: "{{team_logo}}", logoVariant: "white", equalize: 0.75, anchorY: "bottom" }),
          text("score", "Výsledek", [440, 1238, 200, 76], "{{team_score}} : {{opponent_score}}", { font: "Saira Condensed", weight: 700, size: 50, align: "center", showIf: "team_score", anchorY: "bottom" }),
          text("vs", "vs (bez skóre)", [440, 1238, 200, 76], "vs", { font: "Saira Condensed", weight: 700, size: 34, align: "center", color: "@primary", hideIf: "team_score", anchorY: "bottom" }),
          logo("opp-logo", "Logo soupeře", [646, 1238, 96, 76], "opponent", { override: "{{opponent_logo}}", logoVariant: "white", equalize: 0.75, anchorY: "bottom" }),
          text("credit", "Foto credit", [40, 1306, 400, 26], "Foto: {{photo_credit}}", { font: "body", italic: true, weight: 600, size: 18, opacity: 0.55, showIf: "photo_credit", anchorX: "left", anchorY: "bottom" }),
          brandLogo([880, 1290, 160, 40], { align: "right", anchorX: "right", anchorY: "bottom" }),
        ];
      })(),
    },
    // 23 ── PROGRAM KOLA – PREMIUM (klidné tmavé karty, velký čas, hráči nasvícení, zrno a viněta)
    {
      id: "program-premium",
      name: "Program kola – Premium",
      category: "Soutěž",
      description: "Prémiový program: velký nadpis, jednolité tmavé karty s velkým časem, hráči po stranách, rohové závorky, zrno a viněta.",
      background: "@dark",
      finish: { grain: 18, vignette: 45 },
      fields: [
        { key: "kicker", label: "Nadtitulek", type: "text", placeholder: "Maxa NBL" },
        { key: "title", label: "Nadpis", type: "text" },
        { key: "dates", label: "Termín", type: "text", placeholder: "3.–4. 10." },
        f.round,
        {
          key: "games",
          label: "Zápasy",
          type: "list",
          columns: [
            { key: "home", label: "Domácí", type: "team" },
            { key: "away", label: "Hosté", type: "team" },
            { key: "date", label: "Datum", type: "date" },
            { key: "time", label: "Čas", type: "text" },
            { key: "tv", label: "TV", type: "channel" },
          ],
        },
        { key: "photo_left", label: "Hráč vlevo (vyříznutý)", type: "image" },
        { key: "photo_right", label: "Hráč vpravo (vyříznutý)", type: "image" },
      ],
      sampleData: {
        kicker: "Maxa NBL",
        title: "Program",
        dates: "3.–4. 10.",
        round: "5. kolo",
        games: PROGRAM_3_KOLO.map((g, i) => ({ home: g.home, away: g.away, date: i < 4 ? "2026-10-03" : "2026-10-04", time: ["17:30", "17:30", "18:00", "18:00", "17:00", "18:00"][i], tv: i === 5 ? "Prima Sport" : "" })),
        photo_left: { asset: a.player },
        photo_right: { asset: a.player },
      },
      elements: [
        img("bg", "Pozadí (brand kit)", [0, 0, 1080, 1350], "brand:bg0", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch", fallback: "none" }),
        rect("bg-dim", "Ztmavení pozadí", [0, 0, 1080, 1350], "@dark/50", { zone: "bg", anchorX: "stretch", anchorY: "stretch" }),
        rect("glow", "Záře za nadpisem", [240, -120, 600, 600], { type: "radial", stops: [[0, "@primary/60"], [0.55, "@primary/12"], [1, "@primary/0"]] }, { anchorY: "top" }),
        img("pl", "Hráč vlevo", [-260, 170, 780, 1180], "{{photo_left}}", { fit: "contain", align: "left", valign: "bottom", anchorX: "left", anchorY: "bottom", showIf: "photo_left", hideIn: ["x"] }),
        img("pr", "Hráč vpravo", [560, 170, 780, 1180], "{{photo_right}}", { fit: "contain", align: "right", valign: "bottom", anchorX: "right", anchorY: "bottom", showIf: "photo_right", hideIn: ["x"] }),
        rect("side-dim", "Ztmavení okrajů", [0, 0, 1080, 1350], lin(0, [0, "@dark/60"], [0.24, "@dark/0"], [0.76, "@dark/0"], [1, "@dark/60"]), { anchorX: "stretch", anchorY: "stretch", hideIn: ["x"] }),
        rect("col-dim", "Ztmavení za kartami", [190, 360, 700, 800], lin(0, [0, "@dark/0"], [0.18, "@dark/65"], [0.82, "@dark/65"], [1, "@dark/0"]), { hideIn: ["x"] }),
        rect("bottom-dim", "Ztmavení dole", [0, 860, 1080, 490], lin(90, [0, "@dark/0"], [0.6, "@dark/85"], [1, "@dark"]), { anchorX: "stretch", anchorY: "bottom" }),
        path("c-tl", "Roh vlevo nahoře", [40, 40, 56, 56], "M0 100 L0 0 L100 0", { stroke: "#FFFFFF", strokeWidth: 2.5, opacity: 0.5, anchorX: "left", anchorY: "top" }),
        path("c-tr", "Roh vpravo nahoře", [984, 40, 56, 56], "M0 0 L100 0 L100 100", { stroke: "#FFFFFF", strokeWidth: 2.5, opacity: 0.5, anchorX: "right", anchorY: "top" }),
        path("c-bl", "Roh vlevo dole", [40, 1254, 56, 56], "M0 0 L0 100 L100 100", { stroke: "#FFFFFF", strokeWidth: 2.5, opacity: 0.5, anchorX: "left", anchorY: "bottom" }),
        path("c-br", "Roh vpravo dole", [984, 1254, 56, 56], "M100 0 L100 100 L0 100", { stroke: "#FFFFFF", strokeWidth: 2.5, opacity: 0.5, anchorX: "right", anchorY: "bottom" }),
        rect("k-line-l", "Linka vlevo", [318, 92, 86, 1.5], "rgba(255,255,255,0.45)"),
        rect("k-line-r", "Linka vpravo", [676, 92, 86, 1.5], "rgba(255,255,255,0.45)"),
        text("kicker", "Nadtitulek", [414, 74, 252, 38], "{{kicker}}", { font: "body", weight: 600, size: 24, uppercase: true, align: "center", letterSpacing: 0.34, opacity: 0.9 }),
        text("title", "Nadpis", [80, 112, 920, 176], "{{title}}", { font: "Mazzard H", weight: 900, size: 184, uppercase: true, align: "center", letterSpacing: -0.02, fill: lin(90, [0, "#FFFFFF"], [0.55, "#F1EEF6"], [1, "#B9B2C6"]), shadow: { color: "rgba(0,0,0,0.55)", blur: 34, x: 0, y: 12 } }),
        path("i-tl", "Rámeček – roh 1", [318, 296, 22, 22], "M0 100 L0 0 L100 0", { stroke: "#FFFFFF", strokeWidth: 2, opacity: 0.7 }),
        path("i-tr", "Rámeček – roh 2", [740, 296, 22, 22], "M0 0 L100 0 L100 100", { stroke: "#FFFFFF", strokeWidth: 2, opacity: 0.7 }),
        path("i-bl", "Rámeček – roh 3", [318, 346, 22, 22], "M0 0 L0 100 L100 100", { stroke: "#FFFFFF", strokeWidth: 2, opacity: 0.7 }),
        path("i-br", "Rámeček – roh 4", [740, 346, 22, 22], "M100 0 L100 100 L0 100", { stroke: "#FFFFFF", strokeWidth: 2, opacity: 0.7 }),
        text("info", "Kolo a termín", [340, 298, 400, 68], "[{{round}}] | {{dates}}", { font: "Saira Condensed", weight: 700, size: 40, uppercase: true, align: "center", letterSpacing: 0.06, wordSpacing: 0.18, highlight: "@accent", highlightWeight: 800 }),
        list("games", "Zápasy", [225, 384, 630, 760], "games", 108, 14, [
          rect("card", "Karta", [0, 0, 630, 108], lin(90, [0, "#1B1429"], [1, "#09060F"]), { radius: 16, stroke: "rgba(255,255,255,0.12)", strokeWidth: 1.5, shadow: { color: "rgba(0,0,0,0.6)", blur: 34, x: 0, y: 12 } }),
          rect("hg", "Barva domácích", [0, 0, 280, 108], lin(0, [0, "@team:{{home}}/75"], [1, "@team:{{home}}/0"]), { radius: 16 }),
          rect("ag", "Barva hostů", [350, 0, 280, 108], lin(0, [0, "@team:{{away}}/0"], [1, "@team:{{away}}/75"]), { radius: 16 }),
          rect("hl", "Horní odlesk", [18, 1, 594, 1.5], "rgba(255,255,255,0.25)"),
          path("slab", "Střed", [198, 0, 234, 108], "M7 0 L100 0 L93 100 L0 100 Z", { fill: "rgba(5,3,10,0.94)" }),
          rect("slab-line", "Linka pod časem", [232, 102, 166, 3], "@accent"),
          logo("hl-logo", "Logo D", [22, 12, 150, 84], "home", { logoVariant: "white", equalize: 0.64 }),
          text("day", "Den", [198, 14, 234, 24], "{{date|day}}", { font: "body", weight: 600, size: 21, align: "center", letterSpacing: 0.3, opacity: 0.75 }),
          text("time", "Čas", [198, 36, 234, 54], "{{time}}", { font: "Mazzard H", weight: 900, size: 52, align: "center", hideIf: "tv" }),
          text("time-tv", "Čas (s TV)", [198, 34, 234, 46], "{{time}}", { font: "Mazzard H", weight: 900, size: 46, align: "center", showIf: "tv" }),
          img("tv", "Logo TV", [240, 78, 150, 22], "channel:{{tv}}", { fit: "contain", showIf: "tv", fallback: "none" }),
          logo("al-logo", "Logo H", [458, 12, 150, 84], "away", { logoVariant: "white", equalize: 0.64 }),
        ], { distribute: false, center: true }),
        rect("foot-line", "Linka dole", [340, 1170, 400, 1.5], "rgba(255,255,255,0.2)", { anchorY: "bottom" }),
        img("foot-logos", "Loga dole (liga | oBasketu)", [240, 1196, 600, 76], "brand:partner", { row: { srcs: ["brand:partner", "brand:logo"], gap: 30, sep: { color: "rgba(255,255,255,0.5)", width: 1.5, height: 0.95 }, maxW: 0.42 }, fallback: "none", anchorY: "bottom" }),
      ],
    },
    // 25 ── VÝSLEDEK ZÁPASU – PREMIUM (NBL, ŽBL)
    {
      id: "result-premium",
      name: "Výsledek zápasu – Premium",
      category: "Zápas",
      description: "Fotka přes celou plochu, záře v barvách týmů, velké kovové skóre (poražený ztlumený), pruh s hráčem zápasu a třemi čísly. Loga lze nahrát ručně.",
      background: "@dark",
      finish: { grain: 12, vignette: 35 },
      fields: [
        { key: "kicker", label: "Soutěž", type: "text", placeholder: "Maxa NBL" },
        f.round,
        { key: "status", label: "Štítek nad skóre", type: "text", placeholder: "Konec / Po prodloužení" },
        { key: "team_names", label: "Názvy týmů pod logy", type: "select", options: ["Zobrazit", "Skrýt"] },
        f.home,
        f.away,
        f.hs,
        f.as,
        { key: "home_record", label: "Bilance domácích", type: "text", placeholder: "3-1" },
        { key: "away_record", label: "Bilance hostů", type: "text", placeholder: "1-3" },
        { key: "home_logo", label: "Logo domácích (vlastní)", type: "image" },
        { key: "away_logo", label: "Logo hostů (vlastní)", type: "image" },
        { key: "detail", label: "Čtvrtiny (nepovinné)", type: "text", placeholder: "21:18 · 19:20 · 24:15 · 20:22" },
        { key: "mvp_name", label: "Hráč zápasu", type: "text" },
        { key: "s1_value", label: "Stat 1 – číslo", type: "text" },
        { key: "s1_label", label: "Stat 1 – popisek", type: "text" },
        { key: "s2_value", label: "Stat 2 – číslo", type: "text" },
        { key: "s2_label", label: "Stat 2 – popisek", type: "text" },
        { key: "s3_value", label: "Stat 3 – číslo", type: "text" },
        { key: "s3_label", label: "Stat 3 – popisek", type: "text" },
        f.photo,
        f.credit,
      ],
      sampleData: {
        kicker: "Maxa NBL",
        round: "6. kolo",
        status: "Konec",
        home_team: "BK Kvis Pardubice",
        home_record: "5-1",
        away_team: "Slavia Praha",
        away_record: "4-2",
        home_score: 88,
        away_score: 81,
        detail: "21:18 · 19:20 · 26:21 · 22:22",
        mvp_name: "Martin Peterka",
        s1_value: "24",
        s1_label: "PTS",
        s2_value: "9",
        s2_label: "REB",
        s3_value: "27",
        s3_label: "EFF",
        photo: PHOTO(a.arena),
        photo_credit: "",
      },
      elements: [
        img("photo", "Fotka", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "placeholder" }),
        rect("shade", "Přechod dole", [0, 0, 1080, 1350], lin(90, [0, "@dark/30"], [0.12, "@dark/0"], [0.4, "@dark/0"], [0.58, "@dark/75"], [0.72, "@dark"], [1, "@dark"]), { zone: "bg", anchorX: "stretch", anchorY: "stretch" }),
        rect("glow-h", "Záře domácích", [-260, 700, 760, 760], { type: "radial", stops: [[0, "@team:{{home_team}}/55"], [0.32, "@team:{{home_team}}/16"], [0.69, "@team:{{home_team}}/0"], [1, "@team:{{home_team}}/0"]] }, { anchorY: "bottom" }),
        rect("glow-a", "Záře hostů", [580, 700, 760, 760], { type: "radial", stops: [[0, "@team:{{away_team}}/55"], [0.32, "@team:{{away_team}}/16"], [0.69, "@team:{{away_team}}/0"], [1, "@team:{{away_team}}/0"]] }, { anchorX: "right", anchorY: "bottom" }),
        path("c-tl", "Roh vlevo nahoře", [40, 40, 52, 52], "M0 100 L0 0 L100 0", { stroke: "#FFFFFF", strokeWidth: 2.5, opacity: 0.6, anchorX: "left", anchorY: "top" }),
        path("c-tr", "Roh vpravo nahoře", [988, 40, 52, 52], "M0 0 L100 0 L100 100", { stroke: "#FFFFFF", strokeWidth: 2.5, opacity: 0.6, anchorX: "right", anchorY: "top" }),
        text("top", "Soutěž a kolo", [112, 50, 600, 34], "{{kicker}}  ·  {{round}}", { font: "body", weight: 600, size: 22, uppercase: true, letterSpacing: 0.32, anchorX: "left", anchorY: "top", shadow: { color: "rgba(0,0,0,0.6)", blur: 10, x: 0, y: 2 } }),
        text("credit", "Foto credit", [560, 50, 410, 34], "Foto: {{photo_credit}}", { font: "body", italic: true, weight: 600, size: 22, align: "right", showIf: "photo_credit", anchorX: "right", anchorY: "top", shadow: { color: "rgba(0,0,0,0.6)", blur: 10, x: 0, y: 2 } }),
        text("status", "Štítek", [340, 842, 400, 36], "{{status}}", { font: "body", weight: 800, size: 20, uppercase: true, align: "center", valign: "middle", letterSpacing: 0.3, pill: { fill: "@accent", padX: 16, padY: 6, radius: 4 }, showIf: "status", shadow: { color: "rgba(0,0,0,0.35)", blur: 12, x: 0, y: 4 }, anchorY: "bottom" }),
        logo("home-logo", "Logo domácí", [60, 850, 230, 170], "home_team", { override: "{{home_logo}}", logoVariant: "white", equalize: 0.6, anchorY: "bottom", dim: { when: "home_score < away_score", opacity: 0.55 } }),
        text("home-name", "Název domácí", [40, 1028, 270, 30], "{{home_team|upper}}", { font: "body", weight: 700, size: 20, align: "center", letterSpacing: 0.12, opacity: 0.85, hideIf: "team_names == Skrýt", anchorY: "bottom" }),
        text("home-rec", "Bilance domácí", [125, 1060, 100, 28], "{{home_record}}", { font: "body", weight: 600, size: 20, align: "center", letterSpacing: 0.1, opacity: 0.55, showIf: "home_record", hideIf: "team_names == Skrýt", anchorY: "bottom" }),
        text("home-rec-up", "Bilance domácí (bez názvu)", [125, 1030, 100, 28], "{{home_record}}", { font: "body", weight: 600, size: 22, align: "center", letterSpacing: 0.1, opacity: 0.7, showIf: "home_record && team_names == Skrýt", anchorY: "bottom" }),
        text("hs", "Skóre D", [300, 846, 222, 200], "{{home_score}}", { fitWith: "{{away_score}}", font: "Mazzard H", weight: 900, size: 200, align: "right", letterSpacing: -0.03, fill: lin(90, [0, "#FFFFFF"], [0.6, "#F2EFF6"], [1, "#BDB6CB"]), shadow: { color: "rgba(0,0,0,0.5)", blur: 30, x: 0, y: 10 }, dim: { when: "home_score < away_score", opacity: 0.35 }, anchorY: "bottom" }),
        rect("div", "Dělicí čára", [538.5, 880, 3, 140], "@accent", { anchorY: "bottom" }),
        text("as", "Skóre H", [558, 846, 222, 200], "{{away_score}}", { fitWith: "{{home_score}}", font: "Mazzard H", weight: 900, size: 200, align: "left", letterSpacing: -0.03, fill: lin(90, [0, "#FFFFFF"], [0.6, "#F2EFF6"], [1, "#BDB6CB"]), shadow: { color: "rgba(0,0,0,0.5)", blur: 30, x: 0, y: 10 }, dim: { when: "away_score < home_score", opacity: 0.35 }, anchorY: "bottom" }),
        logo("away-logo", "Logo hosté", [790, 850, 230, 170], "away_team", { override: "{{away_logo}}", logoVariant: "white", equalize: 0.6, anchorY: "bottom", dim: { when: "away_score < home_score", opacity: 0.55 } }),
        text("away-name", "Název hosté", [770, 1028, 270, 30], "{{away_team|upper}}", { font: "body", weight: 700, size: 20, align: "center", letterSpacing: 0.12, opacity: 0.85, hideIf: "team_names == Skrýt", anchorY: "bottom" }),
        text("away-rec", "Bilance hosté", [855, 1060, 100, 28], "{{away_record}}", { font: "body", weight: 600, size: 20, align: "center", letterSpacing: 0.1, opacity: 0.55, showIf: "away_record", hideIf: "team_names == Skrýt", anchorY: "bottom" }),
        text("away-rec-up", "Bilance hosté (bez názvu)", [855, 1030, 100, 28], "{{away_record}}", { font: "body", weight: 600, size: 22, align: "center", letterSpacing: 0.1, opacity: 0.7, showIf: "away_record && team_names == Skrýt", anchorY: "bottom" }),
        text("detail", "Čtvrtiny", [330, 1050, 420, 30], "{{detail}}", { font: "body", weight: 600, size: 21, align: "center", letterSpacing: 0.12, opacity: 0.6, showIf: "detail", anchorY: "bottom" }),
        rect("mvp-bg", "Hráč zápasu – sklo", [80, 1106, 920, 100], lin(0, [0, "rgba(255,255,255,0.10)"], [1, "rgba(255,255,255,0.04)"]), { radius: 50, stroke: "rgba(255,255,255,0.16)", strokeWidth: 1.5, showIf: "mvp_name", anchorY: "bottom" }),
        text("mvp", "Hráč zápasu", [140, 1128, 420, 56], "{{mvp_name}}", { font: "Mazzard H", weight: 900, size: 40, uppercase: true, showIf: "mvp_name", anchorY: "bottom" }),
        rect("mvp-div", "Hráč zápasu – čára", [578, 1126, 1.5, 60], "rgba(255,255,255,0.2)", { showIf: "s1_value", anchorY: "bottom" }),
        // statistiky: rozložení podle počtu vyplněných (3 / 2 / 1) – vždy rovnoměrně přes celý pravý díl pruhu
        ...[3, 2, 1].flatMap((n): TemplateElement[] =>
          Array.from({ length: n }, (_, i): TemplateElement[] => {
            const w = 396 / n;
            const x = 596 + i * w + 4;
            const sfx = n === 3 ? "" : `-${n}`;
            const cond = { showIf: `s${n}_value`, ...(n < 3 ? { hideIf: `s${n + 1}_value` } : {}) };
            return [
              text(`s${i + 1}${sfx}`, `Stat ${i + 1}${n < 3 ? ` (${n} staty)` : ""}`, [x, 1114, w - 8, 54], `{{s${i + 1}_value}}`, { font: "Mazzard H", weight: 900, size: 46, align: "center", ...cond, anchorY: "bottom" }),
              text(`s${i + 1}l${sfx}`, `Stat ${i + 1} popisek${n < 3 ? ` (${n} staty)` : ""}`, [x, 1166, w - 8, 26], `{{s${i + 1}_label}}`, { font: "body", weight: 700, size: 18, uppercase: true, align: "center", color: "@accent", letterSpacing: 0.25, ...cond, anchorY: "bottom" }),
            ];
          }).flat(),
        ),
        img("foot-logos", "Loga dole (liga | oBasketu)", [240, 1232, 600, 74], "brand:partner", { row: { srcs: ["brand:partner", "brand:logo"], gap: 30, sep: { color: "rgba(255,255,255,0.5)", width: 1.5, height: 0.95 }, maxW: 0.42 }, fallback: "none", anchorY: "bottom" }),
      ],
    },
    // 26 ── ŠLÁGR KOLA – PREMIUM (split v barvách týmů, světelné efekty, dvě hlavy, velké zkratky)
    {
      id: "derby-premium",
      name: "Šlágr kola – Premium",
      category: "Zápas",
      description: "Plakát ve stylu Euroligy/NBA: plocha rozdělená v barvách týmů se zářící spárou a odleskem, světelné pruhy, velká loga v pozadí, dva hráči, velké kovové zkratky týmů, čas v rámečku, loga a TV. Nevyříznuté fotky se rozdělí na půlky, vyříznutí hráči stojí na barevném pozadí.",
      background: "@dark",
      finish: { grain: 12, vignette: 40 },
      fields: [
        { key: "kicker", label: "Soutěž", type: "text", placeholder: "Maxa NBL" },
        f.round,
        f.home,
        f.away,
        { key: "home_record", label: "Bilance domácích", type: "text", placeholder: "5-1" },
        { key: "away_record", label: "Bilance hostů", type: "text", placeholder: "4-2" },
        f.date,
        f.time,
        { key: "tv", label: "Kde sledovat (TV)", type: "channel" },
        { key: "tv_label", label: "Text u TV", type: "text", placeholder: "Živě na" },
        { key: "name_left", label: "Jméno hráče vlevo (svisle)", type: "text", placeholder: "Peterka" },
        { key: "name_right", label: "Jméno hráče vpravo (svisle)", type: "text", placeholder: "Kříž" },
        { key: "photo_left", label: "Hráč domácích (vlevo)", type: "image", help: "Vyříznutý (Pozadí) stojí na barvě týmu, nevyříznutá fotka vyplní levou půlku." },
        { key: "photo_right", label: "Hráč hostů (vpravo)", type: "image", help: "Vyříznutý (Pozadí) stojí na barvě týmu, nevyříznutá fotka vyplní pravou půlku." },
        { key: "home_logo", label: "Logo domácích (vlastní)", type: "image" },
        { key: "away_logo", label: "Logo hostů (vlastní)", type: "image" },
      ],
      sampleData: {
        kicker: "Maxa NBL",
        round: "6. kolo",
        home_team: "BK Kvis Pardubice",
        away_team: "Slavia Praha",
        home_record: "5-1",
        away_record: "4-2",
        date: "2026-10-10",
        time: "18:00",
        tv: "",
        tv_label: "Živě na",
        name_left: "",
        name_right: "",
        photo_left: { asset: a.player, cut: a.player },
        photo_right: { asset: a.player, cut: a.player },
      },
      elements: (() => {
        const H = "@team:{{home_team}}";
        const A = "@team:{{away_team}}";
        // deterministické „náhodné“ světelné pruhy
        let seed = 7;
        const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        const streaks = (side: "h" | "a", c: string): TemplateElement[] =>
          Array.from({ length: 16 }, (_, i) => {
            const x = side === "h" ? 30 + rnd() * 470 : 580 + rnd() * 470;
            const h = 380 + rnd() * 560;
            const y = -40 + rnd() * 380;
            const w = 2 + Math.round(rnd() * 4);
            const col = rnd() < 0.3 ? "#FFFFFF" : c;
            const op = 0.25 + rnd() * 0.5;
            return rect(`st-${side}${i}`, `Světelný pruh ${side === "h" ? "vlevo" : "vpravo"} ${i + 1}`, [Math.round(x), Math.round(y), w, Math.round(h)], col === "#FFFFFF" ? lin(90, [0, "rgba(255,255,255,0)"], [0.5, "rgba(255,255,255,0.9)"], [1, "rgba(255,255,255,0)"]) : lin(90, [0, `${col}/0`], [0.5, `${col}/90`], [1, `${col}/0`]), { opacity: +op.toFixed(2), blend: "screen", radius: 2 });
          });
        const metal = lin(90, [0, "#FFFFFF"], [0.55, "#ECE9F2"], [1, "#A9A2B8"]);
        const corner = (id: string, x: number, y: number, d: string): TemplateElement => path(id, "Rámeček času", [x, y, 26, 26], d, { stroke: "#FFFFFF", strokeWidth: 2.5, opacity: 0.85, anchorY: "bottom" });
        return [
          // pozadí: dvě půlky v barvách týmů + textura z brand kitu
          path("half-h", "Půlka domácích", [0, 0, 1080, 1350], "M0 0 L51 0 L49 100 L0 100 Z", { fill: lin(90, [0, `${H}/95`], [0.5, `${H}/60`], [1, `${H}/10`]), anchorX: "stretch", anchorY: "stretch" }),
          path("half-a", "Půlka hostů", [0, 0, 1080, 1350], "M51 0 L100 0 L100 100 L49 100 Z", { fill: lin(90, [0, `${A}/95`], [0.5, `${A}/60`], [1, `${A}/10`]), anchorX: "stretch", anchorY: "stretch" }),
          img("tex", "Textura (brand kit)", [0, 0, 1080, 1350], "brand:bg0", { fit: "cover", blend: "soft-light", opacity: 0.6, fallback: "none", anchorX: "stretch", anchorY: "stretch" }),
          rect("depth", "Hloubka", [0, 0, 1080, 1350], { type: "radial", stops: [[0, "rgba(0,0,0,0)"], [0.5, "rgba(0,0,0,0.15)"], [1, "rgba(0,0,0,0.55)"]] }, { anchorX: "stretch", anchorY: "stretch" }),
          logo("wm-h", "Velké logo domácích v pozadí", [-300, 140, 860, 860], "home_team", { override: "{{home_logo}}", logoVariant: "white", opacity: 0.09, rotation: -12, blend: "screen" }),
          logo("wm-a", "Velké logo hostů v pozadí", [520, 140, 860, 860], "away_team", { override: "{{away_logo}}", logoVariant: "white", opacity: 0.09, rotation: 12, blend: "screen", anchorX: "right" }),
          ...streaks("h", H),
          ...streaks("a", A),
          // nevyříznuté fotky – každá vyplní svou půlku
          img("pl-full", "Fotka vlevo (nevyříznutá)", [0, 0, 540, 1350], "{{photo_left}}", { fit: "cover", valign: "top", onlyUncut: true, feather: 0.14, showIf: "photo_left", fallback: "none", anchorY: "stretch" }),
          img("pr-full", "Fotka vpravo (nevyříznutá)", [540, 0, 540, 1350], "{{photo_right}}", { fit: "cover", valign: "top", onlyUncut: true, feather: 0.14, showIf: "photo_right", fallback: "none", anchorX: "right", anchorY: "stretch" }),
          // spára se září
          path("seam-glow", "Spára – záře", [0, 0, 1080, 1350], "M51 0 L49 100", { stroke: "@accent", strokeWidth: 14, opacity: 0.55, blend: "screen", shadow: { color: "@accent", blur: 50, x: 0, y: 0 }, anchorX: "stretch", anchorY: "stretch" }),
          path("seam", "Spára", [0, 0, 1080, 1350], "M51 0 L49 100", { stroke: "#FFFFFF", strokeWidth: 3, shadow: { color: "#FFFFFF", blur: 18, x: 0, y: 0 }, anchorX: "stretch", anchorY: "stretch" }),
          // vyříznutí hráči s barevným obrysovým světlem
          img("pl", "Hráč vlevo (vyříznutý)", [-90, 110, 700, 960], "{{photo_left}}", { fit: "contain", valign: "bottom", useCutout: true, showIf: "photo_left", fallback: "none", anchorX: "left", shadow: { color: `${H}/90`, blur: 46, x: -6, y: 0 } }),
          img("pr", "Hráč vpravo (vyříznutý)", [470, 110, 700, 960], "{{photo_right}}", { fit: "contain", valign: "bottom", useCutout: true, showIf: "photo_right", fallback: "none", anchorX: "right", shadow: { color: `${A}/90`, blur: 46, x: 6, y: 0 } }),
          // odlesk nahoře na spáře
          rect("flare", "Odlesk", [411, -40, 300, 300], { type: "radial", stops: [[0, "rgba(255,255,255,0.95)"], [0.12, "rgba(255,255,255,0.55)"], [0.35, "@accent/30"], [0.69, "@accent/0"], [1, "@accent/0"]] }, { blend: "screen", anchorY: "top" }),
          rect("flare-h", "Odlesk – vodorovný paprsek", [171, 108, 780, 4], lin(0, [0, "rgba(255,255,255,0)"], [0.5, "rgba(255,255,255,0.95)"], [1, "rgba(255,255,255,0)"]), { blend: "screen", shadow: { color: "#FFFFFF", blur: 14, x: 0, y: 0 }, anchorY: "top" }),
          rect("shade", "Přechod dole", [0, 0, 1080, 1350], lin(90, [0, "@dark/35"], [0.1, "@dark/0"], [0.5, "@dark/0"], [0.66, "@dark/80"], [0.78, "@dark/97"], [1, "@dark"]), { anchorX: "stretch", anchorY: "stretch" }),
          // hlavička
          img("league", "Logo ligy", [44, 40, 190, 70], "brand:partner", { fit: "contain", align: "left", fallback: "none", anchorX: "left", anchorY: "top", shadow: { color: "rgba(0,0,0,0.45)", blur: 14, x: 0, y: 3 } }),
          brandLogo([876, 40, 160, 70], { align: "right", anchorX: "right", anchorY: "top" }),
          text("kicker", "Soutěž a kolo", [300, 150, 480, 30], "{{@join:  ·  |kicker|round}}", { font: "body", weight: 700, size: 21, uppercase: true, align: "center", letterSpacing: 0.34, opacity: 0.9, shadow: { color: "rgba(0,0,0,0.6)", blur: 10, x: 0, y: 2 }, anchorY: "top" }),
          // svislá jména u okrajů
          text("name-l", "Jméno vlevo", [30, 260, 40, 520], "{{name_left}}", { font: "body", weight: 700, size: 26, uppercase: true, vertical: true, align: "center", letterSpacing: 0.42, opacity: 0.85, showIf: "name_left", anchorX: "left" }),
          text("name-r", "Jméno vpravo", [1010, 260, 40, 520], "{{name_right}}", { font: "body", weight: 700, size: 26, uppercase: true, vertical: true, align: "center", letterSpacing: 0.42, opacity: 0.85, showIf: "name_right", anchorX: "right" }),
          // velké zkratky
          text("code-h", "Zkratka domácích", [40, 836, 455, 230], "{{home_team|short}}", { fitWith: "{{away_team|short}}", font: "Saira Condensed", weight: 800, size: 250, uppercase: true, align: "right", letterSpacing: -0.01, fill: metal, shadow: { color: "rgba(0,0,0,0.55)", blur: 30, x: 0, y: 10 }, anchorY: "bottom" }),
          text("vs", "VS", [496, 930, 88, 70], "vs", { font: "Saira Condensed", weight: 800, italic: true, size: 62, align: "center", valign: "middle", color: "@accent", shadow: { color: "rgba(0,0,0,0.5)", blur: 14, x: 0, y: 4 }, anchorY: "bottom" }),
          text("code-a", "Zkratka hostů", [585, 836, 455, 230], "{{away_team|short}}", { fitWith: "{{home_team|short}}", font: "Saira Condensed", weight: 800, size: 250, uppercase: true, align: "left", letterSpacing: -0.01, fill: metal, shadow: { color: "rgba(0,0,0,0.55)", blur: 30, x: 0, y: 10 }, anchorY: "bottom" }),
          // loga a čas v rámečku
          logo("home-logo", "Logo domácí", [80, 1072, 200, 130], "home_team", { override: "{{home_logo}}", equalize: 0.6, shadow: { color: "rgba(0,0,0,0.5)", blur: 20, x: 0, y: 6 }, anchorY: "bottom" }),
          logo("away-logo", "Logo hosté", [800, 1072, 200, 130], "away_team", { override: "{{away_logo}}", equalize: 0.6, shadow: { color: "rgba(0,0,0,0.5)", blur: 20, x: 0, y: 6 }, anchorY: "bottom" }),
          text("home-rec", "Bilance domácí", [80, 1212, 200, 34], "{{home_record}}", { font: "Saira Condensed", weight: 700, size: 30, align: "center", letterSpacing: 0.1, opacity: 0.8, showIf: "home_record", anchorY: "bottom" }),
          text("away-rec", "Bilance hosté", [800, 1212, 200, 34], "{{away_record}}", { font: "Saira Condensed", weight: 700, size: 30, align: "center", letterSpacing: 0.1, opacity: 0.8, showIf: "away_record", anchorY: "bottom" }),
          corner("b-tl", 340, 1080, "M0 100 L0 0 L100 0"),
          corner("b-tr", 714, 1080, "M0 0 L100 0 L100 100"),
          corner("b-bl", 340, 1190, "M0 0 L0 100 L100 100"),
          corner("b-br", 714, 1190, "M100 0 L100 100 L0 100"),
          text("time", "Čas", [356, 1088, 368, 78], "{{time}}", { font: "Mazzard H", weight: 900, size: 74, align: "center", fill: metal, anchorY: "bottom" }),
          text("date", "Den a datum", [356, 1166, 368, 36], "{{date|day}}  {{date|date:long}}", { font: "Saira Condensed", weight: 600, size: 32, uppercase: true, align: "center", letterSpacing: 0.08, opacity: 0.85, anchorY: "bottom" }),
          // kde sledovat
          text("tv-label", "Text u TV", [240, 1250, 280, 50], "{{tv_label|default:Živě na}}", { font: "body", weight: 700, size: 22, uppercase: true, align: "right", valign: "middle", letterSpacing: 0.3, opacity: 0.7, showIf: "tv", anchorY: "bottom" }),
          img("tv-logo", "Logo TV", [540, 1250, 260, 50], "channel:{{tv}}", { fit: "contain", align: "left", showIf: "tv", fallback: "none", anchorY: "bottom" }),
        ];
      })(),
    },
    // 27 ── HRÁČ ZÁPASU – DETAIL (portrét zblízka, čísla pod sebou vpravo; podle Euroligy „Rivalry“, v barvách brand kitu)
    {
      id: "mvp-closeup",
      name: "Hráč zápasu – Detail",
      category: "Hráči",
      description: "Detailní fotka hráče vlevo, vpravo se plynule ztrácí do barvy brand kitu. Logo ligy, loga obou týmů, velká kovová čísla pod sebou, jméno a soupeř dole, světelné oblouky a rohové závorky.",
      background: "@dark",
      finish: { grain: 10, vignette: 30 },
      fields: [
        { key: "first_name", label: "Jméno", type: "text" },
        { key: "last_name", label: "Příjmení", type: "text" },
        { key: "team", label: "Tým hráče", type: "team" },
        { key: "opponent", label: "Soupeř", type: "team" },
        { key: "s1_value", label: "Stat 1 – číslo", type: "text" },
        { key: "s1_label", label: "Stat 1 – popisek", type: "text" },
        { key: "s2_value", label: "Stat 2 – číslo", type: "text" },
        { key: "s2_label", label: "Stat 2 – popisek", type: "text" },
        { key: "s3_value", label: "Stat 3 – číslo", type: "text" },
        { key: "s3_label", label: "Stat 3 – popisek", type: "text" },
        { key: "photo", label: "Fotka (detail, hráč vlevo)", type: "image" },
        f.credit,
        { key: "team_logo", label: "Logo týmu (vlastní)", type: "image" },
        { key: "opponent_logo", label: "Logo soupeře (vlastní)", type: "image" },
      ],
      sampleData: {
        first_name: "Martin",
        last_name: "Peterka",
        team: "BK Kvis Pardubice",
        opponent: "Slavia Praha",
        s1_value: "24",
        s1_label: "PTS",
        s2_value: "27",
        s2_label: "EFF",
        s3_value: "9",
        s3_label: "REB",
        photo: PHOTO(a.arena),
        photo_credit: "",
      },
      elements: (() => {
        const metal = lin(90, [0, "#FFFFFF"], [0.5, "#F3F1F7"], [1, "#B9B3C8"]);
        const stats = [3, 2].flatMap((n): TemplateElement[] =>
          Array.from({ length: n }, (_, i): TemplateElement[] => {
            const step = 228;
            const y = 410 + ((3 - n) * step) / 2 + i * step;
            const cond = { showIf: `s${n}_value`, ...(n < 3 ? { hideIf: "s3_value" } : {}) };
            const sfx = n < 3 ? "-2" : "";
            const nm = (x: string) => `${x}${n < 3 ? " (2 staty)" : ""}`;
            return [
              text(`v${i + 1}${sfx}`, nm(`Stat ${i + 1}`), [700, y, 370, 214], `{{s${i + 1}_value}}`, { font: "Mazzard H", weight: 900, size: 212, minSize: 80, valign: "bottom", letterSpacing: -0.045, fill: metal, shadow: { color: "rgba(0,0,0,0.35)", blur: 26, x: 0, y: 8 }, anchorX: "right", ...cond }),
              text(`l${i + 1}${sfx}`, nm(`Stat ${i + 1} popisek`), [710, y + 214, 340, 40], `{{s${i + 1}_label}}`, { font: "Mazzard H", weight: 900, size: 30, uppercase: true, letterSpacing: 0.01, anchorX: "right", ...cond }),
            ];
          }).flat(),
        );
        const corner = (id: string, x: number, y: number, d: string, ax: "left" | "right", ay: "top" | "bottom"): TemplateElement => path(id, "Rohová závorka", [x, y, 34, 34], d, { stroke: "#FFFFFF", strokeWidth: 3, opacity: 0.9, anchorX: ax, anchorY: ay });
        return [
          img("photo", "Fotka", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "placeholder" }),
          // fotka se vpravo ztrácí do barvy brand kitu
          rect("fade-r", "Přechod doprava do barvy", [0, 0, 1080, 1350], lin(0, [0, "@secondary/0"], [0.42, "@secondary/0"], [0.62, "@secondary/80"], [0.76, "@secondary/97"], [1, "@secondary"]), { anchorX: "stretch", anchorY: "stretch" }),
          rect("fade-b", "Ztmavení dole", [0, 0, 1080, 1350], lin(90, [0, "@dark/30"], [0.12, "@dark/0"], [0.72, "@dark/0"], [1, "@dark/85"]), { anchorX: "stretch", anchorY: "stretch" }),
          rect("glow", "Záře vpravo", [520, 520, 1000, 1000], { type: "radial", stops: [[0, "@primary/55"], [0.4, "@primary/18"], [0.69, "@primary/0"], [1, "@primary/0"]] }, { blend: "screen", anchorX: "right" }),
          // světlo reflektoru nahoře
          rect("spot", "Světlo reflektoru", [450, -10, 240, 240], { type: "radial", stops: [[0, "rgba(255,255,255,0.7)"], [0.25, "rgba(255,255,255,0.35)"], [0.6, "rgba(255,255,255,0)"], [1, "rgba(255,255,255,0)"]] }, { blend: "screen", anchorY: "top" }),
          // světelné oblouky vpravo
          path("arc1", "Světelný oblouk 1", [600, 0, 480, 1350], "M100 2 C 40 20, 10 50, 98 100", { stroke: "@primary", strokeWidth: 10, opacity: 0.55, blend: "screen", shadow: { color: "@primary", blur: 40, x: 0, y: 0 }, anchorX: "right", anchorY: "stretch" }),
          path("arc2", "Světelný oblouk 2", [600, 0, 480, 1350], "M100 8 C 55 26, 30 55, 100 92", { stroke: "#FFFFFF", strokeWidth: 3, opacity: 0.55, blend: "screen", shadow: { color: "@primary", blur: 22, x: 0, y: 0 }, anchorX: "right", anchorY: "stretch" }),
          path("arc3", "Světelný oblouk 3", [700, 700, 380, 650], "M100 0 C 70 40, 75 80, 100 100", { stroke: "@primary", strokeWidth: 26, opacity: 0.4, blend: "screen", shadow: { color: "#FFFFFF", blur: 30, x: 0, y: 0 }, anchorX: "right", anchorY: "bottom" }),
          corner("c1", 30, 18, "M0 100 L0 0 L100 0", "left", "top"),
          corner("c2", 1016, 18, "M0 0 L100 0 L100 100", "right", "top"),
          corner("c3", 30, 1298, "M0 0 L0 100 L100 100", "left", "bottom"),
          corner("c4", 1016, 1298, "M100 0 L100 100 L0 100", "right", "bottom"),
          img("league", "Logo ligy", [700, 96, 260, 140], "brand:partner", { fit: "contain", fallback: "none", anchorX: "right", anchorY: "top" }),
          logo("team-logo", "Logo týmu", [700, 286, 116, 96], "team", { override: "{{team_logo}}", logoVariant: "white", equalize: 0.7, anchorX: "right", anchorY: "top" }),
          rect("logos-div", "Dělicí čára log", [839, 286, 1.5, 96], "rgba(255,255,255,0.55)", { anchorX: "right", anchorY: "top" }),
          logo("opp-logo", "Logo soupeře", [862, 286, 116, 96], "opponent", { override: "{{opponent_logo}}", logoVariant: "white", equalize: 0.7, anchorX: "right", anchorY: "top" }),
          ...stats,
          text("name", "Jméno a příjmení", [64, 1084, 640, 60], "{{first_name}} {{last_name}}", { font: "Mazzard H", weight: 900, size: 54, minSize: 30, uppercase: true, letterSpacing: -0.005, shadow: { color: "rgba(0,0,0,0.45)", blur: 14, x: 0, y: 3 }, anchorY: "bottom" }),
          text("vs", "Soupeř", [66, 1146, 640, 34], "vs {{opponent}}", { font: "Mazzard H", weight: 300, size: 26, uppercase: true, letterSpacing: 0.02, opacity: 0.85, showIf: "opponent", anchorY: "bottom" }),
          text("credit", "Foto credit", [66, 1196, 640, 24], "Foto: {{photo_credit}}", { font: "body", italic: true, weight: 600, size: 17, opacity: 0.5, showIf: "photo_credit", anchorY: "bottom" }),
          brandLogo([760, 1236, 220, 64], { align: "right", anchorX: "right", anchorY: "bottom" }),
        ];
      })(),
    },
    // 28 ── HRÁČ ZÁPASU – CELÁ POSTAVA (akční fotka, diagonální plocha, obří tenké jméno, čísla v řadě se štítky; podle BCL, v barvách brand kitu)
    {
      id: "mvp-body",
      name: "Hráč zápasu – Celá postava",
      category: "Hráči",
      description: "Akční fotka přes celou plochu, diagonální plocha v barvě brand kitu, logo týmu v šikmém pruhu vpravo nahoře, obří tenké jméno na dva řádky a tři čísla v řadě se štítky.",
      background: "@dark",
      finish: { grain: 10, vignette: 28 },
      fields: [
        { key: "first_name", label: "Jméno", type: "text" },
        { key: "last_name", label: "Příjmení", type: "text" },
        { key: "team", label: "Tým hráče", type: "team" },
        { key: "opponent", label: "Soupeř", type: "team" },
        { key: "s1_value", label: "Stat 1 – číslo", type: "text" },
        { key: "s1_label", label: "Stat 1 – popisek", type: "text" },
        { key: "s2_value", label: "Stat 2 – číslo", type: "text" },
        { key: "s2_label", label: "Stat 2 – popisek", type: "text" },
        { key: "s3_value", label: "Stat 3 – číslo", type: "text" },
        { key: "s3_label", label: "Stat 3 – popisek", type: "text" },
        { key: "photo", label: "Fotka (celá postava)", type: "image" },
        f.credit,
        { key: "team_logo", label: "Logo týmu (vlastní)", type: "image" },
      ],
      sampleData: {
        first_name: "Martin",
        last_name: "Peterka",
        team: "BK Kvis Pardubice",
        opponent: "Slavia Praha",
        s1_value: "24",
        s1_label: "PTS",
        s2_value: "6",
        s2_label: "AST",
        s3_value: "26",
        s3_label: "EFF",
        photo: PHOTO(a.arena),
        photo_credit: "",
      },
      elements: (() => {
        const stats = [3, 2].flatMap((n): TemplateElement[] =>
          Array.from({ length: n }, (_, i): TemplateElement[] => {
            const w = n === 3 ? 214 : 280;
            const x0 = 540 - (w * n) / 2;
            const x = x0 + i * w;
            const cond = { showIf: `s${n}_value`, ...(n < 3 ? { hideIf: "s3_value" } : {}) };
            const sfx = n < 3 ? "-2" : "";
            const nm = (t: string) => `${t}${n < 3 ? " (2 staty)" : ""}`;
            const out: TemplateElement[] = [
              text(`v${i + 1}${sfx}`, nm(`Stat ${i + 1}`), [x, 986, w, 126], `{{s${i + 1}_value}}`, { font: "Mazzard H", weight: 900, size: 128, minSize: 60, align: "center", valign: "bottom", letterSpacing: -0.02, shadow: { color: "rgba(0,0,0,0.35)", blur: 18, x: 0, y: 6 }, anchorY: "bottom", ...cond }),
              rect(`p${i + 1}${sfx}`, nm(`Štítek ${i + 1}`), [x + w / 2 - 60, 1126, 120, 42], "@dark/85", { radius: 21, stroke: "rgba(255,255,255,0.9)", strokeWidth: 2, anchorY: "bottom", ...cond }),
              text(`l${i + 1}${sfx}`, nm(`Štítek ${i + 1} – text`), [x + w / 2 - 60, 1126, 120, 42], `{{s${i + 1}_label}}`, { font: "Mazzard H", weight: 900, size: 24, uppercase: true, align: "center", valign: "middle", letterSpacing: 0.02, anchorY: "bottom", ...cond }),
            ];
            if (i > 0) out.push(rect(`d${i + 1}${sfx}`, nm(`Oddělovač ${i}`), [x - 1, 1018, 1.5, 72], "rgba(255,255,255,0.6)", { anchorY: "bottom", ...cond }));
            return out;
          }).flat(),
        );
        return [
          img("photo", "Fotka", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "placeholder" }),
          // spodní tmavá plocha
          rect("fade-b", "Ztmavení dole", [0, 0, 1080, 1350], lin(90, [0, "@dark/0"], [0.55, "@dark/0"], [0.74, "@secondary/70"], [0.88, "@secondary/95"], [1, "@dark"]), { anchorX: "stretch", anchorY: "stretch" }),
          // diagonální plocha v barvě brand kitu
          path("tri", "Diagonální plocha", [0, 0, 1080, 1350], "M0 81 L60 49 L71 84 L0 100 Z", { fill: lin(0, [0, "@primary/95"], [1, "@primary/75"]), anchorX: "stretch", anchorY: "stretch" }),
          path("tri-hl", "Diagonální plocha – světlo", [0, 0, 1080, 1350], "M0 81 L60 49 L62 55 L0 86 Z", { fill: "rgba(255,255,255,0.10)", anchorX: "stretch", anchorY: "stretch" }),
          // šikmá linka přes celou výšku
          path("line", "Šikmá linka", [0, 0, 1080, 1350], "M79 0 L90 100", { stroke: "#FFFFFF", strokeWidth: 2, opacity: 0.85, anchorX: "stretch", anchorY: "stretch" }),
          // šikmý pruh s logem týmu vpravo nahoře
          path("crest-bg", "Pruh s logem – plocha", [0, 0, 1080, 1350], "M80.4 0 L100 0 L100 33 L83.4 27.6 Z", { fill: "@secondary", shadow: { color: "rgba(0,0,0,0.35)", blur: 24, x: 0, y: 6 }, anchorX: "stretch", anchorY: "stretch" }),
          path("crest-edge", "Pruh s logem – hrana", [0, 0, 1080, 1350], "M80.4 0 L83.4 27.6 L100 33", { stroke: "#FFFFFF", strokeWidth: 2, opacity: 0.9, anchorX: "stretch", anchorY: "stretch" }),
          logo("crest", "Logo týmu", [900, 60, 160, 250], "team", { override: "{{team_logo}}", logoVariant: "white", equalize: 0.75, opacity: 0.95, anchorX: "right", anchorY: "top" }),
          // obří tenké jméno
          text("first", "Jméno", [96, 700, 900, 170], "{{first_name}}", { font: "Mazzard H", weight: 300, size: 190, minSize: 80, uppercase: true, letterSpacing: -0.02, color: "#F4F3F7", shadow: { color: "rgba(0,0,0,0.35)", blur: 20, x: 0, y: 6 }, anchorY: "bottom" }),
          text("last", "Příjmení", [420, 834, 640, 170], "{{last_name}}", { font: "Mazzard H", weight: 300, size: 190, minSize: 70, uppercase: true, letterSpacing: -0.02, color: "#F4F3F7", shadow: { color: "rgba(0,0,0,0.35)", blur: 20, x: 0, y: 6 }, anchorY: "bottom" }),
          ...stats,
          text("vs", "Soupeř", [60, 1216, 640, 32], "vs {{opponent}}", { font: "Mazzard H", weight: 300, size: 24, uppercase: true, letterSpacing: 0.04, opacity: 0.8, showIf: "opponent", anchorY: "bottom" }),
          text("credit", "Foto credit", [60, 1260, 600, 24], "Foto: {{photo_credit}}", { font: "body", italic: true, weight: 600, size: 17, opacity: 0.5, showIf: "photo_credit", anchorY: "bottom" }),
          img("foot-logos", "Loga dole (liga | oBasketu)", [720, 1246, 320, 56], "brand:partner", { row: { srcs: ["brand:partner", "brand:logo"], gap: 20, sep: { color: "rgba(255,255,255,0.5)", width: 1.5, height: 0.9 }, maxW: 0.44 }, fallback: "none", anchorX: "right", anchorY: "bottom" }),
        ];
      })(),
    },
  ];

  // 30 ── VÝSLEDKY KOLA – PREMIUM (pozadí z brand kitu + světelné efekty, hlavička jako Program – Premium, karty z matného skla)
  {
    const metal = lin(90, [0, "#FFFFFF"], [0.55, "#F1EEF6"], [1, "#B9B2C6"]);
    // společné prémiové pozadí (brand kit + hedvábné světlo + oblouky + rastr + záře)
    const premiumBg = (): TemplateElement[] => [
        img("bg", "Pozadí (brand kit)", [0, 0, 1080, 1350], "brand:bg0", { fit: "cover", zone: "bg", anchorX: "stretch", anchorY: "stretch", fallback: "none" }),
        rect("bg-dim", "Ztmavení pozadí", [0, 0, 1080, 1350], "@dark/52", { zone: "bg", anchorX: "stretch", anchorY: "stretch" }),
        // hedvábné světlo v barvě projektu + bílý lesk
        img("silk", "Hedvábné světlo (barva projektu)", [0, 0, 1080, 1350], "asset:tex-silk", { fit: "cover", lumaKey: 1.6, tint: "@primary", blend: "screen", opacity: 0.65, fallback: "none", anchorX: "stretch", anchorY: "stretch" }),
        img("silk-hl", "Hedvábné světlo – lesk", [0, 0, 1080, 1350], "asset:tex-silk", { fit: "cover", lumaKey: 4.5, blend: "screen", opacity: 0.22, fallback: "none", anchorX: "stretch", anchorY: "stretch" }),
        img("swirl", "Světelné oblouky", [0, 0, 1080, 1350], "asset:tex-swirl", { fit: "cover", lumaKey: 1.4, tint: "@primary", blend: "screen", opacity: 0.45, fallback: "none", anchorX: "stretch", anchorY: "stretch" }),
        img("swirl-hl", "Světelné oblouky – lesk", [0, 0, 1080, 1350], "asset:tex-swirl", { fit: "cover", lumaKey: 3, blend: "screen", opacity: 0.2, fallback: "none", anchorX: "stretch", anchorY: "stretch" }),
        img("halftone", "Rastr teček", [0, 0, 1080, 1350], "asset:tex-halftone", { fit: "cover", lumaKey: 1, blend: "screen", opacity: 0.06, fallback: "none", anchorX: "stretch", anchorY: "stretch" }),
        // barevné záře
        rect("bloom-1", "Záře vlevo nahoře", [-520, -520, 1300, 1300], { type: "radial", stops: [[0, "@primary/60"], [0.35, "@primary/20"], [0.69, "@primary/0"], [1, "@primary/0"]] }, { blend: "screen", anchorX: "left", anchorY: "top" }),
        rect("bloom-2", "Záře vpravo dole", [380, 640, 1240, 1240], { type: "radial", stops: [[0, "@primary/35"], [0.35, "@primary/10"], [0.69, "@primary/0"], [1, "@primary/0"]] }, { blend: "screen", anchorX: "right", anchorY: "bottom" }),
        // ztmavení pod kartami (čitelnost)
        rect("center-dim", "Ztmavení pod kartami", [-60, 260, 1200, 1060], { type: "radial", stops: [[0, "@dark/70"], [0.45, "@dark/45"], [0.69, "@dark/0"], [1, "@dark/0"]] }, {}),
    ];
    const beam = (id: string, x: number, y: number, h: number, rot: number, op: number): TemplateElement =>
      rect(id, "Světelný paprsek", [x, y, 70, h], lin(0, [0, "rgba(255,255,255,0)"], [0.5, "rgba(255,255,255,0.55)"], [1, "rgba(255,255,255,0)"]), { rotation: rot, opacity: op, blend: "screen", fade: { angle: 90, from: 0, to: 0.35 } });
    defs.push({
      id: "round-results-premium",
      name: "Výsledky kola – Premium",
      category: "Soutěž",
      description: "Pozadí z brand kitu se světelnými paprsky, barevnými záři a trojúhelníky v rozích, hlavička jako u Programu – Premium, karty z matného skla se září v barvách týmů a kovovým skóre.",
      background: "@dark",
      finish: { grain: 16, vignette: 42 },
      fields: [
        { key: "kicker", label: "Nadtitulek", type: "text", placeholder: "Maxa NBL" },
        { key: "title", label: "Nadpis", type: "text", placeholder: "Výsledky" },
        f.round,
        { key: "dates", label: "Termín", type: "text", placeholder: "3.–4. 10." },
        {
          key: "games",
          label: "Zápasy",
          type: "list",
          help: "2–6 zápasů. Loga bere z týmů, případně nahrajte vlastní do sloupce Logo D / Logo H.",
          columns: [
            { key: "home", label: "Domácí", type: "team" },
            { key: "away", label: "Hosté", type: "team" },
            { key: "home_score", label: "Skóre D", type: "number" },
            { key: "away_score", label: "Skóre H", type: "number" },
            { key: "home_logo", label: "Logo D (vlastní)", type: "image" },
            { key: "away_logo", label: "Logo H (vlastní)", type: "image" },
          ],
        },
        { key: "loser", label: "Skóre poraženého", type: "select", options: ["Ztlumit", "Nic"] },
      ],
      sampleData: { kicker: "Maxa NBL", title: "Výsledky", round: "2. kolo", dates: "27.–28. 9.", games: RESULTS_2_KOLO.slice(0, 6).map((g) => ({ home: g.home, away: g.away, home_score: g.home_score, away_score: g.away_score })), loser: "Ztlumit" },
      elements: [
        ...premiumBg(),
        // hlavička (stejná jako Program – Premium)
        rect("k-line-l", "Linka vlevo", [318, 92, 86, 1.5], "rgba(255,255,255,0.45)"),
        rect("k-line-r", "Linka vpravo", [676, 92, 86, 1.5], "rgba(255,255,255,0.45)"),
        text("kicker", "Nadtitulek", [414, 74, 252, 38], "{{kicker}}", { font: "body", weight: 600, size: 24, uppercase: true, align: "center", letterSpacing: 0.34, opacity: 0.9 }),
        text("title", "Nadpis", [80, 112, 920, 176], "{{title|default:Výsledky}}", { font: "Mazzard H", weight: 900, size: 172, minSize: 80, uppercase: true, align: "center", letterSpacing: -0.02, fill: metal, shadow: { color: "rgba(0,0,0,0.55)", blur: 34, x: 0, y: 12 } }),
        path("i-tl", "Rámeček – roh 1", [318, 296, 22, 22], "M0 100 L0 0 L100 0", { stroke: "#FFFFFF", strokeWidth: 2, opacity: 0.7 }),
        path("i-tr", "Rámeček – roh 2", [740, 296, 22, 22], "M0 0 L100 0 L100 100", { stroke: "#FFFFFF", strokeWidth: 2, opacity: 0.7 }),
        path("i-bl", "Rámeček – roh 3", [318, 346, 22, 22], "M0 0 L0 100 L100 100", { stroke: "#FFFFFF", strokeWidth: 2, opacity: 0.7 }),
        path("i-br", "Rámeček – roh 4", [740, 346, 22, 22], "M100 0 L100 100 L0 100", { stroke: "#FFFFFF", strokeWidth: 2, opacity: 0.7 }),
        text("info", "Kolo a termín", [340, 298, 400, 68], "[{{round}}] | {{dates}}", { font: "Saira Condensed", weight: 700, size: 40, uppercase: true, align: "center", letterSpacing: 0.06, wordSpacing: 0.18, highlight: "@accent", highlightWeight: 800 }),
        // karty z matného skla
        list("games", "Zápasy", [200, 400, 680, 790], "games", 118, 18, [
          rect("card", "Karta – sklo", [0, 0, 680, 118], lin(90, [0, "rgba(255,255,255,0.16)"], [1, "rgba(255,255,255,0.05)"]), { radius: 24, stroke: "rgba(255,255,255,0.28)", strokeWidth: 1.5 }),
          rect("hg", "Záře domácích", [10, -30, 250, 178], { type: "radial", stops: [[0, "@team:{{home}}/26"], [0.69, "@team:{{home}}/0"], [1, "@team:{{home}}/0"]] }, { blend: "screen" }),
          rect("ag", "Záře hostů", [420, -30, 250, 178], { type: "radial", stops: [[0, "@team:{{away}}/26"], [0.69, "@team:{{away}}/0"], [1, "@team:{{away}}/0"]] }, { blend: "screen" }),
          rect("card-hl", "Karta – horní odlesk", [30, 1, 620, 1.5], lin(0, [0, "rgba(255,255,255,0)"], [0.5, "rgba(255,255,255,0.7)"], [1, "rgba(255,255,255,0)"])),
          logo("hl", "Logo D", [46, 12, 150, 94], "home", { override: "{{home_logo}}", equalize: 0.62, shadow: { color: "rgba(0,0,0,0.35)", blur: 14, x: 0, y: 4 } }),
          text("hs", "Skóre D", [196, 10, 126, 98], "{{home_score}}", { fitWith: "{{away_score}}", font: "Mazzard H", weight: 900, size: 74, minSize: 40, align: "right", valign: "middle", letterSpacing: -0.03, fill: metal, dim: { when: "home_score < away_score", opacity: 0.45, mode: "loser" } }),
          rect("dash", "Pomlčka", [328, 56, 24, 6], "@accent", { radius: 3 }),
          text("as", "Skóre H", [358, 10, 126, 98], "{{away_score}}", { fitWith: "{{home_score}}", font: "Mazzard H", weight: 900, size: 74, minSize: 40, align: "left", valign: "middle", letterSpacing: -0.03, fill: metal, dim: { when: "away_score < home_score", opacity: 0.45, mode: "loser" } }),
          logo("al", "Logo H", [484, 12, 150, 94], "away", { override: "{{away_logo}}", equalize: 0.62, shadow: { color: "rgba(0,0,0,0.35)", blur: 14, x: 0, y: 4 } }),
        ], { distribute: true, rowsBg: { src: "brand:bg0", radius: 24, canvas: true, blur: 26, brightness: 1.1, opacity: 0.4, backing: "@dark/85" } }),
        img("foot-logos", "Loga dole (liga | oBasketu)", [290, 1230, 500, 76], "brand:partner", { row: { srcs: ["brand:partner", "brand:logo"], gap: 28, sep: { color: "rgba(255,255,255,0.5)", width: 1.5, height: 0.9 }, maxW: 0.44 }, fallback: "none", anchorY: "bottom" }),
      ],
    });
    // 31 ── TABULKA – PREMIUM (světlé řádky na skleněném panelu, šipky posunu, série, dělicí čáry; podle EuroLeague Standings)
    const dash = (id: string, name: string, cond: string, color: string): TemplateElement[] =>
      Array.from({ length: 30 }, (_, i) => rect(`${id}${i}`, `${name} ${i + 1}`, [i * 30, 72, 18, 3], color, { showIf: cond }));
    defs.push({
      id: "standings-premium",
      name: "Tabulka – Premium",
      category: "Soutěž",
      description: "Prémiové pozadí, velký nadpis a logo ligy, skleněný panel se světlými řádky: šipka posunu, pořadí, logo, tým, zápasy, výhry, prohry a série (zeleně výhry, červeně prohry), přerušovaná a plná dělicí čára.",
      background: "@dark",
      finish: { grain: 14, vignette: 40 },
      fields: [
        { key: "title", label: "Nadpis", type: "text", placeholder: "Tabulka" },
        { key: "round_label", label: "Podnadpis", type: "text", placeholder: "Po 4. kole" },
        {
          key: "rows",
          label: "Tabulka",
          type: "list",
          help: "Posun napište „nahoru“, „dolů“ nebo „stejně“ (nebo vyplňte předchozí pozici). Série např. 3V nebo 2P.",
          columns: [
            { key: "pos", label: "#", type: "number" },
            { key: "move", label: "Posun (nahoru / dolů / stejně)", type: "text" },
            { key: "prev", label: "Předchozí pozice (místo posunu)", type: "number" },
            { key: "team", label: "Tým", type: "team" },
            { key: "g", label: "Z", type: "number" },
            { key: "w", label: "V", type: "number" },
            { key: "l", label: "P", type: "number" },
            { key: "streak", label: "Série", type: "text" },
          ],
        },
        { key: "cut1", label: "Přerušovaná čára pod pozicí", type: "number" },
        { key: "cut2", label: "Plná čára pod pozicí", type: "number" },
        { key: "cut1_label", label: "Popisek přerušované čáry", type: "text", placeholder: "Čtvrtfinále" },
        { key: "cut2_label", label: "Popisek plné čáry", type: "text", placeholder: "Předkolo play-off" },
      ],
      sampleData: {
        title: "Tabulka",
        round_label: "Po 4. kole",
        rows: STANDINGS.map((r, i) => ({ pos: r.pos, prev: [1, 3, 2, 5, 4, 6, 9, 7, 8, 11, 10, 12][i] ?? r.pos, team: r.team, g: r.w + r.l, w: r.w, l: r.l, streak: ["4V", "2V", "P", "V", "2P", "V", "P", "2V", "P", "V", "3P", "2P"][i] ?? "" })),
        cut1: 6,
        cut2: 10,
        cut1_label: "Čtvrtfinále",
        cut2_label: "Předkolo play-off",
      },
      elements: [
        ...premiumBg(),
        // nadpis vlevo nahoře, logo ligy vpravo
        text("title", "Nadpis", [70, 52, 620, 104], "{{title|default:Tabulka}}", { font: "Mazzard H", weight: 900, size: 104, minSize: 60, uppercase: true, letterSpacing: -0.02, fill: metal, shadow: { color: "rgba(0,0,0,0.45)", blur: 24, x: 0, y: 8 }, anchorX: "left", anchorY: "top" }),
        text("sub", "Podnadpis", [74, 150, 620, 44], "{{round_label}}", { font: "Mazzard H", weight: 900, size: 40, uppercase: true, letterSpacing: 0.01, color: "@accent", anchorX: "left", anchorY: "top" }),
        img("league", "Logo ligy", [700, 60, 310, 120], "brand:partner", { fit: "contain", align: "right", fallback: "none", anchorX: "right", anchorY: "top" }),
        // skleněný panel
        rect("panel", "Panel – sklo", [60, 222, 960, 1010], lin(90, [0, "rgba(255,255,255,0.16)"], [1, "rgba(255,255,255,0.06)"]), { radius: 28, stroke: "rgba(255,255,255,0.3)", strokeWidth: 1.5, shadow: { color: "rgba(0,0,0,0.45)", blur: 50, x: 0, y: 20 } }),
        rect("panel-hl", "Panel – odlesk", [100, 223, 880, 1.5], lin(0, [0, "rgba(255,255,255,0)"], [0.5, "rgba(255,255,255,0.75)"], [1, "rgba(255,255,255,0)"])),
        // hlavička tabulky
        text("h-pos", "Hlavička #", [146, 232, 70, 54], "#", { font: "Saira Condensed", weight: 600, size: 34, align: "center", valign: "middle", opacity: 0.85 }),
        text("h-team", "Hlavička tým", [316, 232, 300, 54], "Tým", { font: "Saira Condensed", weight: 600, size: 34, uppercase: true, valign: "middle", opacity: 0.95 }),
        text("h-g", "Hlavička Z", [680, 232, 70, 54], "Z", { font: "Saira Condensed", weight: 600, size: 34, align: "center", valign: "middle", opacity: 0.95 }),
        text("h-w", "Hlavička V", [750, 232, 70, 54], "V", { font: "Saira Condensed", weight: 600, size: 34, align: "center", valign: "middle", opacity: 0.95 }),
        text("h-l", "Hlavička P", [820, 232, 70, 54], "P", { font: "Saira Condensed", weight: 600, size: 34, align: "center", valign: "middle", opacity: 0.95 }),
        text("h-s", "Hlavička série", [890, 232, 110, 54], "Série", { font: "Saira Condensed", weight: 600, size: 34, uppercase: true, align: "center", valign: "middle", color: "@accent" }),
        list("rows", "Řádky", [90, 292, 910, 930], "rows", 74, 3, [
          rect("mv-bg", "Pás šipek", [0, 0, 56, 74], "rgba(10,6,20,0.55)"),
          path("up", "Šipka nahoru", [16, 26, 24, 20], "M50 0 L100 100 L0 100 Z", { fill: "#C6F432", showIf: "move *= nah || prev && prev > pos" }),
          path("down", "Šipka dolů", [16, 28, 24, 20], "M0 0 L100 0 L50 100 Z", { fill: "#FF2E5B", showIf: "move *= dol || prev && prev < pos" }),
          rect("eq1", "Beze změny 1", [17, 30, 22, 4], "#FFFFFF", { showIf: "move *= stej || prev && prev == pos" }),
          rect("eq2", "Beze změny 2", [17, 40, 22, 4], "#FFFFFF", { showIf: "move *= stej || prev && prev == pos" }),
          rect("pos-bg", "Pořadí – plocha", [56, 0, 70, 74], "@secondary"),
          text("pos", "Pořadí", [56, 0, 70, 74], "{{pos}}", { font: "Saira Condensed", weight: 700, size: 44, align: "center", valign: "middle" }),
          rect("row", "Řádek", [126, 0, 784, 74], lin(0, [0, "rgba(255,255,255,0.94)"], [1, "rgba(238,233,248,0.86)"])),
          logo("logo", "Logo", [140, 8, 76, 58], "team", { equalize: 0.72 }),
          text("team", "Tým", [228, 0, 360, 74], "{{team}}", { font: "Saira Condensed", weight: 600, size: 40, minSize: 26, valign: "middle", color: "@dark" }),
          text("g", "Zápasy", [590, 0, 70, 74], "{{g}}", { font: "Saira Condensed", weight: 600, size: 38, align: "center", valign: "middle", color: "@dark" }),
          text("w", "Výhry", [660, 0, 70, 74], "{{w}}", { font: "Saira Condensed", weight: 600, size: 38, align: "center", valign: "middle", color: "@dark" }),
          text("l", "Prohry", [730, 0, 70, 74], "{{l}}", { font: "Saira Condensed", weight: 600, size: 38, align: "center", valign: "middle", color: "@dark" }),
          text("st-w", "Série (výhry)", [800, 0, 110, 74], "{{streak}}", { font: "Saira Condensed", weight: 800, size: 38, uppercase: true, align: "center", valign: "middle", color: "#14A04A", showIf: "streak *= V" }),
          text("st-l", "Série (prohry)", [800, 0, 110, 74], "{{streak}}", { font: "Saira Condensed", weight: 800, size: 38, uppercase: true, align: "center", valign: "middle", color: "#D2381E", showIf: "streak *= P" }),
          ...dash("cut1-", "Přerušovaná čára", "pos == cut1", "@accent"),
          rect("cut2", "Plná čára", [0, 72, 910, 4], "#FFFFFF", { showIf: "pos == cut2", shadow: { color: "rgba(0,0,0,0.5)", blur: 6, x: 0, y: 0 } }),
        ], { distribute: false }),
        // legenda a logo
        ...Array.from({ length: 3 }, (_, i) => rect(`lg1-${i}`, `Legenda – čárka ${i + 1}`, [70 + i * 14, 1262, 9, 3], "@accent", { showIf: "cut1_label", anchorY: "bottom" })),
        text("lg1", "Legenda přerušované čáry", [120, 1246, 300, 34], "{{cut1_label}}", { font: "Saira Condensed", weight: 600, size: 26, uppercase: true, opacity: 0.85, showIf: "cut1_label", anchorY: "bottom" }),
        rect("lg2-l", "Legenda – plná čára", [70, 1300, 38, 3], "#FFFFFF", { showIf: "cut2_label", anchorY: "bottom" }),
        text("lg2", "Legenda plné čáry", [120, 1284, 300, 34], "{{cut2_label}}", { font: "Saira Condensed", weight: 600, size: 26, uppercase: true, opacity: 0.85, showIf: "cut2_label", anchorY: "bottom" }),
        brandLogo([820, 1250, 200, 66], { align: "right", anchorX: "right", anchorY: "bottom" }),
      ],
    });
  }

  // 29 ── VÝSLEDKY – PREMIUM CAROUSEL (stejný design jako Výsledek zápasu – Premium, 1 zápas = 1 slide)
  {
    const base = defs.find((d) => d.id === "result-premium");
    if (base) {
      const globalKeys = ["kicker", "round", "status", "team_names"];
      const rowFields = base.fields.filter((x) => !globalKeys.includes(x.key));
      const sd = base.sampleData;
      const row = Object.fromEntries(rowFields.map((x) => [x.key, sd[x.key]])) as typeof sd;
      defs.push({
        ...base,
        id: "results-premium-carousel",
        name: "Výsledky – Premium carousel",
        description: "Stejný design jako Výsledek zápasu – Premium, ale pro více zápasů: každý zápas je jeden slide carouselu (vlastní fotka, skóre, čtvrtiny, hráč zápasu).",
        paginate: { field: "games", perPage: 1, rowAsData: true },
        fields: [
          ...base.fields.filter((x) => globalKeys.includes(x.key)),
          { key: "games", label: "Zápasy (1 zápas = 1 slide)", type: "list", help: "Každý řádek = jeden slide. Fotku přidáte kliknutím na políčko ve sloupci Fotka, výřez posunete tažením v náhledu.", columns: rowFields },
        ],
        sampleData: {
          kicker: sd.kicker,
          round: sd.round,
          status: sd.status,
          team_names: "Zobrazit",
          games: [
            row,
            { ...row, home_team: RESULTS_2_KOLO[1].home, away_team: RESULTS_2_KOLO[1].away, home_score: RESULTS_2_KOLO[1].home_score, away_score: RESULTS_2_KOLO[1].away_score, home_record: "3-3", away_record: "4-2", detail: "18:20 · 21:19 · 20:24 · 20:21", mvp_name: "Kameron Taylor", s1_value: "22", s2_value: "7", s3_value: "25" },
            { ...row, home_team: RESULTS_2_KOLO[2].home, away_team: RESULTS_2_KOLO[2].away, home_score: RESULTS_2_KOLO[2].home_score, away_score: RESULTS_2_KOLO[2].away_score, home_record: "6-0", away_record: "2-4", detail: "26:15 · 24:20 · 22:18 · 24:17", mvp_name: "Adam Kejval", s1_value: "18", s2_value: "11", s3_value: "26" },
          ],
        },
        elements: JSON.parse(JSON.stringify(base.elements)),
      });
    }
  }


  // 31 ── EVROPSKÉ POHÁRY ŽEN: výsledek a hráčka zápasu stejně jako BCL, ale v barvách Euroligy žen a EuroCupu žen
  {
    const comps = [
      { key: "elw", name: "Euroliga žen", logo: "asset:comp-elw", tall: true, palette: { primary: "#3AA7E6", secondary: "#0B3A8F", accent: "#B4248F", dark: "#03163F" }, home: "ZVVZ USK Praha", away: "Žabiny Brno" },
      { key: "ecw", name: "EuroCup žen", logo: "asset:comp-ecw", tall: false, palette: { primary: "#74E6E0", secondary: "#7D1B74", accent: "#F0566A", dark: "#2A0632" }, home: "Žabiny Brno", away: "KP Brno" },
      // FIBA Europe Cup (Evropský pohár FIBA) – muži, jen výsledek zápasu
      { key: "fec", name: "FIBA Europe Cup", logo: "asset:comp-fec", tall: true, men: true, palette: { primary: "#3B8EEA", secondary: "#0F2C5E", accent: "#3B8EEA", dark: "#05112A" }, home: "BK Opava", away: "Trepça" },
    ] as { key: string; name: string; logo: string; tall: boolean; men?: boolean; palette: Record<string, string>; home: string; away: string }[];
    const fem: [RegExp, string][] = [
      [/Hráč zápasu/g, "Hráčka zápasu"],
      [/Hráč \(vyříznutý\)/g, "Hráčka (vyříznutá)"],
      [/vyříznutý hráč/g, "vyříznutá hráčka"],
      [/Fotka hráče/g, "Fotka hráčky"],
      [/Tým hráče/g, "Tým hráčky"],
      [/týmu hráče/g, "týmu hráčky"],
      [/Záře za hráčem/g, "Záře za hráčkou"],
      [/hráčem zápasu/g, "hráčkou zápasu"],
    ];
    for (const base of defs.filter((d) => d.id === "bcl-result" || d.id === "bcl-mvp")) {
      for (const c of comps) {
        if (c.men && base.id !== "bcl-result") continue;
        let str = JSON.stringify(base);
        if (!c.men) for (const [re, to] of fem) str = str.replace(re, to);
        str = str.replace(/"brand:partner"/g, `"${c.logo}"`);
        const d = JSON.parse(str) as TDef;
        d.id = `${base.id}-${c.key}`;
        d.name = d.name.replace(/ – (BCL|Liga mistrů)$/, ` – ${c.name}`);
        d.description = `${c.name}: ${d.description}`;
        d.palette = c.palette;
        const sd = { ...d.sampleData };
        if (base.id === "bcl-result") Object.assign(sd, { home_team: c.home, away_team: c.away, home_record: "2-0", away_record: "1-1", mvp_name: c.men ? "Martin Peterka" : "Tereza Nováková", s1_value: "21", s1_label: "PTS", s2_value: "9", s2_label: "REB", s3_value: "24", s3_label: "EFF" });
        else Object.assign(sd, { title: "Hráčka zápasu", subtitle: `${c.name} · 2. kolo`, first_name: "Tereza", last_name: "Nováková", team: c.home, opponent: c.away, s1_value: "21", s1_label: "PTS", s2_value: "9", s2_label: "REB", s3_value: "24", s3_label: "EFF" });
        d.sampleData = sd;
        // svislé logo Euroligy žen potřebuje vyšší rámeček
        if (c.tall)
          d.elements = d.elements.map((e) => {
            if (e.id === "league") return { ...e, frame: { x: 476, y: 10, w: 128, h: 100 } };
            if (e.id === "partner") return { ...e, frame: { x: 440, y: 1206, w: 118, h: 124 } };
            return e;
          });
        defs.push(d);
      }
    }
  }

  // 32 ── EVROPSKÉ POHÁRY – PROGRAM TÝDNE (rozložení: svislý nadpis vlevo, panel se zápasy podle soutěže jako u Basket Ženy;
  //       vlastní vzhled ve stylu BCL premium: světelný vír, kovový nadpis, skleněný panel se světelnou hranou)
  {
    const isComp = (word: string) => `__header && comp *= ${word}`;
    defs.push({
      id: "bcl-week",
      name: "Program týdne – Evropské poháry",
      category: "Soutěž",
      description: "Všechny české týmy v Evropě za týden: podle soutěže (BCL, Euroliga žen, EuroCup žen…) nadpis s logem a pod ním zápasy. Grafitové pozadí s oblouky z loga oBasketu a oranžovou září, kovový svislý nadpis, skleněný panel.",
      background: { type: "radial", stops: [[0, "@secondary"], [0.65, "@dark"], [1, "@dark"]] },
      finish: { grain: 16, vignette: 40 },
      palette: { primary: "#FF5A1F", secondary: "#1C212C", accent: "#FF4800", dark: "#0A0C11" },
      fields: [
        { key: "title", label: "Svislý nadpis", type: "text", placeholder: "Program" },
        { key: "subtitle", label: "Pod nadpisem (termín)", type: "text", placeholder: "14.–16. 10." },
        {
          key: "games",
          label: "Zápasy",
          type: "list",
          help: "Seřaďte podle soutěže – nadpis soutěže se vloží sám vždy, když se soutěž změní.",
          columns: [
            { key: "comp", label: "Soutěž", type: "select", options: ["Liga mistrů FIBA", "FIBA Europe Cup", "EuroCup", "Euroliga", "Euroliga žen", "EuroCup žen"] },
            { key: "home", label: "Domácí", type: "team" },
            { key: "away", label: "Hosté", type: "team" },
            { key: "date", label: "Datum", type: "date" },
            { key: "time", label: "Čas", type: "text" },
            { key: "home_logo", label: "Logo D (vlastní)", type: "image" },
            { key: "away_logo", label: "Logo H (vlastní)", type: "image" },
          ],
        },
      ],
      sampleData: {
        title: "Program",
        subtitle: "14.–16. 10.",
        games: [
          { comp: "Liga mistrů FIBA", home: "Slavia Praha", away: "Bilbao Basket", date: "2026-10-14", time: "20:30" },
          { comp: "Liga mistrů FIBA", home: "Reggiana", away: "BK Kvis Pardubice", date: "2026-10-15", time: "20:00" },
          { comp: "FIBA Europe Cup", home: "Trepça", away: "BK Opava", date: "2026-10-14", time: "18:30" },
          { comp: "Euroliga žen", home: "ZVVZ USK Praha", away: "Tango Bourges", date: "2026-10-14", time: "19:00" },
          { comp: "EuroCup žen", home: "Žabiny Brno", away: "AEL Limassol", date: "2026-10-14", time: "18:00" },
          { comp: "EuroCup žen", home: "ESB Villeneuve", away: "DSK Basketball Brandýs", date: "2026-10-14", time: "20:00" },
          { comp: "EuroCup žen", home: "Girona", away: "SBŠ Ostrava", date: "2026-10-14", time: "20:15" },
          { comp: "EuroCup žen", home: "KP Brno", away: "Nyon Basket", date: "2026-10-14", time: "18:00" },
        ],
      },
      elements: [
        rect("glow-bl", "Oranžová záře vlevo dole", [-620, 520, 1240, 1240], { type: "radial", stops: [[0, "@primary/55"], [0.3, "@primary/18"], [0.69, "@primary/0"], [1, "@primary/0"]] }, { blend: "screen", anchorX: "left", anchorY: "bottom" }),
        rect("glow-tr", "Záře vpravo nahoře", [560, -620, 1100, 1100], { type: "radial", stops: [[0, "@primary/22"], [0.4, "@primary/6"], [0.69, "@primary/0"], [1, "@primary/0"]] }, { blend: "screen", anchorX: "right", anchorY: "top" }),
        img("lines-glow", "Oblouky z loga – záře", [-520, 260, 1800, 1408], "asset:obasketu-lines", { fit: "contain", rotation: -12, tint: "@primary", blur: 10, blend: "screen", opacity: 0.55, fallback: "none", anchorX: "left", anchorY: "bottom" }),
        img("lines", "Oblouky z loga oBasketu", [-520, 260, 1800, 1408], "asset:obasketu-lines", { fit: "contain", rotation: -12, tint: "@primary", blend: "screen", opacity: 0.75, fallback: "none", anchorX: "left", anchorY: "bottom" }),
        img("lines-2", "Oblouky z loga – vpravo nahoře", [560, -330, 900, 704], "asset:obasketu-lines", { fit: "contain", rotation: 160, blend: "screen", opacity: 0.16, fallback: "none", anchorX: "right", anchorY: "top" }),
        img("halftone", "Rastr teček", [0, 0, 1080, 1350], "asset:tex-halftone", { fit: "cover", lumaKey: 1, blend: "screen", opacity: 0.05, fallback: "none", anchorX: "stretch", anchorY: "stretch" }),
        img("logo", "Logo", [70, 70, 110, 86], "brand:logo", { fit: "contain", valign: "top", fallback: "none", anchorX: "left", anchorY: "top" }),
        text("title", "Svislý nadpis", [30, 300, 190, 880], "{{title}}", { font: "Russo One", weight: 400, size: 190, minSize: 80, uppercase: true, vertical: true, align: "left", letterSpacing: 0.01, fill: METAL, shadow: { color: "rgba(0,0,0,0.5)", blur: 30, x: 0, y: 8 }, anchorX: "left", anchorY: "bottom" }),
        rect("sub-bar", "Linka nad termínem", [101, 1214, 48, 3], "@primary", { anchorX: "left", anchorY: "bottom" }),
        text("subtitle", "Termín", [30, 1226, 190, 56], "{{subtitle}}", { font: "Saira Condensed", weight: 800, size: 46, minSize: 22, uppercase: true, align: "center", valign: "bottom", color: "#FFFFFF", shadow: { color: "rgba(0,0,0,0.6)", blur: 14, x: 0, y: 3 }, anchorX: "left", anchorY: "bottom" }),
        rect("panel", "Skleněný panel", [240, 70, 812, 1212], lin(0, [0, "@secondary/82"], [0.55, "@dark/86"], [1, "@dark/80"]), { radius: 8, stroke: "rgba(255,255,255,0.14)", strokeWidth: 1.5, shadow: { color: "rgba(0,0,0,0.55)", blur: 50, x: 0, y: 18 }, anchorX: "center", anchorY: "stretch" }),
        rect("panel-edge", "Světelná hrana panelu", [240, 160, 2.5, 1030], lin(90, [0, "@primary/0"], [0.5, "@primary"], [1, "@primary/0"]), { shadow: { color: "@primary", blur: 18, x: 0, y: 0 }, anchorX: "center", anchorY: "stretch" }),
        rect("panel-top", "Světelná hrana nahoře", [380, 70, 540, 2], lin(0, [0, "rgba(255,255,255,0)"], [0.5, "rgba(255,255,255,0.75)"], [1, "rgba(255,255,255,0)"]), { anchorX: "center", anchorY: "top" }),
        list("games", "Zápasy podle soutěže", [262, 88, 768, 1176], "games", 96, 0, [
          // nadpis soutěže
          img("h-bcl", "Logo BCL", [8, 16, 150, 58], "brand:partner", { fit: "contain", align: "left", fallback: "none", showIf: `${isComp("mistr")} || ${isComp("bcl")} || ${isComp("champions")}` }),
          img("h-elw", "Logo Euroligy žen", [8, 10, 150, 68], "asset:comp-elw", { fit: "contain", align: "left", fallback: "none", showIf: isComp("euroliga zen") }),
          img("h-fec", "Logo FIBA Europe Cup", [8, 10, 150, 68], "asset:comp-fec", { fit: "contain", align: "left", fallback: "none", showIf: `${isComp("europe cup")} || ${isComp("evropsky pohar")}` }),
          img("h-ecw", "Logo EuroCupu žen", [8, 16, 150, 58], "asset:comp-ecw", { fit: "contain", align: "left", fallback: "none", showIf: isComp("eurocup zen") }),
          text("h-name", "Název soutěže", [176, 14, 584, 66], "{{comp}}", { font: "Russo One", weight: 400, size: 36, minSize: 22, uppercase: true, align: "left", letterSpacing: 0.03, fill: METAL, showIf: "__header" }),
          rect("h-line", "Linka pod soutěží", [8, 92, 752, 2], lin(0, [0, "@primary"], [0.6, "@primary/40"], [1, "@primary/0"]), { showIf: "__header" }),
          // zápas
          text("home", "Domácí", [8, 14, 248, 66], "{{home}}", { font: "Saira Condensed", weight: 700, size: 34, minSize: 20, uppercase: true, align: "right", letterSpacing: 0.01, hideIf: "__header" }),
          logo("hl", "Logo D", [262, 20, 62, 56], "home", { override: "{{home_logo}}", logoVariant: "white", equalize: 0.8, hideIf: "__header" }),
          text("time", "Čas", [332, 10, 104, 54], "{{time}}", { font: "Saira Condensed", weight: 800, size: 42, align: "center", color: "@primary", hideIf: "__header" }),
          text("day", "Den", [330, 62, 108, 24], "{{date|day}} {{date|date:short}}", { font: "Saira Condensed", weight: 600, size: 18, minSize: 12, uppercase: true, align: "center", letterSpacing: 0.04, opacity: 0.75, hideIf: "__header" }),
          logo("al", "Logo H", [444, 20, 62, 56], "away", { override: "{{away_logo}}", logoVariant: "white", equalize: 0.8, hideIf: "__header" }),
          text("away", "Hosté", [512, 14, 248, 66], "{{away}}", { font: "Saira Condensed", weight: 700, size: 34, minSize: 20, uppercase: true, align: "left", letterSpacing: 0.01, hideIf: "__header" }),
          rect("sep", "Dělicí čára", [8, 95, 752, 1], "rgba(255,255,255,0.12)", { hideIf: "__header" }),
        ], { groupBy: "comp", center: true, fill: 1.7, anchorX: "center", anchorY: "stretch" }),
      ],
    });
  }

  for (const d of defs) {
    const map = ANCHORS[d.id];
    if (!map) continue;
    for (const el of d.elements) if (map[el.id] && !el.anchorY) el.anchorY = map[el.id];
  }
  return defs.map((d) => ({
    id: `${projectId}-${d.id}`,
    projectId,
    name: d.name,
    category: d.category,
    description: d.description,
    baseFormat: d.baseFormat ?? "ig_portrait",
    formats: [...FORMAT_ORDER],
    background: d.background,
    elements: d.elements,
    fields: d.fields,
    sampleData: d.sampleData,
    paginate: d.paginate,
    finish: d.finish,
    ...(d.palette ? { palette: d.palette } : {}),
    createdAt: now,
    updatedAt: now,
    builtIn: true,
  }));
}

/** Prázdná šablona pro "Nová šablona" */
export function blankTemplate(projectId: string, id: string): Template {
  const now = Date.now();
  return {
    id,
    projectId,
    name: "Nová šablona",
    category: "Vlastní",
    baseFormat: "ig_portrait",
    formats: [...FORMAT_ORDER],
    background: lin(160, [0, "@secondary"], [1, "@dark"]),
    fields: [
      { key: "title", label: "Titulek", type: "text" },
      { key: "photo", label: "Fotka", type: "image" },
    ],
    sampleData: { title: "Titulek grafiky" },
    elements: [
      img("photo", "Fotka", [0, 0, 1080, 800], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "top", fallback: "placeholder" }),
      text("title", "Titulek", [60, 860, 960, 260], "{{title}}", { size: 150, uppercase: true, align: "center", maxLines: 2, lineHeight: 0.92 }),
      brandLogo([440, 1250, 200, 64]),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/** Koláž: tři rozložení (2 / 3 / 4 fotky), zobrazí se jen to, které odpovídá počtu nahraných fotek. */
function collageElements(): TemplateElement[] {
  const layouts: { id: string; show: string; hide?: string; cells: Box[] }[] = [
    { id: "l2", show: "p1_photo", hide: "p3_photo", cells: [[0, 0, 538, 1350], [542, 0, 538, 1350]] },
    { id: "l3", show: "p3_photo", hide: "p4_photo", cells: [[0, 0, 1080, 673], [0, 677, 538, 673], [542, 677, 538, 673]] },
    { id: "l4", show: "p4_photo", cells: [[0, 0, 538, 673], [542, 0, 538, 673], [0, 677, 538, 673], [542, 677, 538, 673]] },
  ];
  const out: TemplateElement[] = [];
  for (const L of layouts) {
    const cond = { showIf: L.show, ...(L.hide ? { hideIf: L.hide } : {}) };
    L.cells.forEach(([x, y, w, h], i) => {
      const n = i + 1;
      const big = w > 600;
      const tag = `${L.id}-${n}`;
      out.push(
        img(`${tag}-photo`, `${n}. fotka (${L.id})`, [x, y, w, h], `{{p${n}_photo}}`, { fit: "cover", fallback: "placeholder", ...cond }),
        rect(`${tag}-shade`, `${n}. ztmavení (${L.id})`, [x, y + h * 0.5, w, h * 0.5], lin(90, [0, "@dark/0"], [1, "@dark/92"]), cond),
        logo(`${tag}-team`, `${n}. logo týmu (${L.id})`, [x + w / 2 - 40, y + h - 236, 80, 70], `p${n}_team`, { equalize: 0.8, ...cond, showIf: `${L.show} && p${n}_team` }),
        text(`${tag}-name`, `${n}. jméno (${L.id})`, [x + 24, y + h - 158, w - 48, 70], `{{p${n}_name}}`, { font: "Mazzard H", weight: 900, size: big ? 66 : 50, uppercase: true, align: "center", ...cond }),
        text(`${tag}-stats`, `${n}. statistiky (${L.id})`, [x + 30, y + h - 80, w - 60, 46], `{{p${n}_stats}}`, { font: "body", weight: 700, size: big ? 34 : 28, uppercase: true, align: "center", pill: { fill: "@accent", padX: 16, padY: 6, radius: 3 }, ...cond, showIf: `${L.show} && p${n}_stats` }),
      );
    });
  }
  out.push(
    rect("title-shade", "Titulek – ztmavení", [0, 0, 1080, 300], lin(90, [0, "@dark/90"], [1, "@dark/0"]), { showIf: "title", anchorX: "stretch", anchorY: "top" }),
    text("title", "Titulek", [140, 34, 800, 130], "{{title}}", { size: 140, uppercase: true, align: "center", color: "@accent", showIf: "title", anchorY: "top", shadow: { color: "rgba(0,0,0,0.5)", blur: 14, x: 0, y: 4 } }),
    text("subtitle", "Podtitulek", [240, 168, 600, 48], "{{subtitle}}", { font: "body", weight: 700, size: 32, uppercase: true, align: "center", pill: { fill: "@accent", padX: 22, padY: 6, radius: 3 }, showIf: "subtitle", anchorY: "top" }),
    brandLogo([36, 36, 96, 72], { align: "left", anchorY: "top" }),
  );
  return out;
}
