import raw from "@/data/cities.json";
import type { Locale } from "@/lib/time";

export type City = {
  id: string;
  name: string;
  nameEs: string;
  country: string;
  tz: string;
  aliases: string[];
  weekend: number[];
  popular: boolean;
  primary: boolean;
  continent: string;
};

type RawCity = {
  id: string;
  name: string;
  nameEs?: string;
  country: string;
  tz: string;
  aliases?: string[];
  weekend?: number[];
  popular?: boolean;
  primary?: boolean;
  continent?: string;
};

const zoneAlias = raw.zoneAlias as Record<string, string>;

function inflate(city: RawCity): City {
  return {
    id: city.id,
    name: city.name,
    nameEs: city.nameEs ?? city.name,
    country: city.country,
    tz: city.tz,
    aliases: city.aliases ?? [],
    weekend: city.weekend ?? [0, 6],
    popular: Boolean(city.popular),
    primary: Boolean(city.primary),
    continent: city.continent ?? "",
  };
}

export const cities: City[] = (raw.cities as RawCity[]).map(inflate);

const byId = new Map(cities.map((city) => [city.id, city]));
const byZone = new Map<string, City[]>();
for (const city of cities) {
  const list = byZone.get(city.tz) ?? [];
  list.push(city);
  byZone.set(city.tz, list);
}

const remembered = new Map<string, City>();

export function resolveZone(timeZone: string) {
  return zoneAlias[timeZone] ?? timeZone;
}

export function getCity(id: string) {
  return byId.get(id) ?? remembered.get(id);
}

export function rememberCity(city: City) {
  if (!byId.has(city.id)) remembered.set(city.id, city);
  return city;
}

function zoneLabel(timeZone: string) {
  return timeZone.split("/").pop()?.replaceAll("_", " ") ?? timeZone;
}

export function cityForZone(timeZone: string): City {
  const canonical = resolveZone(timeZone);
  const list = byZone.get(canonical);
  if (list?.length) return list.find((city) => city.primary) ?? list.find((city) => city.popular) ?? list[0];
  const label = zoneLabel(timeZone);
  return rememberCity({
    id: `zone-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    name: label,
    nameEs: label,
    country: "",
    tz: timeZone,
    aliases: [timeZone.toLowerCase()],
    weekend: [0, 6],
    popular: false,
    primary: false,
    continent: "",
  });
}

export function displayName(city: City, locale: Locale) {
  return locale === "es" ? city.nameEs : city.name;
}

const regionNames: Record<Locale, Intl.DisplayNames> = {
  es: new Intl.DisplayNames(["es"], { type: "region" }),
  en: new Intl.DisplayNames(["en"], { type: "region" }),
};

export function countryName(code: string, locale: Locale) {
  if (!code) return locale === "es" ? "Tiempo universal" : "Universal time";
  try {
    return regionNames[locale].of(code) ?? code;
  } catch {
    return code;
  }
}

export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

type Indexed = City & {
  hay: string;
  nameN: string;
  nameEsN: string;
  countryEs: string;
  countryEn: string;
};

const index: Indexed[] = cities.map((city) => {
  const countryEs = city.country ? normalize(countryName(city.country, "es")) : "utc";
  const countryEn = city.country ? normalize(countryName(city.country, "en")) : "utc";
  const hay = [city.name, city.nameEs, city.tz, city.id, countryEs, countryEn, ...city.aliases]
    .map((part) => normalize(part))
    .join(" ");
  return { ...city, hay, countryEs, countryEn, nameN: normalize(city.name), nameEsN: normalize(city.nameEs) };
});

const SUGGESTED = [
  "madrid-es",
  "mexico-city-mx",
  "new-york-city-us",
  "buenos-aires-ar",
  "bogota-co",
  "sao-paulo-br",
  "london-gb",
  "tokyo-jp",
];

export function suggestedCities() {
  return SUGGESTED.map((id) => byId.get(id)).filter((city): city is City => Boolean(city));
}

export function searchCities(query: string, limit = 8): City[] {
  const q = normalize(query);
  if (!q) return suggestedCities().slice(0, limit);
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: { city: City; score: number }[] = [];
  for (const city of index) {
    let score = 0;
    if (city.nameN === q || city.nameEsN === q) score = 100;
    else if (city.nameN.startsWith(q) || city.nameEsN.startsWith(q)) score = 82;
    else if (city.aliases.some((alias) => normalize(alias) === q)) score = 74;
    else if (
      city.nameN.split(/[^a-z0-9]+/).some((word) => word.startsWith(q)) ||
      city.nameEsN.split(/[^a-z0-9]+/).some((word) => word.startsWith(q))
    ) {
      score = 66;
    } else if (city.countryEs.startsWith(q) || city.countryEn.startsWith(q) || normalize(city.tz).includes(q)) {
      score = 50;
    } else if (tokens.every((token) => city.hay.includes(token))) score = 36;
    else continue;
    if (city.popular) score += 5;
    scored.push({ city, score });
  }
  scored.sort((a, b) => b.score - a.score || a.city.name.localeCompare(b.city.name, "en"));
  return scored.slice(0, limit).map((item) => item.city);
}
