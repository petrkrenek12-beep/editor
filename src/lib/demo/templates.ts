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
  transfer: { note: "bottom", "from-logo": "bottom", arrow: "bottom", "to-logo": "bottom", "from-name": "bottom", "to-name": "bottom", first: "bottom", last: "bottom", details: "bottom" },
  "player-stats": { name: "center", s1: "center", s1l: "center", s2: "center", s2l: "center", s3: "center", s3l: "center", date: "bottom", comp: "bottom" },
  standings: { rows: "stretch" },
  "final-standings": { p1: "center", p2: "center", p3: "center", l1: "center", l2: "center", l3: "center", n1: "center", n2: "center", n3: "center", r1: "center", r2: "center", r3: "center", rest: "bottom" },
  anniversary: { kicker: "center", number: "center", unit: "center", headline: "center", name: "center" },
  breaking: { kicker: "bottom", headline: "bottom" },
  "results-carousel": { games: "stretch" },
  program: { games: "stretch" },
  quote: { quote: "center" },
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
        text("mvp", "Hráč zápasu", [90, 1192, 900, 58], "[★] {{mvp}}", { font: "body", italic: true, weight: 600, size: 38, align: "center", highlight: "#F7B733", showIf: "mvp" }),
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
        away_team: "ERA Nymburk",
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
        away_team: "ERA Nymburk",
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
        away_team: "ERA Nymburk",
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
    // 5 ── PŘESTUP HRÁČE
    {
      id: "transfer",
      name: "Přestup hráče",
      category: "Hráči",
      description: "Z klubu → do klubu, jméno a parametry hráče.",
      background: lin(135, [0, "@secondary"], [1, "@dark"]),
      fields: [
        { key: "kicker", label: "Nadpis", type: "text" },
        { key: "first_name", label: "Jméno", type: "text" },
        { key: "last_name", label: "Příjmení", type: "text" },
        { key: "from_team", label: "Z klubu", type: "team" },
        { key: "to_team", label: "Do klubu", type: "team" },
        { key: "position", label: "Post", type: "text" },
        { key: "height", label: "Výška (cm)", type: "number" },
        { key: "age", label: "Věk", type: "number" },
        { key: "note", label: "Poznámka", type: "text" },
        { key: "photo", label: "Hráč (ideálně bez pozadí)", type: "image" },
      ],
      sampleData: {
        kicker: "Přestup",
        first_name: "Martin",
        last_name: "Dvořák",
        from_team: "Sluneta Ústí nad Labem",
        to_team: "Basket Brno",
        position: "Rozehrávač",
        height: 192,
        age: 27,
        note: "Smlouva do roku 2028",
        photo: { asset: a.player },
      },
      elements: [
        text("kicker", "Nadpis obrys", [30, 40, 1020, 240], "{{kicker}}", { size: 260, uppercase: true, color: "rgba(0,0,0,0)", strokeText: { color: "@accent", width: 4 }, anchorY: "top" }),
        img("photo", "Hráč", [260, 170, 820, 1180], "{{photo}}", { zone: "hero", align: "right", valign: "bottom", fallback: "placeholder", shadow: { color: "rgba(0,0,0,0.5)", blur: 40, x: 0, y: 10 } }),
        text("note", "Poznámka", [60, 680, 620, 50], "{{note}}", { font: "accent", italic: true, weight: 600, size: 32, showIf: "note" }),
        logo("from-logo", "Z klubu", [60, 750, 170, 170], "from_team"),
        path("arrow", "Šipka", [255, 800, 100, 70], "M0 50 L85 50 M60 22 L90 50 L60 78", { stroke: "@accent", strokeWidth: 12 }),
        logo("to-logo", "Do klubu", [380, 750, 170, 170], "to_team"),
        text("from-name", "Z klubu název", [30, 926, 230, 36], "{{from_team|short}}", { font: "body", weight: 800, size: 24, align: "center" }),
        text("to-name", "Do klubu název", [350, 926, 230, 36], "{{to_team|short}}", { font: "body", weight: 800, size: 24, align: "center" }),
        text("first", "Jméno", [60, 985, 760, 80], "{{first_name}}", { font: "body", weight: 700, size: 64, uppercase: true }),
        text("last", "Příjmení", [60, 1055, 840, 160], "{{last_name}}", { size: 180, uppercase: true, color: "@accent" }),
        text("details", "Parametry", [60, 1226, 760, 60], "{{position}} · {{height}} cm · {{age}} let", { font: "body", weight: 800, size: 28, uppercase: true, color: "@secondary", pill: { fill: "#FFFFFF", padX: 22, padY: 12, radius: 6 } }),
        brandLogo([870, 1262, 170, 56], { align: "right" }),
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
        { key: "opponent", label: "Soupeř", type: "team" },
        f.comp,
        f.photo,
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
        img("photo", "Fotka", [330, 0, 750, 1350], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "right", anchorY: "stretch", valign: "top", fallback: "placeholder" }),
        rect("panel", "Panel", [0, 0, 480, 1350], lin(0, [0, "@secondary"], [0.72, "@secondary/90"], [1, "@secondary/0"]), { anchorY: "stretch", hideIn: ["x"] }),
        path("sw1", "Linka 1", [620, 0, 460, 560], SWOOSH_A, { stroke: "#FFFFFF", strokeWidth: 5, anchorX: "right", anchorY: "top", hideIn: ["x"] }),
        path("sw2", "Linka 2", [620, 0, 460, 560], SWOOSH_B, { stroke: "#FFFFFF", strokeWidth: 5, anchorX: "right", anchorY: "top", hideIn: ["x"] }),
        brandLogo([40, 40, 150, 60], { align: "left" }),
        text("name", "Jméno svisle", [40, 150, 110, 800], "{{player}}", { size: 110, uppercase: true, vertical: true, align: "right", letterSpacing: 0.02 }),
        text("s1", "Stat 1", [180, 140, 300, 200], "{{s1_value}}", { size: 210 }),
        text("s1l", "Stat 1 štítek", [180, 338, 200, 52], "{{s1_label}}", { font: "body", weight: 800, size: 30, uppercase: true, pill: { fill: "@accent", padX: 20, padY: 8, radius: 3 } }),
        text("s2", "Stat 2", [180, 410, 300, 200], "{{s2_value}}", { size: 210 }),
        text("s2l", "Stat 2 štítek", [180, 608, 200, 52], "{{s2_label}}", { font: "body", weight: 800, size: 30, uppercase: true, pill: { fill: "@accent", padX: 20, padY: 8, radius: 3 } }),
        text("s3", "Stat 3", [180, 680, 300, 200], "{{s3_value}}", { size: 210 }),
        text("s3l", "Stat 3 štítek", [180, 878, 200, 52], "{{s3_label}}", { font: "body", weight: 800, size: 30, uppercase: true, pill: { fill: "@accent", padX: 20, padY: 8, radius: 3 } }),
        text("date", "Datum a soupeř", [40, 985, 440, 50], "{{date|date}} vs {{opponent|short}}", { font: "body", weight: 700, size: 32, uppercase: true }),
        text("comp", "Soutěž", [40, 1080, 360, 60], "{{competition}}", { font: "body", weight: 800, size: 30, uppercase: true, color: "@primary", pill: { fill: "#FFFFFF", padX: 20, padY: 10, radius: 6 } }),
      ],
    },
    // 8 ── TABULKA SOUTĚŽE
    {
      id: "standings",
      name: "Tabulka soutěže",
      category: "Soutěž",
      description: "Průběžná tabulka – řádky se samy zmenší podle počtu týmů.",
      background: lin(160, [0, "@secondary"], [1, "@dark"]),
      fields: [
        { key: "title", label: "Titulek", type: "text" },
        f.comp,
        f.round,
        {
          key: "rows",
          label: "Tabulka",
          type: "list",
          columns: [
            { key: "pos", label: "#", type: "number" },
            { key: "team", label: "Tým", type: "team" },
            { key: "w", label: "V", type: "number" },
            { key: "l", label: "P", type: "number" },
            { key: "pts", label: "Body", type: "number" },
          ],
        },
        { key: "note", label: "Poznámka", type: "text" },
      ],
      sampleData: { title: "Tabulka", competition: "Maxa NBL", round: "2. kole", rows: STANDINGS, note: "Tabulka po 2. kole základní části" },
      elements: [
        text("title", "Titulek", [60, 60, 760, 140], "{{title}}", { size: 150, uppercase: true }),
        text("sub", "Podtitulek", [60, 195, 760, 50], "{{competition}} · po {{round}}", { font: "body", weight: 800, size: 30, uppercase: true, color: "@accent" }),
        brandLogo([840, 80, 180, 70], { align: "right" }),
        text("h-pos", "Hlavička #", [60, 270, 70, 40], "#", { font: "body", weight: 800, size: 22, align: "center", opacity: 0.6 }),
        text("h-team", "Hlavička tým", [210, 270, 400, 40], "Tým", { font: "body", weight: 800, size: 22, uppercase: true, opacity: 0.6 }),
        text("h-w", "Hlavička V", [740, 270, 70, 40], "V", { font: "body", weight: 800, size: 22, align: "center", opacity: 0.6 }),
        text("h-l", "Hlavička P", [820, 270, 70, 40], "P", { font: "body", weight: 800, size: 22, align: "center", opacity: 0.6 }),
        text("h-pts", "Hlavička body", [900, 270, 120, 40], "Body", { font: "body", weight: 800, size: 22, align: "center", uppercase: true, opacity: 0.6 }),
        list("rows", "Řádky", [60, 318, 960, 950], "rows", 74, 8, [
          rect("row-bg", "Pozadí", [0, 0, 960, 74], "@dark/55", { radius: 8 }),
          text("pos", "Pořadí", [0, 0, 70, 74], "{{pos}}", { size: 46, align: "center", color: "@accent" }),
          logo("logo", "Logo", [80, 9, 56, 56], "team"),
          text("team", "Tým", [150, 0, 520, 74], "{{team}}", { font: "body", weight: 700, size: 32, uppercase: true }),
          text("w", "Výhry", [680, 0, 70, 74], "{{w}}", { font: "body", weight: 600, size: 30, align: "center" }),
          text("l", "Prohry", [760, 0, 70, 74], "{{l}}", { font: "body", weight: 600, size: 30, align: "center" }),
          text("pts", "Body", [840, 0, 120, 74], "{{pts}}", { size: 46, align: "center" }),
        ], { distribute: true }),
        text("note", "Poznámka", [60, 1285, 960, 40], "{{note}}", { font: "body", weight: 500, size: 22, align: "center", opacity: 0.7, showIf: "note" }),
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
        first: "ERA Nymburk",
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
    // 11 ── CITÁT
    {
      id: "quote",
      name: "Citát",
      category: "Obsah",
      description: "Velký citát se zvýrazněním [slov v závorkách].",
      background: "@secondary",
      fields: [
        { key: "quote", label: "Citát", type: "longtext", help: "Slova v [hranatých závorkách] se zvýrazní barvou." },
        { key: "author", label: "Autor", type: "text" },
        { key: "role", label: "Funkce", type: "text" },
        { key: "photo", label: "Portrét (nepovinné)", type: "image" },
      ],
      sampleData: {
        quote: "Obrana nám dnes vyhrála zápas. Kluci [makali do poslední vteřiny] a fanoušci nás táhli.",
        author: "Pavel Benda",
        role: "Hlavní trenér, Basket Brno",
        photo: PHOTO(a.player),
      },
      elements: [
        text("mark", "Uvozovky", [40, 10, 320, 330], "“", { font: "Anton", size: 420, color: "@accent", align: "left", valign: "top" }),
        text("quote", "Citát", [60, 250, 960, 700], "{{quote}}", { font: "body", weight: 700, italic: true, size: 96, maxLines: 7, lineHeight: 1.12, highlight: "@accent" }),
        line("bar", "Linka", [60, 985, 140, 8], "@accent", 8),
        img("photo", "Portrét", [60, 1040, 200, 200], "{{photo}}", { fit: "cover", radius: 100, showIf: "photo" }),
        text("author", "Autor", [290, 1050, 740, 90], "{{author}}", { size: 88, uppercase: true }),
        text("role", "Funkce", [290, 1140, 740, 50], "{{role}}", { font: "body", weight: 700, size: 30, color: "@accent" }),
        brandLogo([860, 1270, 180, 54], { align: "right" }),
      ],
    },
    // 12 ── BREAKING NEWS
    {
      id: "breaking",
      name: "Breaking news",
      category: "Obsah",
      description: "Fotka nahoře, štítek BREAKING, titulek se zvýrazněním.",
      background: "@dark",
      fields: [
        { key: "label", label: "Štítek", type: "text" },
        { key: "kicker", label: "Nadtitulek", type: "text" },
        { key: "headline", label: "Titulek", type: "longtext", help: "[Slova v závorkách] se zvýrazní." },
        f.photo,
        f.credit,
      ],
      sampleData: {
        label: "Breaking",
        kicker: "Reprezentace",
        headline: "Nymburský pivot [podepsal v Euroligové] Valencii – odchází ještě před startem sezóny",
        photo: PHOTO(a.arena),
        photo_credit: "Obasketu",
      },
      elements: [
        img("photo", "Fotka", [0, 0, 1080, 860], "{{photo}}", { fit: "cover", zone: "hero", anchorX: "stretch", anchorY: "stretch", fallback: "placeholder" }),
        rect("fade", "Přechod", [0, 560, 1080, 300], lin(90, [0, "@secondary/0"], [1, "@secondary"]), { anchorX: "stretch", anchorY: "bottom", hideIn: ["x"] }),
        rect("panel", "Panel", [0, 860, 1080, 490], "@secondary", { anchorX: "stretch", anchorY: "bottom", hideIn: ["x"] }),
        text("label", "Štítek", [60, 50, 420, 70], "{{label}}", { font: "body", weight: 800, size: 36, uppercase: true, letterSpacing: 0.08, pill: { fill: "#E1251B", padX: 22, padY: 12, radius: 6 }, anchorY: "top" }),
        text("credit", "Foto", [560, 20, 490, 30], "Foto: {{photo_credit}}", { font: "body", weight: 500, size: 22, align: "right", opacity: 0.8, showIf: "photo_credit", anchorY: "top" }),
        text("kicker", "Nadtitulek", [60, 800, 960, 56], "{{kicker}}", { font: "body", weight: 800, size: 30, align: "center", uppercase: true, pill: { fill: "@accent", padX: 20, padY: 10, radius: 6 }, showIf: "kicker" }),
        text("headline", "Titulek", [60, 880, 960, 330], "{{headline}}", { font: "body", weight: 800, size: 76, align: "center", maxLines: 4, lineHeight: 1.05, highlight: "@accent" }),
        brandLogo([440, 1240, 200, 70]),
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
        away_team: "ERA Nymburk",
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
          ],
        },
        { key: "photo_left", label: "Hráč vlevo (bez pozadí)", type: "image" },
        { key: "photo_right", label: "Hráč vpravo (bez pozadí)", type: "image" },
      ],
      sampleData: { title: "Program", dates: "23.9.", round: "2. kolo", games: PROGRAM_3_KOLO.map((g) => ({ ...g, date: "2026-09-23", time: "18:00" })), photo_left: { asset: a.player }, photo_right: { asset: a.player } },
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
          rect("bg", "Pozadí řádku", [0, 0, 549, 131], lin(0, [0, "#0B0910"], [1, "#17111F"]), { radius: 20 }),
          img("bgimg", "Obrázek řádku", [0, 0, 549, 131], "asset:", { fit: "cover", radius: 20, fallback: "placeholder" }),
          logo("hl", "Logo D", [16, 8, 140, 115], "home", { tint: "#FFFFFF" }),
          text("day", "Den", [160, 20, 229, 56], "{{date|day}}", { size: 62, align: "center" }),
          text("time", "Čas", [160, 76, 229, 38], "{{time}}", { size: 40, align: "center" }),
          logo("al", "Logo H", [393, 8, 140, 115], "away", { tint: "#FFFFFF" }),
        ]),
        img("partner", "Liga / partner", [396, 1250, 170, 66], "brand:partner", { fallback: "none", align: "right", locked: true }),
        brandLogo([578, 1246, 110, 74], { align: "left" }),
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
