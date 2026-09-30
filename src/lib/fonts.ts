// Fonty dostupné pro grafiky (všechny podporují češtinu – latin-ext)
export const FONT_LIBRARY: { family: string; weights: number[]; italic?: boolean; kind: string }[] = [
  { family: "Bebas Neue", weights: [400], kind: "Condensed display" },
  { family: "Anton", weights: [400], kind: "Heavy condensed" },
  { family: "Oswald", weights: [400, 500, 600, 700], kind: "Condensed" },
  { family: "Barlow Condensed", weights: [500, 600, 700, 800, 900], italic: true, kind: "Condensed" },
  { family: "Barlow", weights: [400, 500, 600, 700, 800], italic: true, kind: "Sans" },
  { family: "Big Shoulders Display", weights: [700, 800, 900], kind: "Display" },
  { family: "Saira Condensed", weights: [500, 700, 800], kind: "Condensed" },
  { family: "Teko", weights: [500, 600, 700], kind: "Condensed" },
  { family: "Archivo Black", weights: [400], kind: "Heavy sans" },
  { family: "Roboto Condensed", weights: [400, 700], italic: true, kind: "Condensed" },
  { family: "Montserrat", weights: [400, 500, 600, 700, 800, 900], italic: true, kind: "Sans" },
  { family: "Rubik", weights: [400, 500, 700, 900], italic: true, kind: "Sans" },
];

export function googleFontsHref() {
  const fams = FONT_LIBRARY.map((f) => {
    const name = f.family.replace(/ /g, "+");
    if (f.weights.length === 1 && f.weights[0] === 400 && !f.italic) return `family=${name}`;
    if (f.italic) {
      const pairs = [...f.weights.map((w) => `0,${w}`), ...f.weights.map((w) => `1,${w}`)];
      return `family=${name}:ital,wght@${pairs.join(";")}`;
    }
    return `family=${name}:wght@${f.weights.join(";")}`;
  });
  return `https://fonts.googleapis.com/css2?${fams.join("&")}&display=swap`;
}

let linkAdded = false;
export function ensureFontStylesheet() {
  if (linkAdded || typeof document === "undefined") return;
  linkAdded = true;
  if (document.querySelector('link[data-presetka-fonts]')) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = googleFontsHref();
  l.dataset.presetkaFonts = "1";
  document.head.appendChild(l);
}

const customLoaded = new Set<string>();

const WEIGHTS: [RegExp, number][] = [
  [/(hairline|thin)/i, 100],
  [/(extra|ultra)\s*light/i, 200],
  [/light/i, 300],
  [/(semi|demi)\s*bold/i, 600],
  [/(extra|ultra)\s*bold|heavy/i, 800],
  [/black|fat/i, 900],
  [/bold/i, 700],
  [/medium/i, 500],
];

/** "BebasNeue-Bold.ttf" / "BarlowCondensed-ExtraBoldItalic" → rodina, řez, kurzíva */
export function parseFontName(raw: string): { family: string; weight: number; italic: boolean } {
  const base = raw.replace(/\.(ttf|otf|woff2?)$/i, "");
  const [fam, ...rest] = base.split(/[-_]/);
  const style = rest.join(" ");
  let family = fam
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+(Regular|Bold|Italic|Medium|Light|Black|Thin|Heavy|Semibold|SemiBold|ExtraBold)$/i, "")
    .trim();
  const known = FONT_LIBRARY.find((f) => f.family.replace(/\s/g, "").toLowerCase() === family.replace(/\s/g, "").toLowerCase());
  if (known) family = known.family;
  const w = WEIGHTS.find(([re]) => re.test(style || base))?.[1] ?? 400;
  return { family, weight: w, italic: /italic|oblique/i.test(style || base) };
}

/** Registruje vlastní font (z brand kitu nebo knihovny fontů projektu). */
export async function registerCustomFont(family: string, dataUrl: string, desc?: { weight?: number; italic?: boolean }) {
  const key = `${family}|${desc?.weight ?? "any"}|${desc?.italic ? "i" : "n"}`;
  if (!dataUrl || customLoaded.has(key) || typeof FontFace === "undefined") return;
  customLoaded.add(key);
  try {
    const buf = await (await fetch(dataUrl)).arrayBuffer();
    const face = new FontFace(family, buf, desc?.weight ? { weight: String(desc.weight), style: desc.italic ? "italic" : "normal" } : {});
    await face.load();
    document.fonts.add(face);
  } catch (e) {
    customLoaded.delete(key);
    console.warn("Font se nepodařilo načíst", family, e);
  }
}

// Nahrané fonty projektu – renderer je použije, když šablona chce rodinu stejného jména
let fontSource: () => { name: string; dataUrl: string }[] = () => [];
export function setFontSource(fn: () => { name: string; dataUrl: string }[]) {
  fontSource = fn;
}
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export async function registerFamilies(families: string[]) {
  const files = fontSource();
  if (!files.length) return;
  await Promise.all(
    families.flatMap((fam) =>
      files
        .filter((f) => squash(parseFontName(f.name).family) === squash(fam))
        .map((f) => {
          const p = parseFontName(f.name);
          return registerCustomFont(fam, f.dataUrl, { weight: p.weight, italic: p.italic });
        }),
    ),
  );
}

const loadedSpecs = new Set<string>();

/** Počká na načtení konkrétních řezů (canvas jinak použije náhradní font). */
export async function loadFonts(specs: string[]) {
  if (typeof document === "undefined" || !document.fonts) return;
  ensureFontStylesheet();
  const todo = specs.filter((s) => !loadedSpecs.has(s));
  if (!todo.length) return;
  await Promise.all(
    todo.map((s) =>
      document.fonts
        .load(s, "ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž0123")
        .then(() => loadedSpecs.add(s))
        .catch(() => undefined),
    ),
  );
}

export function fontStack(family: string) {
  return `"${family}", "Barlow Condensed", "Arial Narrow", Arial, sans-serif`;
}
