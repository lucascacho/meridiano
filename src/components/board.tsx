"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { updateBoard, useBoard, usePrefersDark } from "@/lib/board-store";
import { Moon, Sun, X } from "lucide-react";
import { CitySearch } from "@/components/city-search";
import { DateStrip } from "@/components/date-strip";
import { HourGrid, type RowModel } from "@/components/hour-grid";
import { PlaceDialog } from "@/components/place-dialog";
import { SelectionBar } from "@/components/selection-bar";
import { Button } from "@/components/ui/button";
import { displayName, suggestedCities, type City } from "@/lib/cities";
import { t } from "@/lib/i18n";
import { cityOf } from "@/lib/place";
import {
  applyTheme,
  cityRef,
  MAX_PLACES,
  placeFromCity,
  uniqueUid,
  writeStorage,
  writeUrl,
  type BoardState,
  type Place,
} from "@/lib/settings";
import {
  bestOverlap,
  buildRowCells,
  buildSlots,
  overlapCounts,
  slotIndexAt,
  todayKey,
} from "@/lib/time";

function placeName(place: Place, city: City, locale: BoardState["locale"]) {
  return place.label.trim() || displayName(city, locale);
}

export function Board() {
  const board = useBoard();
  const systemDark = usePrefersDark();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<{ index: number; nonce: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dark = !board || board.theme === "system" ? systemDark : board.theme === "dark";

  useEffect(() => {
    if (!board) return;
    writeStorage(board);
    writeUrl(board);
    document.documentElement.lang = board.locale;
    applyTheme(board.theme);
  }, [board]);

  useEffect(() => {
    if (board?.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [board?.theme]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (event.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const patch = useCallback((recipe: (prev: BoardState) => BoardState) => {
    updateBoard(recipe);
  }, []);

  const homePlace = board?.places.find((place) => place.uid === board.homeUid) ?? board?.places[0];
  const homeCity = homePlace ? cityOf(cityRef(homePlace)) : undefined;
  const homeTz = homeCity?.tz ?? (board ? Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC" : "Etc/UTC");
  const day = board?.day ?? "";
  const locale = board?.locale ?? "es";
  const hour12 = board?.hour12 ?? false;
  const places = board?.places;

  const slots = useMemo(() => (day ? buildSlots(homeTz, day, 48) : []), [day, homeTz]);

  const rows = useMemo<RowModel[]>(() => {
    if (!places) return [];
    return places.flatMap((place) => {
      const city = cityOf(cityRef(place));
      if (!city) return [];
      return [
        {
          place,
          city,
          cells: buildRowCells({
            slots,
            timeZone: city.tz,
            locale,
            hour12,
            workStart: place.workStart,
            workEnd: place.workEnd,
            weekend: city.weekend,
          }),
        },
      ];
    });
  }, [places, slots, locale, hour12]);

  const homeCells = useMemo(() => {
    if (!day || !homeCity) return [];
    return buildRowCells({
      slots,
      timeZone: homeTz,
      locale,
      hour12,
      workStart: homePlace?.workStart ?? 9,
      workEnd: homePlace?.workEnd ?? 18,
      weekend: homeCity.weekend,
    });
  }, [day, homeCity, homePlace, homeTz, slots, locale, hour12]);

  const overlap = useMemo(() => {
    const included = rows.filter((row) => row.place.included);
    const counts = overlapCounts(included.map((row) => row.cells.map((cell) => cell.band === "work")));
    return { counts, total: included.length, best: bestOverlap(counts) };
  }, [rows]);

  const reveal = useCallback((index: number) => {
    setAnchor({ index: Math.max(0, index), nonce: Date.now() });
  }, []);

  const onHover = useCallback((index: number | null) => {
    setHoverIndex((current) => (current === index ? current : index));
  }, []);

  const onClear = useCallback(() => {
    patch((prev) => (prev.selection ? { ...prev, selection: null } : prev));
  }, [patch]);

  const onSelectSpan = useCallback(
    (from: number, to: number) => {
      const start = Math.min(from, to);
      const end = Math.max(from, to);
      const startUtc = slots[start];
      const endSlot = slots[end];
      if (startUtc == null || endSlot == null) return;
      const endUtc = endSlot + 3_600_000;
      const durationMin = Math.max(30, Math.round((endUtc - startUtc) / 60_000));
      patch((prev) => ({ ...prev, durationMin, selection: { startUtc, endUtc } }));
    },
    [patch, slots],
  );

  const onSelectUtc = useCallback(
    (startUtc: number, endUtc: number) => {
      if (endUtc - startUtc < 30 * 60_000) return;
      const durationMin = Math.round((endUtc - startUtc) / 60_000);
      patch((prev) => ({ ...prev, durationMin, selection: { startUtc, endUtc } }));
    },
    [patch],
  );

  const onOpen = useCallback((uid: string) => setEditing(uid), []);

  if (!board) return <BoardSkeleton />;
  const editingPlace = board.places.find((place) => place.uid === editing);
  const editingCity = editingPlace ? cityOf(cityRef(editingPlace)) : undefined;
  const editingIndex = editingPlace ? board.places.findIndex((place) => place.uid === editingPlace.uid) : -1;
  const people = rows.map((row) => ({
    uid: row.place.uid,
    name: placeName(row.place, row.city, locale),
    tz: row.city.tz,
  }));
  const best = overlap.best;
  const homeLabel = homePlace && homeCity ? placeName(homePlace, homeCity, locale) : people[0]?.name ?? "";

  function jumpToday() {
    const today = todayKey(homeTz);
    patch((prev) => ({ ...prev, day: today }));
    const todaySlots = buildSlots(homeTz, today, 48);
    const index = slotIndexAt(todaySlots, Date.now());
    reveal(index >= 0 ? index : 0);
  }

  return (
    <div className="app-shell">
      <header className="shrink-0 border-b bg-card px-3 pt-[max(0.45rem,env(safe-area-inset-top))] pb-2 md:px-5">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex items-center gap-2">
            <Mark />
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-2xl leading-none font-medium italic tracking-tight sm:text-[1.7rem]">Meridiano</h1>
              <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{t(locale, "tagline")}</p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <div className="seg" role="group" aria-label="12 24">
                <button type="button" aria-pressed={!board.hour12} onClick={() => patch((prev) => ({ ...prev, hour12: false }))}>
                  24h
                </button>
                <button type="button" aria-pressed={board.hour12} onClick={() => patch((prev) => ({ ...prev, hour12: true }))}>
                  12h
                </button>
              </div>
              <div className="seg" role="group" aria-label="ES EN">
                <button type="button" aria-pressed={locale === "es"} onClick={() => patch((prev) => ({ ...prev, locale: "es" }))}>
                  ES
                </button>
                <button type="button" aria-pressed={locale === "en"} onClick={() => patch((prev) => ({ ...prev, locale: "en" }))}>
                  EN
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 rounded-full"
                aria-label={dark ? t(locale, "themeToLight") : t(locale, "themeToDark")}
                onClick={() => patch((prev) => ({ ...prev, theme: dark ? "light" : "dark" }))}
              >
                {dark ? <Sun /> : <Moon />}
              </Button>
            </div>
          </div>

          <CitySearch
            locale={locale}
            full={board.places.length >= MAX_PLACES}
            existing={board.places.map((place) => place.cityId)}
            inputRef={searchRef}
            onAdd={(city) => {
              patch((prev) => {
                if (prev.places.length >= MAX_PLACES) return prev;
                const used = new Set(prev.places.map((place) => place.uid));
                return { ...prev, places: [...prev.places, placeFromCity(city, uniqueUid(city.id, used))] };
              });
            }}
          />

          {!board.hintDismissed && (
            <div className="hint-banner mt-2 items-start gap-2 rounded-2xl bg-background px-3 py-1.5 text-xs leading-5">
              <p className="min-w-0 flex-1">{t(locale, "hint")}</p>
              <button type="button" className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-muted" aria-label={t(locale, "dismiss")} onClick={() => patch((prev) => ({ ...prev, hintDismissed: true }))}>
                <X className="size-4" />
              </button>
            </div>
          )}

          {board.selection ? (
            <SelectionBar board={board} people={people} />
          ) : (
            <DateStrip
              day={board.day}
              homeTz={homeTz}
              locale={locale}
              onDay={(next) => {
                setAnchor(null);
                patch((prev) => ({ ...prev, day: next }));
              }}
              onNow={jumpToday}
            />
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <Legend swatch="work" label={t(locale, "legendWork")} />
            <Legend swatch="shoulder" label={t(locale, "legendAwake")} />
            <Legend swatch="night" label={t(locale, "legendNight")} />
            <Legend swatch="weekend-day" label={t(locale, "legendWeekend")} />
            {best && (
              <Button
                type="button"
                size="sm"
                className="ml-auto h-8 rounded-full"
                onClick={() => {
                  onSelectSpan(best.start, best.end);
                  reveal(best.start);
                }}
              >
                {t(locale, "useGap")}
              </Button>
            )}
          </div>
        </div>
      </header>

      {rows.length === 0 || !homePlace || !homeCity ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-4 px-6">
          <div>
            <h2 className="font-display text-3xl italic">{t(locale, "emptyTitle")}</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t(locale, "emptyBody")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedCities().map((city) => (
              <Button key={city.id} type="button" variant="outline" className="h-10 rounded-full" onClick={() => patch((prev) => ({ ...prev, places: [placeFromCity(city)], homeUid: city.id }))}>
                {displayName(city, locale)}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <HourGrid
          rows={rows}
          homeCells={homeCells}
          homeName={homeLabel}
          homeUid={homePlace.uid}
          homeTz={homeTz}
          day={board.day}
          slots={slots}
          counts={overlap.counts}
          total={overlap.total}
          locale={locale}
          hour12={board.hour12}
          hoverIndex={hoverIndex}
          selection={board.selection}
          anchor={anchor}
          onHover={onHover}
          onSelectSpan={onSelectSpan}
          onSelectUtc={onSelectUtc}
          onClear={onClear}
          onOpen={onOpen}
        />
      )}

      {editingPlace && editingCity && (
        <PlaceDialog
          place={editingPlace}
          city={editingCity}
          locale={locale}
          hour12={board.hour12}
          isHome={editingPlace.uid === board.homeUid}
          canUp={editingIndex > 0}
          canDown={editingIndex >= 0 && editingIndex < board.places.length - 1}
          onClose={() => setEditing(null)}
          onChange={(next) =>
            patch((prev) => ({
              ...prev,
              places: prev.places.map((place) => {
                if (place.uid !== editingPlace.uid) return place;
                const merged = { ...place, ...next };
                if (merged.workEnd <= merged.workStart) merged.workEnd = Math.min(23, merged.workStart + 1);
                return merged;
              }),
            }))
          }
          onHome={() => patch((prev) => ({ ...prev, homeUid: editingPlace.uid }))}
          onDuplicate={() =>
            patch((prev) => {
              if (prev.places.length >= MAX_PLACES) return prev;
              const used = new Set(prev.places.map((place) => place.uid));
              const copy = { ...editingPlace, uid: uniqueUid(editingPlace.cityId, used) };
              const next = [...prev.places];
              next.splice(editingIndex + 1, 0, copy);
              return { ...prev, places: next };
            })
          }
          onMove={(direction) =>
            patch((prev) => {
              const index = prev.places.findIndex((place) => place.uid === editingPlace.uid);
              const target = index + direction;
              if (index < 0 || target < 0 || target >= prev.places.length) return prev;
              const next = [...prev.places];
              const [item] = next.splice(index, 1);
              next.splice(target, 0, item);
              return { ...prev, places: next };
            })
          }
          onRemove={() => {
            setEditing(null);
            patch((prev) => {
              const places = prev.places.filter((place) => place.uid !== editingPlace.uid);
              const homeUid = places.some((place) => place.uid === prev.homeUid) ? prev.homeUid : places[0]?.uid ?? prev.homeUid;
              return { ...prev, places, homeUid };
            });
          }}
        />
      )}
      <p className="sr-only">{t(locale, "footer")}</p>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className="legend-swatch" data-band={swatch} />
      {label}
    </span>
  );
}

function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0 text-foreground">
      <rect width="28" height="28" rx="9" fill="currentColor" />
      <path d="M6 18c2.4-6 13.6-6 16 0" fill="none" stroke="#f3e39a" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="14" cy="11" r="2.2" fill="#e36a3a" />
    </svg>
  );
}

function BoardSkeleton() {
  return (
    <div className="app-shell">
      <div className="border-b px-4 py-4">
        <div className="h-7 w-36 animate-pulse rounded-full bg-muted" />
        <div className="mt-4 h-11 animate-pulse rounded-full bg-muted" />
        <div className="mt-3 flex gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="size-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-2 p-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
