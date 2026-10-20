"use client";
import { useSyncExternalStore } from "react";

// Sélection de comparaison : préférence locale au navigateur (aucune donnée sensible).
export const COMPARE_MAX = 3;
const KEY = "od-compare";
const listeners = new Set<() => void>();
let cached: string[] | null = null;

function read(): string[] {
  if (cached) return cached;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cached = Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, COMPARE_MAX) : [];
  } catch {
    cached = [];
  }
  return cached;
}

function write(next: string[]) {
  cached = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Stockage indisponible (navigation privée) : la sélection reste en mémoire pour cette page.
  }
  listeners.forEach((l) => l());
}

const EMPTY: string[] = [];
export function useCompare() {
  const ids = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) { cached = null; l(); }
      };
      window.addEventListener("storage", onStorage);
      return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
    },
    read,
    () => EMPTY,
  );
  return {
    ids,
    has: (slug: string) => ids.includes(slug),
    /** Renvoie false si la limite de trois projets est atteinte. */
    add: (slug: string) => {
      if (ids.includes(slug)) return true;
      if (ids.length >= COMPARE_MAX) return false;
      write([...ids, slug]);
      return true;
    },
    remove: (slug: string) => write(ids.filter((s) => s !== slug)),
    clear: () => write([]),
  };
}
