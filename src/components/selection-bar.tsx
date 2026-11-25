"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { boardQuery, type BoardState } from "@/lib/settings";
import { buildIcs, downloadIcs, formatRange, googleCalendarUrl, whatsAppUrl } from "@/lib/share";
import type { Locale } from "@/lib/time";

type Person = { uid: string; name: string; tz: string };

export function SelectionBar({
  board,
  people,
}: {
  board: BoardState;
  people: Person[];
}) {
  const locale: Locale = board.locale;
  const hour12 = board.hour12;
  const [copied, setCopied] = useState<"text" | "link" | null>(null);
  const title = board.title.trim() || t(locale, "callTitle");
  const selected = board.selection;
  const chips = selected
    ? people.map((person) => ({
        name: person.name,
        text: formatRange(selected.startUtc, selected.endUtc, person.tz, hour12, locale),
      }))
    : [];

  function shareText() {
    const url = `${window.location.origin}${window.location.pathname}?${boardQuery(board)}`;
    const body = [title, "", ...chips.map((chip) => `${chip.name}: ${chip.text}`), "", url].join("\n");
    return { url, body, details: chips.map((chip) => `${chip.name}: ${chip.text}`).join("\n") };
  }

  async function write(kind: "text" | "link") {
    const payload = shareText();
    try {
      await navigator.clipboard.writeText(kind === "link" ? payload.url : payload.body);
      setCopied(kind);
    } catch {
      setCopied(null);
    }
    window.setTimeout(() => setCopied(null), 1800);
  }

  function calendar() {
    if (!selected) return;
    const payload = shareText();
    window.open(googleCalendarUrl(title, selected.startUtc, selected.endUtc, payload.details), "_blank", "noopener,noreferrer");
  }

  function ics() {
    if (!selected) return;
    const payload = shareText();
    downloadIcs("meridiano.ics", buildIcs(title, selected.startUtc, selected.endUtc, payload.details));
  }

  if (!selected) return null;

  return (
    <div className="mt-2 flex gap-1.5 overflow-x-auto">
      <Button type="button" className="h-9 shrink-0 rounded-full px-3" onClick={() => write("text")}>
        {copied === "text" ? t(locale, "copied") : t(locale, "copy")}
      </Button>
      <a
        className="inline-flex h-9 shrink-0 items-center rounded-full border border-border bg-background px-3 text-sm font-medium"
        href={whatsAppUrl(shareText().body)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t(locale, "whatsapp")}
      </a>
      <Button type="button" variant="outline" className="h-9 shrink-0 rounded-full px-3" onClick={calendar}>
        {t(locale, "calendar")}
      </Button>
      <Button type="button" variant="outline" className="h-9 shrink-0 rounded-full px-3" onClick={ics}>
        {t(locale, "ics")}
      </Button>
      <Button type="button" variant="outline" className="h-9 shrink-0 rounded-full px-3" onClick={() => write("link")}>
        {copied === "link" ? t(locale, "copied") : t(locale, "linkLabel")}
      </Button>
    </div>
  );
}
