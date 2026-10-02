"use client";
import { useRef, useSyncExternalStore } from "react";
import { createAdapter, type CollectionMap, type CollectionName, type StorageAdapter } from "./storage";
import type { Asset, Dataset, Graphic, Project, Role, Settings, Template, User } from "./types";
import { setFontSource } from "./fonts";
import { seedDemo, SEED_VERSION, bgAsset, starAsset, BG_ASSET, rowsBgAsset, ROWS_BG_ASSET, defaultChannels, builtInTemplates, upgradeTemplate, barAsset, fontAssets, linesAsset, zblProject } from "./demo/seed";
import { PROGRAM_3_KOLO, RESULTS_2_KOLO, STANDINGS } from "./demo/data";

export interface AppState {
  ready: boolean;
  persistent: boolean;
  settings: Settings;
  projects: Project[];
  templates: Template[];
  assets: Asset[];
  datasets: Dataset[];
  graphics: Graphic[];
}

const DEFAULT_USERS: User[] = [
  { id: "u-admin", name: "Petr (admin)", role: "admin" },
  { id: "u-editor", name: "Redaktor", role: "editor" },
  { id: "u-viewer", name: "Host", role: "viewer" },
];

let state: AppState = {
  ready: false,
  persistent: false,
  settings: { users: DEFAULT_USERS, currentUserId: "u-admin", bgProvider: "browser" },
  projects: [],
  templates: [],
  assets: [],
  datasets: [],
  graphics: [],
};
let adapter: StorageAdapter | null = null;
setFontSource(() => state.assets.filter((a) => a.kind === "font"));
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  emit();
}

function shallowEqual(a: unknown, b: unknown) {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  return false;
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** Selektor nad globálním stavem; výsledek je stabilní, dokud se nezmění (i pro filtrovaná pole). */
export function useApp<T>(sel: (s: AppState) => T): T {
  const ref = useRef<{ state: AppState; value: T } | null>(null);
  const get = () => {
    const prev = ref.current;
    const value = sel(state);
    if (prev && shallowEqual(prev.value, value)) {
      ref.current = { state, value: prev.value };
      return prev.value;
    }
    ref.current = { state, value };
    return value;
  };
  return useSyncExternalStore(subscribe, get, get);
}
export const getState = () => state;

let initPromise: Promise<void> | null = null;
export function initStore() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const { adapter: a, persistent } = await createAdapter();
    adapter = a;
    let [projects, templates, assets, datasets, graphics, settings] = await Promise.all([
      a.list("projects"),
      a.list("templates"),
      a.list("assets"),
      a.list("datasets"),
      a.list("graphics"),
      a.getSettings(),
    ]);
    if (!projects.length) {
      const seed = await seedDemo();
      for (const p of seed.projects) await a.put("projects", p);
      for (const t of seed.templates) await a.put("templates", t);
      for (const x of seed.assets) await a.put("assets", x);
      for (const d of seed.datasets) await a.put("datasets", d);
      projects = seed.projects;
      templates = seed.templates;
      assets = seed.assets;
      datasets = seed.datasets;
      settings = { ...state.settings, currentProjectId: seed.projects[0].id, seedVersion: SEED_VERSION };
      await a.putSettings(settings);
    }
    // migrace demo obsahu (verze 2: šablony podle PSD uživatele + pozadí OBASKETU)
    if ((settings?.seedVersion ?? 1) < SEED_VERSION && projects.some((p) => p.id === "p-nbl")) {
      if (!assets.some((x) => x.id === "demo-star")) {
        const st = starAsset();
        await a.put("assets", st);
        assets = [...assets, st];
      }
      for (const fa of [...fontAssets(), linesAsset()]) {
        if (assets.some((x) => x.id === fa.id)) continue;
        await a.put("assets", fa);
        assets = [...assets, fa];
      }
      if (!assets.some((x) => x.id === "demo-bar" && x.dataUrl === barAsset().dataUrl)) {
        const ba = barAsset();
        await a.put("assets", ba);
        assets = [...assets.filter((x) => x.id !== ba.id), ba];
      }
      // v7: Nymburk už v lize není – z týmů pryč, ukázkové datové sady bez něj
      for (const [id, rows] of [["p-nbl-program", PROGRAM_3_KOLO], ["p-nbl-results", RESULTS_2_KOLO], ["p-nbl-standings", STANDINGS]] as const) {
        const d = datasets.find((x) => x.id === id);
        if (d && JSON.stringify(d.rows).includes("Nymburk")) {
          const nd = { ...d, rows: rows as unknown as typeof d.rows, updatedAt: Date.now() };
          (nd as { _mod?: number })._mod = Date.now();
          await a.put("datasets", nd);
          datasets = datasets.map((x) => (x.id === id ? nd : x));
        }
      }
      if (!assets.some((x) => x.id === ROWS_BG_ASSET)) {
        const rb = rowsBgAsset();
        await a.put("assets", rb);
        assets = [...assets, rb];
      }
      if (!assets.some((x) => x.id === BG_ASSET)) {
        const bg = bgAsset();
        await a.put("assets", bg);
        assets = [...assets, bg];
      }
      projects = await Promise.all(
        projects.map(async (p) => {
          if (p.id !== "p-nbl") return p;
          const needBg = !p.brand.backgrounds.includes(BG_ASSET);
          const needCh = !p.brand.channels;
          const nym = p.teams.some((t) => /nymburk/i.test(t.name));
          // v9: barva OBASKETU #FF4800 (jen když byla původní výchozí oranžová)
          const oldAccent = p.brand.colors.accent.toUpperCase() === "#FF6A13";
          if (!needBg && !needCh && !nym && !oldAccent) return p;
          const np = {
            ...p,
            teams: p.teams
              .filter((t) => !/nymburk/i.test(t.name))
              .map((t) => (t.name === "Slavia Praha" && !t.aliases.includes("Slavia Praha ERA NBK") ? { ...t, aliases: [...t.aliases, "Slavia Praha ERA NBK"] } : t)),
            brand: {
              ...p.brand,
              colors: oldAccent ? { ...p.brand.colors, accent: "#FF4800" } : p.brand.colors,
              backgrounds: needBg ? [BG_ASSET, ...p.brand.backgrounds] : p.brand.backgrounds,
              channels: p.brand.channels ?? defaultChannels(),
            },
          };
          (np as { _mod?: number })._mod = Date.now();
          await a.put("projects", np);
          return np;
        }),
      );
      // nové vestavěné šablony z aktualizace (kromě těch, které uživatel smazal)
      const tomb = settings?.tombstones ?? {};
      // v15: nová liga ŽBL (převezme logo a fonty z NBL)
      const nblP = projects.find((p) => p.id === "p-nbl");
      if (nblP && !projects.some((p) => p.id === "p-zbl") && !tomb["projects:p-zbl"]) {
        const z = zblProject(nblP.brand, Date.now());
        const logo = assets.find((x) => x.id === nblP.brand.logo);
        if (logo) z.assets.push({ ...logo, id: "p-zbl-logo", projectId: "p-zbl", remoteUrl: undefined, createdAt: Date.now() });
        else z.project.brand.logo = undefined;
        for (const x of z.assets) await a.put("assets", x);
        assets = [...assets, ...z.assets];
        (z.project as { _mod?: number })._mod = Date.now();
        await a.put("projects", z.project);
        projects = [...projects, z.project];
      }
      for (const pid of ["p-nbl", "p-repre", "p-zbl"]) {
        if (!projects.some((p) => p.id === pid)) continue;
        for (const nt of builtInTemplates(pid)) {
          if (templates.some((t) => t.id === nt.id) || tomb[`templates:${nt.id}`]) continue;
          (nt as { _mod?: number })._mod = Date.now();
          await a.put("templates", nt);
          templates = [...templates, nt];
        }
      }
      settings = { ...(settings ?? state.settings), seedVersion: SEED_VERSION };
      await a.putSettings(settings);
    }
    const s: Settings = { ...state.settings, ...(settings ?? {}) };
    if (!s.users?.length) s.users = DEFAULT_USERS;
    if (!s.currentProjectId || !projects.find((p) => p.id === s.currentProjectId)) s.currentProjectId = projects[0]?.id;
    setState({
      ready: true,
      persistent,
      settings: s,
      projects: projects.sort((x, y) => x.createdAt - y.createdAt),
      templates,
      assets,
      datasets,
      graphics: graphics.sort((x, y) => y.createdAt - x.createdAt),
    });
    await upgradeStoredTemplates();
  })();
  return initPromise;
}

// ── zápisy ──────────────────────────────────────────────────

// ── sledování změn pro synchronizaci ──────────────────────────
const changeListeners = new Set<() => void>();
export function onLocalChange(fn: () => void) {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}
const notifyChange = () => changeListeners.forEach((f) => f());

/** Čas poslední změny položky (pro sloučení mezi zařízeními) */
export const modTime = (x: unknown) => ((x as { _mod?: number })?._mod ?? 0);

export async function upsert<K extends CollectionName>(c: K, item: CollectionMap[K], opts?: { remote?: boolean }) {
  const stamped = opts?.remote ? item : ({ ...item, _mod: Date.now() } as CollectionMap[K]);
  const list = state[c] as unknown as CollectionMap[K][];
  const idx = list.findIndex((x) => x.id === stamped.id);
  const next = idx >= 0 ? list.map((x) => (x.id === stamped.id ? stamped : x)) : c === "graphics" ? [stamped, ...list] : [...list, stamped];
  setState({ [c]: next } as Partial<AppState>);
  await adapter?.put(c, stamped);
  if (!opts?.remote) notifyChange();
}

export async function remove(c: CollectionName, id: string, opts?: { remote?: boolean }) {
  const list = state[c] as unknown as { id: string; remoteUrl?: string }[];
  const gone = list.find((x) => x.id === id);
  setState({ [c]: list.filter((x) => x.id !== id) } as Partial<AppState>);
  await adapter?.remove(c, id);
  if (c === "assets" && gone?.remoteUrl && state.settings.sync?.enabled)
    await updateSettings({ pendingBlobDeletes: [...(state.settings.pendingBlobDeletes ?? []), gone.remoteUrl] });
  if (!opts?.remote) {
    await updateSettings({ tombstones: { ...(state.settings.tombstones ?? {}), [`${c}:${id}`]: Date.now() } });
    notifyChange();
  }
}

export async function updateSettings(patch: Partial<Settings>) {
  const s = { ...state.settings, ...patch };
  setState({ settings: s });
  await adapter?.putSettings(s);
}

export async function deleteProject(id: string) {
  for (const c of ["templates", "assets", "datasets", "graphics"] as const) {
    for (const x of (state[c] as { id: string; projectId: string }[]).filter((x) => x.projectId === id)) await remove(c, x.id);
  }
  await remove("projects", id);
  if (state.settings.currentProjectId === id) await updateSettings({ currentProjectId: state.projects[0]?.id });
}

/** Záloha projektu (JSON) – přenos mezi zařízeními, dokud není cloud. */
export function exportProject(projectId: string) {
  const p = state.projects.find((x) => x.id === projectId);
  return {
    app: "presetka",
    version: 1,
    project: p,
    templates: state.templates.filter((t) => t.projectId === projectId),
    assets: state.assets.filter((a) => a.projectId === projectId),
    datasets: state.datasets.filter((d) => d.projectId === projectId),
    graphics: state.graphics.filter((g) => g.projectId === projectId),
  };
}

export async function importProject(json: ReturnType<typeof exportProject>) {
  if (json?.app !== "presetka" || !json.project) throw new Error("Soubor není záloha Presetky.");
  await upsert("projects", json.project);
  for (const t of json.templates ?? []) await upsert("templates", t);
  // šablony ze staré zálohy převést na aktuální verzi
  await upgradeStoredTemplates();
  for (const a of json.assets ?? []) await upsert("assets", a);
  for (const d of json.datasets ?? []) await upsert("datasets", d);
  for (const g of json.graphics ?? []) await upsert("graphics", g);
  await updateSettings({ currentProjectId: json.project.id });
}

/** Převede uložené šablony na aktuální verzi (po startu, po obnově zálohy a po synchronizaci). */
export async function upgradeStoredTemplates() {
  for (const t of getState().templates) {
    const nt = upgradeTemplate(t);
    if (nt) await upsert("templates", nt);
  }
}

// ── selektory ────────────────────────────────────────────────

export function useCurrentProject(): Project | undefined {
  return useApp((s) => s.projects.find((p) => p.id === s.settings.currentProjectId));
}

export function useCurrentUser(): User {
  return useApp((s) => s.settings.users.find((u) => u.id === s.settings.currentUserId) ?? s.settings.users[0]);
}

export function useAssetMap(projectId?: string): Record<string, string> {
  const assets = useApp((s) => s.assets);
  return assetMapFrom(assets, projectId);
}

let lastAssets: Asset[] | null = null;
let lastPid: string | undefined;
let lastMap: Record<string, string> = {};
export function assetMapFrom(assets: Asset[], projectId?: string) {
  if (assets === lastAssets && projectId === lastPid) return lastMap;
  const m: Record<string, string> = {};
  for (const a of assets) if (!projectId || a.projectId === projectId || a.projectId === "shared") m[a.id] = a.dataUrl;
  lastAssets = assets;
  lastPid = projectId;
  lastMap = m;
  return m;
}

export function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export type { Role, Template, Dataset, Graphic, Asset };
