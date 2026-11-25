import { t, type CopyKey } from "@/lib/i18n";
import { formatClock, formatLongDate, todayKey, type Locale } from "@/lib/time";

export function formatRange(startUtc: number, endUtc: number, timeZone: string, hour12: boolean, locale: Locale) {
  const startDay = todayKey(timeZone, startUtc);
  const endDay = todayKey(timeZone, endUtc - 1);
  const start = formatClock(startUtc, timeZone, hour12);
  const end = formatClock(endUtc, timeZone, hour12);
  if (startDay === endDay) return `${start}–${end}`;
  return `${formatLongDate(startUtc, timeZone, locale)} ${start} → ${formatLongDate(endUtc - 1, timeZone, locale)} ${end}`;
}

export function pointSentence(locale: Locale, rows: { name: string; time: string }[]) {
  if (rows.length === 0) return "";
  const shown = rows.slice(0, 4);
  const extra = rows.length - shown.length;
  const [first, ...rest] = shown;
  const more = extra > 0 ? ` ${t(locale, "andMore", { count: extra })}` : "";
  if (locale === "es") {
    if (rest.length === 0) return `En ${first.name} son las ${first.time}${more}.`;
    const list = rest.map((row) => `${row.time} en ${row.name}`);
    const joined = list.length === 1 ? list[0] : `${list.slice(0, -1).join(", ")} y ${list[list.length - 1]}`;
    return `Cuando en ${first.name} son las ${first.time}, son las ${joined}${more}.`;
  }
  if (rest.length === 0) return `It's ${first.time} in ${first.name}${more}.`;
  const list = rest.map((row) => `${row.time} in ${row.name}`);
  const joined = list.length === 1 ? list[0] : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
  return `When it's ${first.time} in ${first.name}, it's ${joined}${more}.`;
}

export function rangeSentence(locale: Locale, rows: { name: string; range: string }[]) {
  const shown = rows.slice(0, 4);
  const extra = rows.length - shown.length;
  const body = shown.map((row) => `${row.range} · ${row.name}`).join("  ·  ");
  return extra > 0 ? `${body}  ·  ${t(locale, "andMore" as CopyKey, { count: extra })}` : body;
}

function stamp(ms: number) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}

function fold(line: string) {
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    chunks.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

export function googleCalendarUrl(title: string, startUtc: number, endUtc: number, details: string) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${stamp(startUtc)}/${stamp(endUtc)}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcs(title: string, startUtc: number, endUtc: number, details: string) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meridiano//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${stamp(startUtc)}-${stamp(endUtc)}@meridiano`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(startUtc)}`,
    `DTEND:${stamp(endUtc)}`,
    fold(`SUMMARY:${escapeIcs(title)}`),
    fold(`DESCRIPTION:${escapeIcs(details)}`),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function whatsAppUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function downloadIcs(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
