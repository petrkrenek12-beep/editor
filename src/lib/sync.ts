"use client";
// ─────────────────────────────────────────────────────────────
// Synchronizace mezi zařízeními (PC ↔ mobil) přes Vercel Blob.
// Každé zařízení drží data lokálně (funguje i offline) a při změně
// je sloučí se stavem v cloudu: u každé položky vyhrává novější úprava.
// Fotky a fonty se nahrávají zvlášť, jen jednou.
// ─────────────────────────────────────────────────────────────
import { useSyncExternalStore } from "react";
import { HAS_SERVER } from "./runtime";
import { getState, modTime, onLocalChange, remove, updateSettings, upsert } from "./store";
import type { CollectionName } from "./storage";
import type { Asset, Dataset, Graphic, Project, Template } from "./types";
import { dataUrlToBlob, fileToDataUrl } from "./images";
import { defaultBrand } from "./demo/seed";

type AssetMeta = Omit<Asset, "dataUrl">;

interface RemoteState {
  app: "presetka";
  v: 1;
  savedAt: number;
  device: string;
  projects: Project[];
  templates: Template[];
  datasets: Dataset[];
  graphics: Graphic[];
  assets: AssetMeta[];
  tombstones: Record<string, number>;
}

export type SyncStatus = { state: "off" | "idle" | "syncing" | "error" | "unavailable"; message?: string; lastSync?: number; progress?: string };

let status: SyncStatus = { state: "off" };
const ls = new Set<() => void>();
function setStatus(s: Partial<SyncStatus>) {
  status = { ...status, ...s };
  ls.forEach((l) => l());
}
export function useSyncStatus() {
  return useSyncExternalStore(
    (cb) => {
      ls.add(cb);
      return () => ls.delete(cb);
    },
    () => status,
    () => status,
  );
}

let serverInfo: { blob: boolean; password: boolean; access: "public" | "private" } | null = null;
export async function syncServerInfo() {
  if (!HAS_SERVER) return null;
  if (serverInfo) return serverInfo;
  try {
    const r = await fetch("/api/sync?op=status", { cache: "no-store" });
    serverInfo = await r.json();
  } catch {
    serverInfo = null;
  }
  return serverInfo;
}

const deviceId = (() => {
  try {
    let d = localStorage.getItem("presetka-device");
    if (!d) {
      d = Math.random().toString(36).slice(2, 10);
      localStorage.setItem("presetka-device", d);
    }
    return d;
  } catch {
    return "dev";
  }
})();

function key() {
  return getState().settings.sync?.key ?? "";
}

async function readBlob(url: string): Promise<Response> {
  const info = await syncServerInfo();
  const r =
    info?.access === "private"
      ? await fetch(`/api/sync?op=get&url=${encodeURIComponent(url)}`, { headers: { "x-presetka-key": key() }, cache: "no-store" })
      : await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Stažení ze cloudu selhalo (${r.status}).`);
  return r;
}

async function uploadBlob(path: string, body: Blob | string, contentType: string): Promise<string> {
  const { upload } = await import("@vercel/blob/client");
  const info = await syncServerInfo();
  try {
    const res = await upload(path, body, {
      access: info?.access ?? "public",
      handleUploadUrl: "/api/sync/upload",
      clientPayload: key(),
      contentType,
      multipart: typeof body !== "string" && body.size > 8 * 1024 * 1024,
    });
    return res.url;
  } catch (e) {
    const m = (e as Error).message || "";
    if (/private|public|access/i.test(m)) throw new Error("Úložiště Vercel Blob má jiný typ přístupu. Ve Vercelu nastavte BLOB_ACCESS=private (nebo public) a nasaďte znovu.");
    throw e;
  }
}

// ── sloučení ─────────────────────────────────────────────────

const SEED_IDS = /^(p-nbl|p-repre)(-(logo|bg0|program|results|standings|roster))?$/;
const DEFAULT_BRAND = JSON.stringify(defaultBrand().colors);

/** Čas úpravy pro sloučení. Starší data bez časové značky: nedotčené demo = 0, upravené = 1. */
function effTime(x: Record<string, unknown>): number {
  if (typeof x._mod === "number") return x._mod;
  if (x.builtIn) return 0;
  const id = String(x.id);
  if (SEED_IDS.test(id)) {
    const brand = x.brand as { colors?: unknown } | undefined;
    if (brand) return JSON.stringify(brand.colors) === DEFAULT_BRAND || id === "p-repre" ? 0 : 1;
    return 0;
  }
  return Number(x.updatedAt ?? x.createdAt ?? 0);
}

function mergeList<T extends { id: string }>(c: CollectionName, local: T[], remote: T[], tomb: Record<string, number>, firstSync: boolean) {
  const out = new Map<string, T>();
  for (const x of local) out.set(x.id, x);
  for (const r of remote) {
    const l = out.get(r.id);
    if (!l) out.set(r.id, r);
    else {
      const lt = effTime(l as unknown as Record<string, unknown>);
      const rt = effTime(r as unknown as Record<string, unknown>);
      // první synchronizace zařízení: ve shodě vyhrává cloud (výchozí demo data nepřepíšou úpravy z jiného zařízení)
      // ve shodě vyhrává cloud → všechna zařízení skončí se stejnými daty
      if (rt >= lt || (firstSync && lt === 0)) out.set(r.id, r);
    }
  }
  for (const [id, x] of out) {
    const t = tomb[`${c}:${id}`];
    if (t && t >= effTime(x as unknown as Record<string, unknown>)) out.delete(id);
  }
  return [...out.values()];
}

let running: Promise<void> | null = null;
let again = false;

export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = doSync()
    .catch((e) => setStatus({ state: "error", message: (e as Error).message, progress: undefined }))
    .finally(() => {
      running = null;
      if (again) {
        again = false;
        void syncNow();
      }
    });
  return running;
}

async function doSync() {
  const st = getState();
  const cfg = st.settings.sync;
  if (!HAS_SERVER || !cfg?.enabled) return;
  const info = await syncServerInfo();
  if (!info?.blob || !info.password) {
    setStatus({ state: "unavailable", message: !info?.blob ? "Ve Vercelu chybí úložiště Blob." : "Ve Vercelu chybí APP_PASSWORD." });
    return;
  }
  setStatus({ state: "syncing", message: undefined, progress: "Načítám z cloudu…" });

  // 1) poslední stav v cloudu
  const lr = await fetch("/api/sync?op=latest", { headers: { "x-presetka-key": key() }, cache: "no-store" });
  if (lr.status === 401) throw new Error("Špatné heslo pro synchronizaci.");
  if (!lr.ok) throw new Error(await lr.text());
  const latest = (await lr.json()) as { url: string } | null;
  let remote: RemoteState | null = null;
  if (latest?.url) {
    if (latest.url === cfg.lastRemote && cfg.lastSync) {
      remote = null; // nic nového – jen případně nahrajeme své změny
    } else remote = (await (await readBlob(latest.url)).json()) as RemoteState;
  }
  const firstSync = !cfg.lastSync;

  // 2) sloučení
  const tomb = { ...(st.settings.tombstones ?? {}) };
  if (remote) for (const [k, t] of Object.entries(remote.tombstones ?? {})) tomb[k] = Math.max(tomb[k] ?? 0, t);
  const localAssetMeta: AssetMeta[] = st.assets.filter((a) => a.projectId !== "shared").map(({ dataUrl: _d, ...m }) => m);
  const merged = {
    projects: mergeList("projects", st.projects, remote?.projects ?? [], tomb, firstSync),
    templates: mergeList("templates", st.templates, remote?.templates ?? [], tomb, firstSync),
    datasets: mergeList("datasets", st.datasets, remote?.datasets ?? [], tomb, firstSync),
    graphics: mergeList("graphics", st.graphics, remote?.graphics ?? [], tomb, firstSync),
    assets: mergeList("assets", localAssetMeta as Asset[], (remote?.assets ?? []) as Asset[], tomb, firstSync) as unknown as AssetMeta[],
  };

  // 3) stáhnout chybějící obrázky a fonty
  const localAssets = new Map(getState().assets.map((a) => [a.id, a]));
  const missing = merged.assets.filter((m) => !localAssets.has(m.id) && m.remoteUrl);
  let i = 0;
  for (const m of missing) {
    setStatus({ progress: `Stahuji obrázky ${++i}/${missing.length}…` });
    try {
      const blob = await (await readBlob(m.remoteUrl!)).blob();
      await upsert("assets", { ...(m as Asset), dataUrl: await fileToDataUrl(blob) }, { remote: true });
    } catch (e) {
      console.warn("Asset se nepodařilo stáhnout", m.id, e);
    }
  }

  // 4) aplikovat sloučený stav lokálně
  for (const c of ["projects", "templates", "datasets", "graphics"] as const) {
    const cur = new Map((getState()[c] as { id: string }[]).map((x) => [x.id, x]));
    const next = merged[c] as { id: string }[];
    for (const x of next) if (cur.get(x.id) !== x) await upsert(c, x as never, { remote: true });
    const ids = new Set(next.map((x) => x.id));
    for (const id of cur.keys()) if (!ids.has(id)) await remove(c, id, { remote: true });
  }
  // převzít cloudové adresy u obrázků, které už máme (nenahrávat je znovu)
  const remoteMeta = new Map(merged.assets.map((m) => [m.id, m]));
  for (const a of getState().assets) {
    const m = remoteMeta.get(a.id);
    if (!m) continue;
    const { dataUrl: _d, ...meta } = a;
    if (JSON.stringify(meta) !== JSON.stringify({ ...meta, ...m })) await upsert("assets", { ...a, ...m, dataUrl: a.dataUrl } as Asset, { remote: true });
  }
  for (const a of getState().assets) {
    if (a.projectId === "shared") continue;
    const t = tomb[`assets:${a.id}`];
    if (t && t >= modTime(a)) await remove("assets", a.id, { remote: true });
  }

  // 5) nahrát vlastní obrázky, které v cloudu ještě nejsou
  const toUpload = getState().assets.filter((a) => a.projectId !== "shared" && !a.remoteUrl && !(tomb[`assets:${a.id}`] >= modTime(a)));
  i = 0;
  for (const a of toUpload) {
    setStatus({ progress: `Nahrávám obrázky ${++i}/${toUpload.length}…` });
    const blob = await dataUrlToBlob(a.dataUrl);
    const ext = a.kind === "font" ? "font" : (blob.type.split("/")[1] ?? "bin").replace("jpeg", "jpg");
    const url = await uploadBlob(`presetka/assets/${a.id}.${ext}`, blob, blob.type || "application/octet-stream");
    await upsert("assets", { ...a, remoteUrl: url }, { remote: true });
  }

  // 6) uložit nový stav do cloudu, pokud se liší
  const s2 = getState();
  const snapshot: RemoteState = {
    app: "presetka",
    v: 1,
    savedAt: Date.now(),
    device: deviceId,
    projects: s2.projects,
    templates: s2.templates,
    datasets: s2.datasets,
    graphics: s2.graphics,
    assets: s2.assets.filter((a) => a.projectId !== "shared").map(({ dataUrl: _d, ...m }) => m),
    tombstones: tomb,
  };
  const byId = <T extends { id: string }>(l: T[]) => [...l].sort((a, b) => (a.id < b.id ? -1 : 1));
  const strip = (x: RemoteState | null) =>
    x ? JSON.stringify([byId(x.projects), byId(x.templates), byId(x.datasets), byId(x.graphics), byId(x.assets as Asset[]), Object.keys(x.tombstones ?? {}).sort().map((k) => [k, x.tombstones[k]])]) : "";
  let remoteUrl = latest?.url;
  const unchanged = remote ? strip(remote) === strip(snapshot) : latest?.url && cfg.lastRemote === latest.url && !dirty;
  if (!unchanged || !latest) {
    setStatus({ progress: "Ukládám do cloudu…" });
    remoteUrl = await uploadBlob(`presetka/state/${Date.now()}-${deviceId}.json`, JSON.stringify(snapshot), "application/json");
  }
  dirty = false;
  const now = Date.now();
  await updateSettings({ tombstones: tomb, sync: { ...getState().settings.sync!, lastSync: now, lastRemote: remoteUrl } });
  setStatus({ state: "idle", lastSync: now, progress: undefined, message: undefined });
}

// ── automatika ──────────────────────────────────────────────

let dirty = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

export function startAutoSync() {
  if (started || !HAS_SERVER) return;
  started = true;
  const cfg = getState().settings.sync;
  setStatus({ state: cfg?.enabled ? "idle" : "off", lastSync: cfg?.lastSync });
  onLocalChange(() => {
    if (!getState().settings.sync?.enabled) return;
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), 3000);
  });
  const pull = () => {
    if (document.visibilityState === "visible" && getState().settings.sync?.enabled) void syncNow();
  };
  document.addEventListener("visibilitychange", pull);
  window.addEventListener("focus", pull);
  setInterval(pull, 120_000);
  if (cfg?.enabled) void syncNow();
}

export async function enableSync(password: string) {
  await updateSettings({ sync: { enabled: true, key: password, lastSync: undefined, lastRemote: undefined } });
  setStatus({ state: "idle" });
  await syncNow();
  if (status.state === "error") {
    await updateSettings({ sync: { ...getState().settings.sync!, enabled: false } });
    throw new Error(status.message);
  }
}

export async function disableSync() {
  await updateSettings({ sync: { ...(getState().settings.sync ?? { enabled: false }), enabled: false } });
  setStatus({ state: "off" });
}
