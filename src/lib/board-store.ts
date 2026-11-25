"use client";

import { useSyncExternalStore } from "react";
import { loadBoard, type BoardState } from "@/lib/settings";

let current: BoardState | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function snapshot() {
  current ??= loadBoard();
  return current;
}

export function useBoard() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot,
    () => null,
  );
}

export function updateBoard(recipe: (prev: BoardState) => BoardState) {
  const next = recipe(snapshot());
  if (next === current) return;
  current = next;
  emit();
}

export function usePrefersDark() {
  return useSyncExternalStore(
    (listener) => {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    },
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
}
