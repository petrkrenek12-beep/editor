"use client";
import { useSyncExternalStore } from "react";

// Jednoduchý router nad #hash (funguje na Vercelu i v artefaktu)
function read() {
  if (typeof location === "undefined") return "/";
  const h = location.hash.replace(/^#/, "");
  return h.startsWith("/") ? h : "/";
}

let current = read();
const ls = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    const n = read();
    if (n !== current) {
      current = n;
      ls.forEach((l) => l());
    }
  });
}

export function navigate(path: string) {
  current = path;
  try {
    if (location.hash !== "#" + path) history.pushState(null, "", "#" + path);
  } catch {
    /* v sandboxu nemusí jít – nevadí, router drží stav v paměti */
  }
  ls.forEach((l) => l());
  try {
    window.scrollTo({ top: 0 });
  } catch {
    /* */
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    current = read();
    ls.forEach((l) => l());
  });
}

export function useRoute() {
  const path = useSyncExternalStore(
    (cb) => {
      ls.add(cb);
      return () => ls.delete(cb);
    },
    () => current,
    () => "/",
  );
  const [pathname, query = ""] = path.split("?");
  const parts = pathname.split("/").filter(Boolean);
  return { path, parts, query: new URLSearchParams(query) };
}
