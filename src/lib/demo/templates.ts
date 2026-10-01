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
  streak: { kicker: "center", "kicker-own": "center", record: "center", games: "center" },
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
            text("hs", "Skóre D", [190, 25, 220, 140], "{{home_score}}", { size: 150, align: "right" }),
            text("colon", ":", [410, 25, 140, 140], ":", { size: 120, align: "center", color: "@accent" }),
            text("as", "Skóre H", [550, 25, 220, 140], "{{away_score}}", { size: 150, align: "left" }),
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
          text("hs", "Skóre D", [220, 8, 165, 92], "{{home_score}}", { size: 104, align: "right", dim: { when: "home_score < away_score", opacity: 0.4, mode: "loser" } }),
          text("colon", "Dvojtečka", [385, 8, 30, 92], ":", { size: 104, align: "center", color: "@accent" }),
          text("as", "Skóre H", [415, 8, 165, 92], "{{away_score}}", { size: 104, align: "left", dim: { when: "away_score < home_score", opacity: 0.4, mode: "loser" } }),
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
      description: "Dlaždice V/P s logy soupeřů za posledních až 20 zápasů. Série („15 výher v řadě“) i bilance se spočítají samy.",
      background: "@dark",
      fields: [
        { key: "team", label: "Tým", type: "team" },
        { key: "headline", label: "Titulek dole", type: "text", placeholder: "Dlouhá neporazitelnost Nymburka je u konce" },
        { key: "kicker", label: "Nadpis nahoře (prázdné = série se spočítá sama)", type: "text" },
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
        games: [
          ["V", "NH Ostrava"], ["V", "BK Armex Energy Děčín"], ["P", "Slavia Praha"], ["V", "Sluneta Ústí nad Labem"], ["V", "Sršni Písek"], ["V", "Basket Brno"],
          ["V", "NH Ostrava"], ["V", "BK Opava"], ["V", "USK Praha"], ["V", "BK Olomoucko"], ["V", "BK GAPA Hradec Králové"], ["V", "BK Lokomotiva Plzeň"],
        ].map(([result, opp]) => ({ result, opp, score: "" })),
        photo: PHOTO(a.arena),
        photo_credit: "",
      },
      elements: [
        img("photo", "Fotka", [0, 0, 1080, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "placeholder" }),
        rect("shade", "Ztmavení", [0, 0, 1080, 1350], lin(90, [0, "@dark/55"], [0.25, "@dark/15"], [0.45, "@dark/35"], [1, "@dark/95"]), { zone: "bg", anchorX: "stretch", anchorY: "stretch" }),
        brandLogo([40, 40, 110, 80], { align: "left", anchorY: "top" }),
        text("credit", "Foto credit", [560, 36, 480, 42], "Foto: {{photo_credit}}", { font: "body", italic: true, weight: 600, size: 30, align: "right", showIf: "photo_credit", anchorX: "right", anchorY: "top", shadow: { color: "rgba(0,0,0,0.5)", blur: 8, x: 0, y: 2 } }),
        img("comp-logo", "Logo soutěže", [390, 40, 300, 100], "{{comp_logo}}", { fit: "contain", showIf: "comp_logo", fallback: "none", anchorY: "top" }),
        img("partner", "Liga / partner", [390, 40, 300, 100], "brand:partner", { fit: "contain", hideIf: "comp_logo", fallback: "none", anchorY: "top" }),
        text("kicker", "Nadpis (série)", [60, 480, 960, 110], "{{@streak:games}}", { size: 120, uppercase: true, align: "center", color: "@accent", hideIf: "kicker", shadow: { color: "rgba(0,0,0,0.5)", blur: 16, x: 0, y: 4 } }),
        text("kicker-own", "Nadpis (vlastní)", [60, 480, 960, 110], "{{kicker}}", { size: 120, uppercase: true, align: "center", color: "@accent", showIf: "kicker", shadow: { color: "rgba(0,0,0,0.5)", blur: 16, x: 0, y: 4 } }),
        text("record", "Bilance", [340, 590, 400, 46], "Bilance {{@record:games}}", { font: "body", weight: 700, size: 30, uppercase: true, align: "center", letterSpacing: 0.06 }),
        list("games", "Série zápasů", [80, 660, 920, 470], "games", 150, 18, [
          rect("win", "Výhra", [0, 0, 150, 150], "#18B23A", { radius: 14, showIf: "result == V || result == W" }),
          rect("loss", "Prohra", [0, 0, 150, 150], "#D81E2C", { radius: 14, showIf: "result == P || result == L" }),
          text("letter", "Písmeno", [0, 8, 150, 104], "{{result|upper}}", { size: 112, align: "center" }),
          logo("opp", "Soupeř", [42, 108, 66, 56], "opp", { equalize: 0.85 }),
        ], { grid: { cols: 6, colWidth: 150, colGap: 18 } }),
        logo("team-logo", "Logo týmu", [60, 1190, 110, 100], "team", { anchorY: "bottom" }),
        rect("bar", "Čárka", [186, 1196, 5, 88], "@accent", { anchorY: "bottom" }),
        text("headline", "Titulek", [208, 1190, 830, 100], "{{headline}}", { font: "Mazzard H", weight: 600, size: 40, uppercase: true, maxLines: 2, lineHeight: 1.1, anchorY: "bottom" }),
      ],
    },
  ];

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
