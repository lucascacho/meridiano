export type Locale = "es" | "en";

export type Band =
  | "night"
  | "shoulder"
  | "work"
  | "weekend-day"
  | "weekend-night"
  | "weekend-work";

export type Cell = {
  utcMs: number;
  hour: number;
  minute: number;
  weekday: number;
  dayKey: string;
  label: string;
  showDate: boolean;
  dateLabel: string;
  dow: string;
  dom: string;
  band: Band;
  offset: number;
  offsetMark: string | null;
};

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(key: string, locale: string, options: Intl.DateTimeFormatOptions) {
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, fmt);
  }
  return fmt;
}

export function localeTag(locale: Locale) {
  return locale === "es" ? "es-ES" : "en-US";
}

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

export function getZonedParts(ms: number, timeZone: string): ZonedParts {
  const fmt = formatter(`parts|${timeZone}`, "en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(new Date(ms))) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  let day = Number(bag.day);
  let month = Number(bag.month);
  let year = Number(bag.year);
  if (hour === 24) {
    hour = 0;
    const rolled = new Date(Date.UTC(year, month - 1, day));
    rolled.setUTCDate(rolled.getUTCDate() + 1);
    year = rolled.getUTCFullYear();
    month = rolled.getUTCMonth() + 1;
    day = rolled.getUTCDate();
  }
  return {
    year,
    month,
    day,
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday: WEEKDAYS[bag.weekday] ?? 0,
  };
}

export function getOffsetMinutes(ms: number, timeZone: string) {
  const parts = getZonedParts(ms, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return Math.round((asUtc - ms) / 60000);
}

export function zonedTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
) {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i += 1) {
    const parts = getZonedParts(utc, timeZone);
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
    const diff = desired - asUtc;
    utc += diff;
    if (diff === 0) break;
  }
  return utc;
}

export function dayKeyFromParts(parts: ZonedParts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function todayKey(timeZone: string, now = Date.now()) {
  return dayKeyFromParts(getZonedParts(now, timeZone));
}

export function parseDayKey(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return { year, month, date };
}

export function addDaysKey(timeZone: string, day: string, delta: number) {
  const { year, month, date } = parseDayKey(day);
  const noon = zonedTimeToUtc(timeZone, year, month, date, 12, 0);
  return todayKey(timeZone, noon + delta * 86_400_000);
}

export function startOfDayUtc(timeZone: string, day: string) {
  const { year, month, date } = parseDayKey(day);
  return zonedTimeToUtc(timeZone, year, month, date, 0, 0);
}

export function buildSlots(timeZone: string, day: string, count = 48) {
  const start = startOfDayUtc(timeZone, day);
  return Array.from({ length: count }, (_, index) => start + index * 3_600_000);
}

export function formatOffset(minutes: number) {
  const sign = minutes >= 0 ? "+" : "−";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (mins === 0) return `UTC${sign}${hours}`;
  return `UTC${sign}${hours}:${String(mins).padStart(2, "0")}`;
}

export function formatShortOffset(minutes: number) {
  const sign = minutes >= 0 ? "+" : "−";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (mins === 0) return `${sign}${hours}`;
  return `${sign}${hours}:${String(mins).padStart(2, "0")}`;
}

export function zoneAbbrev(ms: number, timeZone: string) {
  const fmt = formatter(`abbr|${timeZone}`, "en-US", {
    timeZone,
    timeZoneName: "short",
  });
  const name = fmt.formatToParts(new Date(ms)).find((part) => part.type === "timeZoneName")?.value;
  if (!name || /^GMT|UTC/.test(name)) return formatOffset(getOffsetMinutes(ms, timeZone));
  return name;
}

export function formatClock(ms: number, timeZone: string, hour12: boolean) {
  const parts = getZonedParts(ms, timeZone);
  const minute = String(parts.minute).padStart(2, "0");
  if (!hour12) return `${String(parts.hour).padStart(2, "0")}:${minute}`;
  const hour = parts.hour % 12 || 12;
  const suffix = parts.hour < 12 ? "am" : "pm";
  return `${hour}:${minute} ${suffix}`;
}

export function formatHourLabel(hour: number, minute: number, hour12: boolean) {
  if (!hour12) {
    return minute === 0 ? String(hour) : `${hour}:${String(minute).padStart(2, "0")}`;
  }
  const h = hour % 12 || 12;
  const suffix = hour < 12 ? "a" : "p";
  return minute === 0 ? `${h}${suffix}` : `${h}:${String(minute).padStart(2, "0")}${suffix}`;
}

export function formatLongDate(ms: number, timeZone: string, locale: Locale) {
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(ms));
}

export function formatDayChip(day: string, timeZone: string, locale: Locale) {
  const { year, month, date } = parseDayKey(day);
  const ms = zonedTimeToUtc(timeZone, year, month, date, 12, 0);
  const weekday = new Intl.DateTimeFormat(localeTag(locale), {
    timeZone,
    weekday: "short",
  })
    .format(new Date(ms))
    .replace(/\.$/, "");
  return { weekday, day: String(date) };
}

function bandFor(
  hour: number,
  minute: number,
  weekday: number,
  workStart: number,
  workEnd: number,
  weekend: number[],
): Band {
  const mins = hour * 60 + minute;
  const isWeekend = weekend.includes(weekday);
  const inWork = mins >= workStart * 60 && mins < workEnd * 60;
  const awake = mins >= 7 * 60 && mins < 21 * 60;
  if (inWork && isWeekend) return "weekend-work";
  if (inWork) return "work";
  if (awake && isWeekend) return "weekend-day";
  if (awake) return "shoulder";
  if (isWeekend) return "weekend-night";
  return "night";
}

export function buildRowCells({
  slots,
  timeZone,
  locale,
  hour12,
  workStart,
  workEnd,
  weekend,
}: {
  slots: number[];
  timeZone: string;
  locale: Locale;
  hour12: boolean;
  workStart: number;
  workEnd: number;
  weekend: number[];
}): Cell[] {
  const dateFmt = new Intl.DateTimeFormat(localeTag(locale), {
    timeZone,
    weekday: "short",
    day: "numeric",
  });
  let previousDay = "";
  let previousOffset: number | null = null;
  return slots.map((utcMs) => {
    const parts = getZonedParts(utcMs, timeZone);
    const dayKey = dayKeyFromParts(parts);
    const offset = getOffsetMinutes(utcMs, timeZone);
    const showDate = dayKey !== previousDay;
    const offsetChanged = previousOffset !== null && offset !== previousOffset;
    const dateParts = dateFmt.formatToParts(new Date(utcMs));
    const dow = dateParts.find((part) => part.type === "weekday")?.value.replace(/\.$/, "") ?? "";
    const dom = dateParts.find((part) => part.type === "day")?.value ?? String(parts.day);
    previousDay = dayKey;
    previousOffset = offset;
    return {
      utcMs,
      hour: parts.hour,
      minute: parts.minute,
      weekday: parts.weekday,
      dayKey,
      label: formatHourLabel(parts.hour, parts.minute, hour12),
      showDate,
      dateLabel: showDate ? `${dow} ${dom}` : "",
      dow,
      dom,
      band: bandFor(parts.hour, parts.minute, parts.weekday, workStart, workEnd, weekend),
      offset,
      offsetMark: offsetChanged || parts.minute !== 0 ? formatShortOffset(offset) : null,
    };
  });
}

export function nextDstChange(timeZone: string, fromMs: number, days = 8) {
  const startOff = getOffsetMinutes(fromMs, timeZone);
  const end = fromMs + days * 86_400_000;
  const step = 3 * 3_600_000;
  let prevT = fromMs;
  let prevOff = startOff;
  for (let t = fromMs + step; t <= end; t += step) {
    const off = getOffsetMinutes(t, timeZone);
    if (off !== prevOff) {
      let lo = prevT;
      let hi = t;
      while (hi - lo > 60_000) {
        const mid = Math.floor((lo + hi) / 2);
        if (getOffsetMinutes(mid, timeZone) === prevOff) lo = mid;
        else hi = mid;
      }
      return { atMs: hi, before: prevOff, after: off };
    }
    prevT = t;
    prevOff = off;
  }
  return null;
}

export function overlapCounts(workRows: boolean[][]) {
  if (workRows.length === 0) return [];
  const counts = new Array(workRows[0].length).fill(0);
  for (const row of workRows) {
    for (let index = 0; index < row.length; index += 1) {
      if (row[index]) counts[index] += 1;
    }
  }
  return counts as number[];
}

export function bestOverlap(counts: number[]) {
  let best: { start: number; end: number; count: number } | null = null;
  let index = 0;
  while (index < counts.length) {
    const count = counts[index];
    if (count < 2) {
      index += 1;
      continue;
    }
    let end = index;
    while (end + 1 < counts.length && counts[end + 1] === count) end += 1;
    if (
      !best ||
      count > best.count ||
      (count === best.count && end - index > best.end - best.start)
    ) {
      best = { start: index, end, count };
    }
    index = end + 1;
  }
  return best;
}

export function slotIndexAt(slots: number[], ms: number) {
  if (ms < slots[0] || ms >= slots[slots.length - 1] + 3_600_000) return -1;
  return Math.floor((ms - slots[0]) / 3_600_000);
}
