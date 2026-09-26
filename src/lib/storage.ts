// ─────────────────────────────────────────────────────────────
// Úložiště. MVP ukládá vše lokálně v prohlížeči (IndexedDB).
// Rozhraní StorageAdapter je připravené pro pozdější napojení
// na Supabase/Postgres – stačí dopsat SupabaseAdapter se stejnými metodami.
// ─────────────────────────────────────────────────────────────
import { createStore, get, set, del, values, type UseStore } from "idb-keyval";
import type { Asset, Dataset, Graphic, Project, Settings, Template } from "./types";

export type CollectionName = "projects" | "templates" | "assets" | "datasets" | "graphics";

export interface CollectionMap {
  projects: Project;
  templates: Template;
  assets: Asset;
  datasets: Dataset;
  graphics: Graphic;
}

export interface StorageAdapter {
  list<K extends CollectionName>(c: K): Promise<CollectionMap[K][]>;
  put<K extends CollectionName>(c: K, item: CollectionMap[K]): Promise<void>;
  remove(c: CollectionName, id: string): Promise<void>;
  getSettings(): Promise<Settings | undefined>;
  putSettings(s: Settings): Promise<void>;
}

/** Záloha pro prostředí bez IndexedDB (anonymní okno apod.) – data jen do zavření stránky. */
class MemoryAdapter implements StorageAdapter {
  private data: Record<string, Map<string, unknown>> = {};
  private settings?: Settings;
  private col(c: string) {
    return (this.data[c] ??= new Map());
  }
  async list<K extends CollectionName>(c: K) {
    return [...this.col(c).values()] as CollectionMap[K][];
  }
  async put<K extends CollectionName>(c: K, item: CollectionMap[K]) {
    this.col(c).set(item.id, item);
  }
  async remove(c: CollectionName, id: string) {
    this.col(c).delete(id);
  }
  async getSettings() {
    return this.settings;
  }
  async putSettings(s: Settings) {
    this.settings = s;
  }
}

class IndexedDbAdapter implements StorageAdapter {
  private stores = new Map<string, UseStore>();
  private store(name: string) {
    let s = this.stores.get(name);
    if (!s) {
      s = createStore(`presetka-${name}`, name);
      this.stores.set(name, s);
    }
    return s;
  }
  async list<K extends CollectionName>(c: K) {
    return (await values(this.store(c))) as CollectionMap[K][];
  }
  async put<K extends CollectionName>(c: K, item: CollectionMap[K]) {
    await set(item.id, item, this.store(c));
  }
  async remove(c: CollectionName, id: string) {
    await del(id, this.store(c));
  }
  async getSettings() {
    return (await get("settings", this.store("settings"))) as Settings | undefined;
  }
  async putSettings(s: Settings) {
    await set("settings", s, this.store("settings"));
  }
}

export async function createAdapter(): Promise<{ adapter: StorageAdapter; persistent: boolean }> {
  try {
    if (typeof indexedDB === "undefined") throw new Error("no idb");
    const a = new IndexedDbAdapter();
    await a.getSettings(); // ověří, že IndexedDB funguje
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* nevadí */
    }
    return { adapter: a, persistent: true };
  } catch {
    return { adapter: new MemoryAdapter(), persistent: false };
  }
}
