"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { Search } from "lucide-react";
import { displayName, countryName, searchCities, type City } from "@/lib/cities";
import { t } from "@/lib/i18n";
import { formatClock, zoneAbbrev, type Locale } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { Input } from "@/components/ui/input";

export function CitySearch({
  locale,
  full,
  existing,
  inputRef,
  onAdd,
}: {
  locale: Locale;
  full: boolean;
  existing: string[];
  inputRef?: RefObject<HTMLInputElement | null>;
  onAdd: (city: City) => void;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLInputElement>(null);
  const fieldRef = inputRef ?? localRef;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const now = useNow();
  const results = useMemo(() => searchCities(query), [query]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function choose(city: City) {
    if (full) return;
    onAdd(city);
    setQuery("");
    setOpen(false);
    fieldRef.current?.blur();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const city = results[active];
      if (city) choose(city);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative mt-3">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={fieldRef}
        value={query}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={t(locale, "searchPlaceholder")}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="h-11 rounded-full bg-background pl-9 text-base"
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-[46dvh] w-full overflow-auto rounded-2xl bg-popover p-1 shadow-xl ring-1 ring-foreground/10"
        >
          <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {query.trim() ? t(locale, "searchPlaceholder") : t(locale, "suggested")}
          </p>
          {full && <p className="px-3 py-2 text-sm">{t(locale, "maxCities")}</p>}
          {!full && results.length === 0 && <p className="px-3 py-3 text-sm">{t(locale, "searchEmpty")}</p>}
          {!full &&
            results.map((city, index) => {
              const added = existing.includes(city.id);
              return (
                <button
                  key={city.id}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${index === active ? "bg-accent" : "hover:bg-muted"}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(city)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{displayName(city, locale)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {countryName(city.country, locale)} · {zoneAbbrev(now, city.tz)}
                      {added ? ` · ${t(locale, "addAgain")}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-display text-lg tabular-nums">{formatClock(now, city.tz, false)}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
