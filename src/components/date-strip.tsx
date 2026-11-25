"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { addDaysKey, formatDayChip, todayKey, type Locale } from "@/lib/time";

export function DateStrip({
  day,
  homeTz,
  locale,
  onDay,
  onNow,
}: {
  day: string;
  homeTz: string;
  locale: Locale;
  onDay: (day: string) => void;
  onNow: () => void;
}) {
  const today = todayKey(homeTz);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const days: string[] = [];
  for (let offset = -1; offset <= 16; offset += 1) days.push(addDaysKey(homeTz, today, offset));
  if (!days.includes(day)) days.push(day);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [day]);

  return (
    <div className="mt-2 flex items-center gap-1">
      <div className="hidden sm:block">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t(locale, "prevDay")}
          onClick={() => onDay(addDaysKey(homeTz, day, -1))}
        >
          <ChevronLeft />
        </Button>
      </div>
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto py-0.5">
        {days.map((item) => {
          const chip = formatDayChip(item, homeTz, locale);
          const selected = item === day;
          const isToday = item === today;
          return (
            <button
              key={item}
              ref={selected ? selectedRef : undefined}
              type="button"
              aria-pressed={selected}
              onClick={() => onDay(item)}
              className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-xs leading-tight ${
                selected ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted"
              }`}
            >
              <span className="capitalize opacity-70">{chip.weekday}</span>
              <span className="font-display text-base leading-none tabular-nums">{chip.day}</span>
              {isToday && <span className={`mt-0.5 size-1 rounded-full ${selected ? "bg-background" : "bg-[var(--terra)]"}`} />}
            </button>
          );
        })}
      </div>
      <div className="hidden sm:block">
        <Button type="button" variant="ghost" size="icon" aria-label={t(locale, "nextDay")} onClick={() => onDay(addDaysKey(homeTz, day, 1))}>
          <ChevronRight />
        </Button>
      </div>
      <Button type="button" variant="outline" className="h-10 shrink-0 rounded-full px-3" onClick={onNow}>
        {t(locale, "now")}
      </Button>
    </div>
  );
}
