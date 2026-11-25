"use client";

import { countryName, displayName, type City } from "@/lib/cities";
import { t, weekendNames } from "@/lib/i18n";
import type { Place } from "@/lib/settings";
import { formatHourLabel, type Locale } from "@/lib/time";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PRESETS = [
  [8, 17],
  [9, 18],
  [10, 19],
  [9, 17],
] as const;

export function PlaceDialog({
  place,
  city,
  locale,
  hour12,
  isHome,
  canUp,
  canDown,
  onClose,
  onChange,
  onHome,
  onDuplicate,
  onMove,
  onRemove,
}: {
  place: Place;
  city: City;
  locale: Locale;
  hour12: boolean;
  isHome: boolean;
  canUp: boolean;
  canDown: boolean;
  onClose: () => void;
  onChange: (patch: Partial<Place>) => void;
  onHome: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const invalid = place.workEnd <= place.workStart;
  const name = displayName(city, locale);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            {countryName(city.country, locale)} · {city.tz.replaceAll("_", " ")}
          </DialogDescription>
        </DialogHeader>

        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">{t(locale, "rename")}</span>
          <input
            value={place.label}
            placeholder={name}
            maxLength={48}
            className="h-11 rounded-xl border border-input bg-background px-3 text-base"
            onChange={(event) => onChange({ label: event.target.value })}
          />
        </label>

        <div className="grid gap-2">
          <p className="text-sm font-medium">{t(locale, "workHours")}</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(([start, end]) => {
              const active = place.workStart === start && place.workEnd === end;
              return (
                <button
                  key={`${start}-${end}`}
                  type="button"
                  aria-pressed={active}
                  className={`h-9 rounded-full px-3 text-sm ${active ? "bg-foreground text-background" : "bg-muted"}`}
                  onClick={() => onChange({ workStart: start, workEnd: end })}
                >
                  {formatHourLabel(start, 0, hour12)}–{formatHourLabel(end, 0, hour12)}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm">
              <span>{t(locale, "starts")}</span>
              <select
                value={place.workStart}
                className="h-11 rounded-xl border border-input bg-background px-2 text-base"
                onChange={(event) => onChange({ workStart: Number(event.target.value) })}
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {formatHourLabel(hour, 0, hour12)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t(locale, "ends")}</span>
              <select
                value={place.workEnd}
                className="h-11 rounded-xl border border-input bg-background px-2 text-base"
                onChange={(event) => onChange({ workEnd: Number(event.target.value) })}
              >
                {Array.from({ length: 23 }, (_, index) => {
                  const hour = index + 1;
                  return (
                    <option key={hour} value={hour} disabled={hour <= place.workStart}>
                      {formatHourLabel(hour, 0, hour12)}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
          {invalid && <p className="text-sm text-destructive">{t(locale, "invalidHours")}</p>}
          <p className="text-xs text-muted-foreground">{t(locale, "weekendNote", { days: weekendNames(city.weekend, locale) })}</p>
        </div>

        <button
          type="button"
          aria-pressed={place.included}
          className={`flex h-11 items-center justify-between rounded-xl px-3 text-left text-sm ${place.included ? "bg-[var(--tile-work)] text-[var(--tile-work-ink)]" : "bg-muted"}`}
          onClick={() => onChange({ included: !place.included })}
        >
          <span>{t(locale, "included")}</span>
          <span className="font-medium">{place.included ? "●" : "○"}</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-11" disabled={isHome} onClick={onHome}>
            {t(locale, "makeHome")}
          </Button>
          <Button type="button" variant="outline" className="h-11" onClick={onDuplicate}>
            {t(locale, "duplicate")}
          </Button>
          <Button type="button" variant="outline" className="h-11" disabled={!canUp} onClick={() => onMove(-1)}>
            {t(locale, "moveUp")}
          </Button>
          <Button type="button" variant="outline" className="h-11" disabled={!canDown} onClick={() => onMove(1)}>
            {t(locale, "moveDown")}
          </Button>
        </div>
        <Button type="button" variant="destructive" className="h-11" onClick={onRemove}>
          {t(locale, "remove")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
