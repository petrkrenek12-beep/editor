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
  /** Když se řádky nevejdou, zmenší se (nikdy nepřetečou) */
  children: TemplateElement[];
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

export type FieldType = "text" | "longtext" | "number" | "image" | "team" | "date" | "list" | "select";

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
  zoom?: number; // 1 = cover
  fx?: number; // 0..1 střed ořezu
  fy?: number;
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
  paginate?: { field: string; perPage: number };
  createdAt: number;
  updatedAt: number;
  builtIn?: boolean;
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
}

export interface Project {
  id: string;
  name: string;
  parentName?: string; // např. "Obasketu.cz"
  brand: BrandKit;
  teams: Team[];
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
  sync?: { enabled: boolean; key?: string; lastSync?: number; lastRemote?: string };
}
