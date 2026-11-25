import { cityForZone, getCity, rememberCity, type City } from "@/lib/cities";

export type CityRef = {
  cityId: string;
  tz?: string;
  fallbackName?: string;
};

export function cityOf(ref: CityRef): City | undefined {
  const known = getCity(ref.cityId);
  if (known) return known;
  if (!ref.tz) return undefined;
  const fromZone = cityForZone(ref.tz);
  if (!fromZone.id.startsWith("zone-")) return fromZone;
  return rememberCity({
    ...fromZone,
    id: ref.cityId,
    name: ref.fallbackName || fromZone.name,
    nameEs: ref.fallbackName || fromZone.nameEs,
  });
}
