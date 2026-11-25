"use client";

import { memo } from "react";
import { t } from "@/lib/i18n";
import { formatClock, formatLongDate, formatOffset, getOffsetMinutes, todayKey, zoneAbbrev, type Locale } from "@/lib/time";
import { useNow } from "@/lib/use-now";

function dayDiff(later: string, earlier: string) {
  const [ay, am, ad] = later.split("-").map(Number);
  const [by, bm, bd] = earlier.split("-").map(Number);
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86_400_000);
}

export const LiveStamp = memo(function LiveStamp({
  timeZone,
  homeTz,
  locale,
  hour12,
}: {
  timeZone: string;
  homeTz: string;
  locale: Locale;
  hour12: boolean;
}) {
  const now = useNow();
  const cityDay = todayKey(timeZone, now);
  const homeDay = todayKey(homeTz, now);
  const diff = dayDiff(cityDay, homeDay);
  const relative =
    diff === 0 ? t(locale, "today") : diff === 1 ? t(locale, "tomorrow") : diff === -1 ? t(locale, "yesterday") : "";
  const date = formatLongDate(now, timeZone, locale);
  const offset = formatOffset(getOffsetMinutes(now, timeZone));
  const abbrev = zoneAbbrev(now, timeZone);

  return (
    <span className="block min-w-0">
      <span className="block font-display text-[1.35rem] leading-none font-medium tabular-nums tracking-tight">
        {formatClock(now, timeZone, hour12)}
      </span>
      <span className="mt-1 block truncate text-[11px] leading-4 text-muted-foreground">
        {relative ? `${relative} · ${date}` : date}
      </span>
      <span className="block truncate text-[11px] leading-4 text-muted-foreground">
        {abbrev === offset ? offset : `${abbrev} · ${offset}`}
      </span>
    </span>
  );
});
