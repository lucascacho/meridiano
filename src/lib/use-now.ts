"use client";

import { useEffect, useState } from "react";

const listeners = new Set<(now: number) => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let current = 0;

function subscribe(listener: (now: number) => void) {
  listeners.add(listener);
  if (timer == null) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      listeners.forEach((fn) => fn(current));
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer != null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => subscribe(setNow), []);
  return now;
}
