// ─────────────────────────────────────────────────────────────
// Presetka – datový model
// DATA → TEMPLATE → RENDERER → EXPORT
// Šablona nikdy neobsahuje konkrétní data, jen odkazy {{pole}}.
// ─────────────────────────────────────────────────────────────

export type FormatId = "ig_portrait" | "ig_square" | "ig_story" | "fb" | "x";

export interface FormatDef {
  id: FormatId;
  label: string;
  short: string;
  w: number;
  h: number;
}

export type Role = "admin" | "editor" | "viewer";

export interface User {
  id: string;
  name: string;
  role: Role;
}

/** Barva: "#rrggbb", "#rrggbbaa", "rgba(...)" nebo token brand kitu "@primary". */
export type ColorRef = string;

export interface GradientFill {
  type: "linear" | "radial";
  /** stupně, 0 = zleva doprava, 90 = shora dolů */
  angle?: number;
  stops: [number, ColorRef][];
}

export type Fill = ColorRef | GradientFill;

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Pravidla pro přepočet při změně formátu (jako constraints ve Figmě). */
export type AnchorX = "left" | "center" | "right" | "stretch" | "scale";
export type AnchorY = "top" | "center" | "bottom" | "stretch" | "scale";
/**
 * Zóna prvku pro formáty na šířku (X 16:9):
 *  - bg: roztáhne se přes celé plátno
 *  - hero: fotografie – přesune se do levé části
 *  - content: vše ostatní se přeskládá do pravé části
 */
export type Zone = "bg" | "hero" | "content";

export interface Shadow {
  color: ColorRef;
  blur: number;
  x: number;
  y: number;
}

interface BaseElement {
  /** Režim prolnutí jako v Affinity (screen = černá zmizí, zůstanou světlé čáry) */
  blend?: "normal" | "screen" | "multiply" | "overlay" | "lighten" | "soft-light";
  /** Ztlumení (např. poraženého): když platí `when`, sníží krytí / černobílá. `mode` = klíč pole s volbou „Ztlumit“ / „Černobíle“ / „Ztlumit a černobíle“ / „Nic“. */
  dim?: { when: string; opacity?: number; gray?: boolean; mode?: string };
  id: string;
  name: string;
  frame: Frame; // v px vůči základnímu formátu šablony
  frames?: Partial<Record<FormatId, Frame>>; // ruční úprava pro konkrétní formát
  anchorX?: AnchorX;
  anchorY?: AnchorY;
  zone?: Zone;
  opacity?: number;
  rotation?: number;
  hidden?: boolean;
  /** Prvek se nevykreslí, pokud je pole prázdné. */
  showIf?: string;
  /** Prvek se nevykreslí, pokud je pole vyplněné. */
  hideIf?: string;
  /** Zamčeno administrátorem – editor/viewer nemůže měnit. */
  locked?: boolean;
  /** Skrýt jen v některých formátech */
  hideIn?: FormatId[];
  shadow?: Shadow;
  /** Plynulé zprůhlednění (maska přechodem): angle 90 = shora dolů, from/to 0..1 */
  fade?: { angle: number; from: number; to: number };
}

export interface RectElement extends BaseElement {
  type: "rect";
  fill: Fill;
  radius?: number;
  stroke?: ColorRef;
  strokeWidth?: number;
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
  fill: Fill;
  stroke?: ColorRef;
  strokeWidth?: number;
}

export interface PathElement extends BaseElement {
  type: "path";
  /** SVG path v souřadnicích viewBox 0..100 × 0..100 (roztáhne se do rámu) */
  d: string;
  fill?: Fill;
  stroke?: ColorRef;
  strokeWidth?: number;
}

export interface LineElement extends BaseElement {
  type: "line";
  color: ColorRef;
  thickness: number;
}

export type FontRole = "display" | "body" | "accent";

export interface TextElement extends BaseElement {
  type: "text";
  /** Text s proměnnými {{pole}} a filtry {{pole|upper}} */
  text: string;
  font: FontRole | string;
  weight?: number;
  italic?: boolean;
  size: number; // maximální velikost
  minSize?: number; // pod tuto se nezmenší (pak se zalomí/ořízne …)
  color: ColorRef;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  uppercase?: boolean;
  letterSpacing?: number; // em
  lineHeight?: number; // násobek
  maxLines?: number;
  /** Pozadí (štítek) přizpůsobené šířce textu */
  pill?: { fill: Fill; padX: number; padY: number; radius: number };
  /** Zvýrazní text v [hranatých závorkách] touto barvou */
  highlight?: ColorRef;
  /** Svislý text (otočený o -90°) */
  vertical?: boolean;
  strokeText?: { color: ColorRef; width: number };
  /** Obrázek před textem (např. hvězda): src jako u obrázku, scale = výška vůči písmu, gap = mezera v em */
  icon?: { src: string; scale?: number; gap?: number };
  /** Extra mezera mezi slovy (v em) */
  wordSpacing?: number;
  /** Přechodová výplň textu (např. kovový nadpis) – má přednost před color */
  fill?: Fill;
  /** Váha písma pro [zvýrazněná] slova (např. příjmení tučně) */
  highlightWeight?: number;
  /** Běžící pás: text se opakuje přes celou šířku (střídavě tučně / tence) */
  ticker?: { gap?: number; alternate?: boolean; lightWeight?: number; offset?: number; /** přesný počet opakování – roztáhne se přes celou šířku (offset = okraj) */ count?: number };
}

export interface ImageElement extends BaseElement {
  type: "image";
  /**
   * Zdroj:
   *  "{{pole}}"            – obrázek z dat
   *  "team:{{home_team}}"  – logo týmu podle názvu
   *  "brand:logo" | "brand:logoAlt" | "brand:bg0"
   *  "asset:<id>"          – pevný obrázek
   */
  src: string;
  fit?: "cover" | "contain";
  radius?: number;
  /** Zarovnání obsahu při "contain" */
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  /** Když chybí obrázek, zobrazit monogram (loga týmů) */
  fallback?: "monogram" | "placeholder" | "none";
  tint?: ColorRef;
  grayscale?: boolean;
  /** Varianta loga týmu (bílá = Team.logoWhite, když existuje) */
  logoVariant?: "color" | "white";
  /**
   * Vyrovnání velikosti log: ořízne průhledné okraje a všechna loga zmenší
   * na stejnou „optickou“ plochu (podíl plochy rámečku, výchozí 0.6).
   * false = vypnuto. U log týmů zapnuto automaticky.
   */
  equalize?: number | false;
  /** Černá → průhledná (jen světlé čáry zůstanou). Číslo = kontrast (1 = měkce, 3 = jen ostré čáry) */
  lumaKey?: number;
  /** Řada log (např. liga | oBasketu) vycentrovaná jako celek, mezi logy oddělovač */
  row?: { srcs: string[]; gap?: number; sep?: { color: string; width: number; height?: number }; maxW?: number };
  /** Opakovat obrázek vodorovně přes celý rámeček (pás s logy) */
  repeat?: { gap?: number; offset?: number };
  /** Použít vyříznutou verzi fotky (ImageValue.cut) – hráč před pásem */
  useCutout?: boolean;
  /** Vlastní obrázek, který má přednost (např. "{{from_logo}}" – logo zahraničního týmu) */
  override?: string;
  /** Panorama přes více slidů carouselu: obrázek se roztáhne přes `span` slidů, každá další skupina se zrcadlí */
  panorama?: { span: number; mirror?: boolean };
  /** Záře kolem obrysu (Outer Glow) */
  glow?: { color: ColorRef; radius: number; intensity: number };
}

export interface ListElement extends BaseElement {
  type: "list";
  /** Klíč pole typu list */
  field: string;
  /** Základní výška řádku (vůči šířce frame.w) */
  rowHeight: number;
  gap: number;
  maxRows?: number;
  /** Řádky se rozloží rovnoměrně do výšky rámu (true) nebo se skládají od shora */
  distribute?: boolean;
  /** Bez rozprostření: blok řádků svisle na střed rámu */
  center?: boolean;
  /** Když se řádky nevejdou, zmenší se (nikdy nepřetečou) */
  children: TemplateElement[];
  /** Jeden obrázek přes všechny řádky (každý řádek ukáže svůj výřez) */
  rowsBg?: { src: string; radius?: number; opacity?: number; /** plná barva pod obrázkem (jako černá vrstva v Affinity) */ backing?: string };
  /** Mřížka dlaždic místo řádků: `cols` na řádek, dlaždice colWidth × rowHeight, poslední řádek na střed */
  grid?: { cols: number; colWidth: number; colGap?: number };
}

export type TemplateElement =
  | RectElement
  | EllipseElement
  | PathElement
  | LineElement
  | TextElement
  | ImageElement
  | ListElement;

export type ElementType = TemplateElement["type"];

export type ElementOverride = Partial<{
  frame: Frame;
  frames: Partial<Record<FormatId, Frame>>;
  hidden: boolean;
  align: "left" | "center" | "right";
  size: number;
  color: ColorRef;
  fill: Fill;
  opacity: number;
}>;

export type FieldType = "text" | "longtext" | "number" | "image" | "team" | "date" | "list" | "select" | "channel";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  /** pro type = list */
  columns?: FieldDef[];
  help?: string;
}

/** Hodnota obrázkového pole: odkaz na asset + ořez */
export interface ImageValue {
  asset: string; // asset id nebo data:/http URL
  zoom?: number; // 1 = cover, < 1 = zmenšená fotka (zbytek vyplní rozmazané pozadí)
  /** volný posun středu fotky vůči středu rámu (v podílech šířky/výšky rámu) */
  px?: number;
  py?: number;
  fx?: number; // 0..1 střed ořezu
  fy?: number;
  /** Vyříznutá verze stejné fotky (bez pozadí) pro vrstvu v popředí */
  cut?: string;
  /** Úpravy fotky a nasvícení (expozice, kontrast, rim light…) */
  adj?: import("./adjust").PhotoAdjust;
}

export type DataValue = string | number | ImageValue | Record<string, unknown>[] | null | undefined;
export type DataRecord = Record<string, DataValue>;

export interface Template {
  id: string;
  projectId: string;
  name: string;
  category: string;
  description?: string;
  baseFormat: FormatId;
  formats: FormatId[];
  background: Fill;
  elements: TemplateElement[];
  fields: FieldDef[];
  sampleData: DataRecord;
  /** Carousel: rozdělí seznam na více slidů */
  /** Dokončení grafiky: zrno (grain) a viněta 0–100. Lze přepsat u grafiky (data.__grain / __vignette). */
  finish?: { grain?: number; vignette?: number };
  paginate?: { field: string; perPage: number; /** každý slide = jeden řádek; jeho sloupce jsou dostupné jako {{klíč}} v celé šabloně */ rowAsData?: boolean };
  createdAt: number;
  updatedAt: number;
  builtIn?: boolean;
  /** Verze vestavěného návrhu (pro automatické aktualizace nezměněných šablon) */
  rev?: number;
  /** Otisk vestavěného návrhu, ze kterého šablona vychází (pozná se tak novější verze) */
  baseHash?: string;
}

export interface BrandFont {
  family: string;
  /** Vlastní font nahraný uživatelem (asset id) */
  asset?: string;
}

export interface BrandKit {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    dark: string;
    light: string;
    text: string;
  };
  fonts: {
    display: BrandFont;
    body: BrandFont;
    accent: BrandFont;
  };
  logo?: string; // asset id
  logoAlt?: string;
  partnerLogo?: string;
  backgrounds: string[];
  elements: string[];
  /** TV stanice / streamy s logem (např. Prima Sport) */
  channels?: Channel[];
  locks: {
    logo: boolean;
    colors: boolean;
    fonts: boolean;
    photos: boolean;
    text: boolean;
  };
}

export interface Team {
  id: string;
  name: string;
  short: string;
  aliases: string[];
  color: string;
  color2: string;
  logo?: string; // asset id
  /** bílá verze loga (pro tmavé pozadí) */
  logoWhite?: string;
}

export interface Channel {
  id: string;
  name: string;
  logo?: string; // asset id
}

export interface Project {
  id: string;
  name: string;
  parentName?: string; // např. "Obasketu.cz"
  brand: BrandKit;
  teams: Team[];
  /** oblíbené šablony (id) – v pořadí, jak byly označeny */
  favorites?: string[];
  createdAt: number;
}

export interface Asset {
  id: string;
  projectId: string;
  name: string;
  kind: "logo" | "photo" | "background" | "element" | "font" | "team";
  dataUrl: string;
  w?: number;
  h?: number;
  createdAt: number;
  /** adresa v cloudovém úložišti (synchronizace) */
  remoteUrl?: string;
}

export type DataSourceKind = "manual" | "json" | "csv" | "url" | "api";

export interface Dataset {
  id: string;
  projectId: string;
  name: string;
  kind: DataSourceKind;
  /** URL nebo endpoint (pro url / api) */
  source?: string;
  rows: DataRecord[];
  updatedAt: number;
}

export interface Graphic {
  id: string;
  projectId: string;
  templateId: string;
  templateName: string;
  name: string;
  format: FormatId;
  data: DataRecord;
  /** Úpravy prvků jen pro tuto grafiku (pozice, skrytí …) – šablona zůstává beze změny */
  overrides?: Record<string, ElementOverride>;
  page?: number;
  thumb: string; // malý JPEG dataURL
  createdAt: number;
  createdBy?: string;
}

export interface Settings {
  currentProjectId?: string;
  currentUserId?: string;
  users: User[];
  removeBgKey?: string;
  bgProvider: "browser" | "removebg";
  aiEndpoint?: string;
  seedVersion?: number;
  /** smazané položky "kolekce:id" → čas (pro synchronizaci) */
  tombstones?: Record<string, number>;
  /** cloudové soubory ke smazání při další synchronizaci */
  pendingBlobDeletes?: string[];
  sync?: { enabled: boolean; key?: string; lastSync?: number; lastRemote?: string };
}
