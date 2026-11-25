"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { displayName, type City } from "@/lib/cities";
import { t } from "@/lib/i18n";
import type { Place } from "@/lib/settings";
import { formatClock, formatLongDate, formatOffset, nextDstChange, slotIndexAt, type Cell, type Locale } from "@/lib/time";
import { LiveStamp } from "@/components/live-stamp";
import { useNow } from "@/lib/use-now";

export type RowModel = {
  place: Place;
  city: City;
  cells: Cell[];
};

type Metrics = { cellLeft: number; stride: number; ruler: number };

function indexFrom(target: EventTarget | null) {
  const element = (target as HTMLElement | null)?.closest?.<HTMLElement>("[data-i]");
  if (!element?.dataset.i) return null;
  const index = Number(element.dataset.i);
  return Number.isFinite(index) ? index : null;
}

export function HourGrid({
  rows,
  homeCells,
  homeName,
  homeUid,
  homeTz,
  day,
  slots,
  counts,
  total,
  locale,
  hour12,
  hoverIndex,
  selection,
  anchor,
  onHover,
  onSelectSpan,
  onSelectUtc,
  onClear,
  onOpen,
}: {
  rows: RowModel[];
  homeCells: Cell[];
  homeName: string;
  homeUid: string;
  homeTz: string;
  day: string;
  slots: number[];
  counts: number[];
  total: number;
  locale: Locale;
  hour12: boolean;
  hoverIndex: number | null;
  selection: { startUtc: number; endUtc: number } | null;
  anchor: { index: number; nonce: number } | null;
  onHover: (index: number | null) => void;
  onSelectSpan: (from: number, to: number) => void;
  onSelectUtc: (startUtc: number, endUtc: number) => void;
  onClear: () => void;
  onOpen: (uid: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<Metrics>({ cellLeft: 148, stride: 46, ruler: 44 });
  const drag = useRef<{ pointerId: number; index: number; half: number; x: number; y: number; moved: boolean; mouse: boolean } | null>(null);
  const resize = useRef<{ pointerId: number; edge: "start" | "end" } | null>(null);

  useLayoutEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const measure = () => {
      const inner = root.querySelector<HTMLElement>(".grid-inner");
      const first = root.querySelector<HTMLElement>('[data-i="0"]');
      const second = root.querySelector<HTMLElement>('[data-i="1"]');
      const ruler = root.querySelector<HTMLElement>(".ruler");
      if (!inner || !first || !second || !ruler) return;
      const innerBox = inner.getBoundingClientRect();
      const firstBox = first.getBoundingClientRect();
      const secondBox = second.getBoundingClientRect();
      setMetrics({
        cellLeft: firstBox.left - innerBox.left,
        stride: Math.max(1, secondBox.left - firstBox.left),
        ruler: ruler.offsetHeight,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [rows.length, slots.length, hour12, locale]);

  useLayoutEffect(() => {
    const root = scrollerRef.current;
    const inner = root?.querySelector<HTMLElement>(".grid-inner");
    const first = root?.querySelector<HTMLElement>('[data-i="0"]');
    const second = root?.querySelector<HTMLElement>('[data-i="1"]');
    if (!root || !inner || !first || !second) return;
    const firstBox = first.getBoundingClientRect();
    const stride = second.getBoundingClientRect().left - firstBox.left;
    const cellLeft = firstBox.left - inner.getBoundingClientRect().left;
    const labelWidth = root.querySelector(".corner")?.getBoundingClientRect().width ?? cellLeft;
    const nowIndex = slotIndexAt(slots, Date.now());
    const index = anchor?.index ?? (nowIndex >= 0 ? nowIndex : 8);
    root.scrollLeft = Math.max(0, cellLeft - labelWidth + Math.max(0, index - 1) * stride);
  }, [anchor, day, slots]);

  const halfMs = 30 * 60_000;

  function halfFromClient(clientX: number) {
    const inner = scrollerRef.current?.querySelector(".grid-inner");
    if (!inner || metrics.stride <= 0 || slots.length === 0) return null;
    const x = clientX - inner.getBoundingClientRect().left - metrics.cellLeft;
    const half = Math.round(x / (metrics.stride / 2));
    return Math.max(0, Math.min(slots.length * 2, half));
  }

  function selectHalves(from: number, to: number) {
    const origin = slots[0];
    if (origin == null) return;
    const cap = slots.length * 2;
    const start = Math.max(0, Math.min(cap - 1, Math.min(from, to)));
    const end = Math.max(start + 1, Math.min(cap, Math.max(from, to)));
    onSelectUtc(origin + start * halfMs, origin + end * halfMs);
  }

  function onHandlePointer(edge: "start" | "end", event: PointerEvent<HTMLButtonElement>, phase: "down" | "move" | "up") {
    event.stopPropagation();
    if (phase === "down") {
      resize.current = { pointerId: event.pointerId, edge };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (!resize.current || resize.current.pointerId !== event.pointerId) return;
    if (phase === "up") {
      resize.current = null;
      return;
    }
    const half = halfFromClient(event.clientX);
    const origin = slots[0];
    if (half == null || origin == null || !selection) return;
    const startHalf = Math.round((selection.startUtc - origin) / halfMs);
    const endHalf = Math.round((selection.endUtc - origin) / halfMs);
    if (edge === "start") selectHalves(Math.min(half, endHalf - 1), endHalf);
    else selectHalves(startHalf, Math.max(half, startHalf + 1));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-ruler], [data-label], [data-handle]")) return;
    const index = indexFrom(event.target);
    const half = halfFromClient(event.clientX);
    if (index == null || half == null || (event.pointerType === "mouse" && event.button !== 0)) return;
    drag.current = {
      pointerId: event.pointerId,
      index,
      half,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      mouse: event.pointerType === "mouse",
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved) {
      if (Math.abs(dx) + Math.abs(dy) < (current.mouse ? 4 : 10)) return;
      if (!current.mouse && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      current.moved = true;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const half = halfFromClient(event.clientX);
    if (half != null) selectHalves(current.half, half);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    if (current.moved) return;
    const travel = Math.abs(event.clientX - current.x) + Math.abs(event.clientY - current.y);
    if (travel > (current.mouse ? 4 : 12)) return;
    const mark = (slots[0] ?? 0) + current.half * halfMs;
    const inside = selection != null && mark >= selection.startUtc && mark < selection.endUtc;
    if (!inside) onClear();
  }

  function onRulerPointer(event: PointerEvent<HTMLDivElement>, phase: "down" | "move" | "up") {
    if (phase === "down") event.stopPropagation();
    if (phase === "up") return;
    const index = indexFrom(document.elementFromPoint(event.clientX, event.clientY));
    if (index != null) onHover(index);
  }

  const hover =
    hoverIndex != null && metrics.stride
      ? { left: metrics.cellLeft + hoverIndex * metrics.stride, width: metrics.stride - 2 }
      : null;
  const range =
    selection && slots.length
      ? {
          left: metrics.cellLeft + ((selection.startUtc - slots[0]) / 3_600_000) * metrics.stride,
          width: ((selection.endUtc - selection.startUtc) / 3_600_000) * metrics.stride,
        }
      : null;

  return (
    <div
      ref={scrollerRef}
      className="grid-scroll"
      tabIndex={0}
      role="grid"
      aria-label={`${t(locale, "gridLabel")}. ${t(locale, "rulerLabel")}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onMouseOver={(event: MouseEvent<HTMLDivElement>) => {
        const index = indexFrom(event.target);
        if (index != null) onHover(index);
      }}
      onMouseLeave={() => onHover(null)}
      onKeyDown={(event) => {
        const current = hoverIndex ?? 0;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          const next = Math.max(0, Math.min(slots.length - 1, current + (event.key === "ArrowRight" ? 1 : -1)));
          onHover(next);
          if (event.shiftKey) onSelectSpan(current, next);
        } else if (event.key === "Enter") {
          event.preventDefault();
          onSelectSpan(current, current);
        } else if (event.key === "Escape") {
          event.preventDefault();
          onClear();
        }
      }}
    >
      <div className="grid-inner">
        <div
          className="ruler"
          data-ruler
          onPointerDown={(event) => onRulerPointer(event, "down")}
          onPointerMove={(event) => onRulerPointer(event, "move")}
          onPointerUp={(event) => onRulerPointer(event, "up")}
        >
          <div className="corner" data-label>
            <span className="meta-pill">{t(locale, "home")}</span>
            <span className="mt-1 block truncate text-sm font-semibold">{homeName}</span>
          </div>
          <div className="hours">
            {homeCells.map((cell, index) => (
              <button key={cell.utcMs} type="button" data-i={index} className={`ruler-cell${cell.showDate ? " is-day-start" : ""}${cell.showDate && index > 0 ? " has-day-line" : ""}`}>
                <span className="ruler-date">
                  {cell.showDate && (
                    <>
                      <span>{cell.dow}</span>
                      <span className="ruler-dom">{cell.dom}</span>
                    </>
                  )}
                </span>
                <span>{cell.label}</span>
                <i className="ruler-band" data-band={cell.band} />
              </button>
            ))}
          </div>
        </div>

        {rows.map((row) => (
          <CityRow
            key={row.place.uid}
            row={row}
            homeTz={homeTz}
            locale={locale}
            hour12={hour12}
            isHome={row.place.uid === homeUid}
            counts={counts}
            total={total}
            selection={selection}
            onOpen={onOpen}
          />
        ))}

        {hover && <div className="hover-wash" style={{ left: hover.left, width: hover.width, top: metrics.ruler }} />}
        {range && range.width > 0 && (
          <>
            <div className="range-wash" style={{ left: range.left, width: range.width, top: metrics.ruler }} />
            <button
              type="button"
              data-handle="start"
              className="range-handle"
              aria-label={t(locale, "earlier")}
              style={{ left: range.left, top: metrics.ruler + 18 }}
              onPointerDown={(event) => onHandlePointer("start", event, "down")}
              onPointerMove={(event) => onHandlePointer("start", event, "move")}
              onPointerUp={(event) => onHandlePointer("start", event, "up")}
            />
            <button
              type="button"
              data-handle="end"
              className="range-handle"
              aria-label={t(locale, "later")}
              style={{ left: range.left + range.width, top: metrics.ruler + 18 }}
              onPointerDown={(event) => onHandlePointer("end", event, "down")}
              onPointerMove={(event) => onHandlePointer("end", event, "move")}
              onPointerUp={(event) => onHandlePointer("end", event, "up")}
            />
          </>
        )}
        <NowLine start={slots[0] ?? 0} end={(slots[slots.length - 1] ?? 0) + 3_600_000} cellLeft={metrics.cellLeft} stride={metrics.stride} top={metrics.ruler} />
      </div>
    </div>
  );
}

const CityRow = memo(function CityRow({
  row,
  homeTz,
  locale,
  hour12,
  isHome,
  counts,
  total,
  selection,
  onOpen,
}: {
  row: RowModel;
  homeTz: string;
  locale: Locale;
  hour12: boolean;
  isHome: boolean;
  counts: number[];
  total: number;
  selection: { startUtc: number; endUtc: number } | null;
  onOpen: (uid: string) => void;
}) {
  const name = row.place.label.trim() || displayName(row.city, locale);
  return (
    <div className="city-row" role="row">
      <button
        type="button"
        data-label
        className={`city-label ${isHome ? "is-home" : ""}`}
        onClick={() => onOpen(row.place.uid)}
      >
        <span className="truncate text-sm font-semibold">{name}</span>
        {selection && (
          <span className="mt-0.5 block truncate text-xs font-semibold tabular-nums">
            {formatClock(selection.startUtc, row.city.tz, hour12)}–{formatClock(selection.endUtc, row.city.tz, hour12)}
          </span>
        )}
        <LiveStamp timeZone={row.city.tz} homeTz={homeTz} locale={locale} hour12={hour12} />
        <span className="mt-1 flex flex-wrap gap-1">
          <DstNote timeZone={row.city.tz} locale={locale} />
          {!row.place.included && <span className="meta-pill">{t(locale, "outside")}</span>}
        </span>
      </button>
      <div className="hours" role="presentation">
        {row.cells.map((cell, index) => {
          const count = counts[index] ?? 0;
          const overlap = total >= 2 && count === total ? "overlap-full" : total >= 2 && count >= 2 && count >= Math.ceil(total * 0.6) ? "overlap-part" : "";
          const pressed = Boolean(selection && cell.utcMs >= selection.startUtc && cell.utcMs < selection.endUtc);
          return (
            <button
              key={cell.utcMs}
              type="button"
              data-i={index}
              data-band={cell.band}
              className={`tile ${overlap}${cell.showDate ? " is-day-start" : ""}${cell.showDate && index > 0 ? " has-day-line" : ""}`}
              aria-pressed={pressed}
              aria-label={`${name}, ${cell.dateLabel || formatLongDate(cell.utcMs, row.city.tz, locale)} ${cell.label}${cell.offsetMark ? ` ${formatOffset(cell.offset)}` : ""}`}
            >
              {cell.showDate && (
                <span className="tile-date">
                  {cell.dow} {cell.dom}
                </span>
              )}
              <span className="tile-hour">{cell.label}</span>
              {cell.offsetMark && <span className="tile-mark">{cell.offsetMark}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
});

function DstNote({ timeZone, locale }: { timeZone: string; locale: Locale }) {
  const now = useNow();
  const bucket = Math.floor(now / 3_600_000);
  const label = useMemo(() => {
    const change = nextDstChange(timeZone, bucket * 3_600_000, 8);
    if (!change) return null;
    return t(locale, "dst", {
      date: formatLongDate(change.atMs, timeZone, locale),
      from: formatOffset(change.before),
      to: formatOffset(change.after),
    });
  }, [timeZone, locale, bucket]);
  if (!label) return null;
  return <span className="dst-pill">{label}</span>;
}

function NowLine({
  start,
  end,
  cellLeft,
  stride,
  top,
}: {
  start: number;
  end: number;
  cellLeft: number;
  stride: number;
  top: number;
}) {
  const now = useNow();
  if (!start || now < start || now > end) return null;
  const left = cellLeft + ((now - start) / 3_600_000) * stride;
  return <div className="now-line" style={{ left, top }} />;
}
