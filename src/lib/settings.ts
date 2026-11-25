import { cityForZone } from "@/lib/cities";
import { cityOf, type CityRef } from "@/lib/place";
import { todayKey, type Locale } from "@/lib/time";

export type ThemeChoice = "light" | "dark" | "system";

export type Place = {
  uid: string;
  cityId: string;
  label: string;
  workStart: number;
  workEnd: number;
  included: boolean;
  tz?: string;
  fallbackName?: string;
};

export type Selection = {
  startUtc: number;
  endUtc: number;
};

export type BoardState = {
  places: Place[];
  homeUid: string;
  day: string;
  hour12: boolean;
  locale: Locale;
  theme: ThemeChoice;
  hintDismissed: boolean;
  selection: Selection | null;
  durationMin: number;
  title: string;
};

const STORAGE_KEY = "meridiano-v1";
export const THEME_KEY = "meridiano-theme";
export const MAX_PLACES = 12;

const COMPANIONS: Record<string, string[]> = {
  AF: ["Europe/London", "Europe/Paris", "Asia/Dubai", "America/New_York"],
  EU: ["America/New_York", "America/Mexico_City", "America/Argentina/Buenos_Aires", "Asia/Tokyo"],
  AS: ["Europe/London", "America/New_York", "Asia/Dubai", "Australia/Sydney"],
  OC: ["Asia/Tokyo", "Asia/Singapore", "America/Los_Angeles", "Europe/London"],
  NA: ["Europe/Madrid", "Europe/London", "America/Argentina/Buenos_Aires", "Asia/Tokyo"],
  SA: ["Europe/Madrid", "America/New_York", "America/Mexico_City", "Europe/London"],
};

export function cityRef(place: Place): CityRef {
  return { cityId: place.cityId, tz: place.tz, fallbackName: place.fallbackName };
}

export function placeFromCity(city: { id: string; tz: string; name: string }, uid = city.id): Place {
  const known = city.id.startsWith("zone-");
  return {
    uid,
    cityId: city.id,
    label: "",
    workStart: 9,
    workEnd: 18,
    included: true,
    ...(known ? { tz: city.tz, fallbackName: city.name } : {}),
  };
}

export function uniqueUid(cityId: string, used: Set<string>) {
  if (!used.has(cityId)) return cityId;
  let n = 2;
  while (used.has(`${cityId}~${n}`)) n += 1;
  return `${cityId}~${n}`;
}

function browserLocale(): Locale {
  const lang = navigator.language.toLowerCase();
  return lang.startsWith("es") ? "es" : "en";
}

function browserHour12() {
  return /^en(-us)?$/.test(navigator.language.toLowerCase());
}

export function defaultBoard(): BoardState {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC";
  const homeCity = cityForZone(browserTz);
  const places = [placeFromCity(homeCity)];
  const seen = new Set([homeCity.tz]);
  const companions = COMPANIONS[homeCity.continent] ?? COMPANIONS.EU;
  for (const timeZone of companions) {
    if (places.length >= 5) break;
    const city = cityForZone(timeZone);
    if (seen.has(city.tz)) continue;
    places.push(placeFromCity(city));
    seen.add(city.tz);
  }
  return {
    places,
    homeUid: places[0].uid,
    day: todayKey(homeCity.tz),
    hour12: browserHour12(),
    locale: browserLocale(),
    theme: readTheme(),
    hintDismissed: false,
    selection: null,
    durationMin: 60,
    title: "",
  };
}

function clampHour(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 23) return fallback;
  return n;
}

function sanitizePlace(value: unknown, used: Set<string>): Place | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Place>;
  if (typeof raw.cityId !== "string") return null;
  const city = cityOf({
    cityId: raw.cityId,
    tz: typeof raw.tz === "string" ? raw.tz : undefined,
    fallbackName: typeof raw.fallbackName === "string" ? raw.fallbackName : undefined,
  });
  if (!city) return null;
  const uid = typeof raw.uid === "string" && raw.uid ? raw.uid : uniqueUid(city.id, used);
  if (used.has(uid)) return null;
  used.add(uid);
  const workStart = clampHour(raw.workStart, 9);
  let workEnd = clampHour(raw.workEnd, 18);
  if (workEnd <= workStart) workEnd = Math.min(23, workStart + 1);
  return {
    uid,
    cityId: city.id,
    label: typeof raw.label === "string" ? raw.label.slice(0, 48) : "",
    workStart,
    workEnd,
    included: raw.included !== false,
    ...(city.id.startsWith("zone-") ? { tz: city.tz, fallbackName: city.name } : {}),
  };
}

function readTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    /* ignore */
  }
  return "system";
}

function readStorage(): Partial<BoardState> | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return null;
    const data = JSON.parse(text) as Partial<BoardState>;
    const used = new Set<string>();
    const places = Array.isArray(data.places)
      ? data.places.map((place) => sanitizePlace(place, used)).filter((place): place is Place => Boolean(place)).slice(0, MAX_PLACES)
      : [];
    if (places.length === 0) return null;
    const homeUid = places.some((place) => place.uid === data.homeUid) ? String(data.homeUid) : places[0].uid;
    const durationMin = Number(data.durationMin);
    return {
      places,
      homeUid,
      hour12: Boolean(data.hour12),
      locale: data.locale === "en" ? "en" : "es",
      theme: data.theme === "light" || data.theme === "dark" || data.theme === "system" ? data.theme : readTheme(),
      hintDismissed: Boolean(data.hintDismissed),
      durationMin: durationMin >= 30 && durationMin <= 480 && durationMin % 30 === 0 ? durationMin : 60,
    };
  } catch {
    return null;
  }
}

function readUrl(fallbackDay: string): Partial<BoardState> | null {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("c");
  if (!encoded) return null;
  const used = new Set<string>();
  const places: Place[] = [];
  for (const token of encoded.split(",").filter(Boolean).slice(0, MAX_PLACES)) {
    const city = token.startsWith("tz:") ? cityForZone(token.slice(3)) : cityOf({ cityId: token });
    if (!city) continue;
    const uid = uniqueUid(city.id, used);
    used.add(uid);
    places.push(placeFromCity(city, uid));
  }
  if (places.length === 0) return null;
  const starts = params.get("hs")?.split(",").map(Number) ?? [];
  const ends = params.get("he")?.split(",").map(Number) ?? [];
  if (starts.length === places.length && ends.length === places.length) {
    places.forEach((place, index) => {
      const workStart = clampHour(starts[index], 9);
      const workEnd = clampHour(ends[index], 18);
      if (workEnd > workStart) {
        place.workStart = workStart;
        place.workEnd = workEnd;
      }
    });
  }
  for (const index of (params.get("off") ?? "").split(",").filter(Boolean)) {
    const place = places[Number(index)];
    if (place) place.included = false;
  }
  const homeUid = places.some((place) => place.uid === params.get("home")) ? String(params.get("home")) : places[0].uid;
  const day = params.get("day");
  const safeDay = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : fallbackDay;
  let selection: Selection | null = null;
  const from = Number(params.get("from"));
  const dur = Number(params.get("dur"));
  if (Number.isFinite(from) && from > Date.UTC(2020, 0, 1) && from < Date.UTC(2100, 0, 1) && dur >= 15 && dur <= 24 * 60) {
    selection = { startUtc: from, endUtc: from + dur * 60_000 };
  }
  return { places, homeUid, day: safeDay, selection };
}

export function loadBoard(): BoardState {
  const base = defaultBoard();
  const stored = readStorage();
  const merged: BoardState = { ...base, ...stored, selection: null, title: "" };
  const home = cityOf(cityRef(merged.places.find((place) => place.uid === merged.homeUid) ?? merged.places[0]));
  merged.day = todayKey(home?.tz ?? "Etc/UTC");
  const fromUrl = readUrl(merged.day);
  if (!fromUrl) return merged;
  return { ...merged, ...fromUrl };
}

export function writeStorage(state: BoardState) {
  const payload = {
    places: state.places,
    homeUid: state.homeUid,
    hour12: state.hour12,
    locale: state.locale,
    theme: state.theme,
    hintDismissed: state.hintDismissed,
    durationMin: state.durationMin,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  localStorage.setItem(THEME_KEY, state.theme);
}

export function boardQuery(state: BoardState) {
  const params = new URLSearchParams();
  params.set(
    "c",
    state.places
      .map((place) => (place.cityId.startsWith("zone-") && place.tz ? `tz:${place.tz}` : place.cityId))
      .join(","),
  );
  params.set("home", state.homeUid);
  params.set("day", state.day);
  if (state.places.some((place) => place.workStart !== 9 || place.workEnd !== 18)) {
    params.set("hs", state.places.map((place) => place.workStart).join(","));
    params.set("he", state.places.map((place) => place.workEnd).join(","));
  }
  const off = state.places.map((place, index) => (place.included ? "" : String(index))).filter(Boolean);
  if (off.length) params.set("off", off.join(","));
  if (state.selection) {
    params.set("from", String(state.selection.startUtc));
    params.set("dur", String(Math.round((state.selection.endUtc - state.selection.startUtc) / 60_000)));
  }
  return params.toString();
}

export function writeUrl(state: BoardState) {
  const next = `${window.location.pathname}?${boardQuery(state)}`;
  if (next !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(null, "", next);
  }
}

export function applyTheme(theme: ThemeChoice) {
  const dark =
    theme === "dark" ||
    (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
  return dark;
}
