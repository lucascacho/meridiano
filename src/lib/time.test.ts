import assert from "node:assert/strict";
import test from "node:test";
import {
  bestOverlap,
  buildRowCells,
  buildSlots,
  formatClock,
  formatOffset,
  getOffsetMinutes,
  getZonedParts,
  nextDstChange,
  overlapCounts,
  startOfDayUtc,
  todayKey,
  zonedTimeToUtc,
} from "./time.ts";

const MADRID = "Europe/Madrid";
const NY = "America/New_York";
const TOKYO = "Asia/Tokyo";
const KOLKATA = "Asia/Kolkata";

test("winter offsets", () => {
  const madridAfternoon = zonedTimeToUtc(MADRID, 2026, 11, 25, 15, 0);
  assert.equal(getOffsetMinutes(madridAfternoon, MADRID), 60);
  assert.equal(getOffsetMinutes(madridAfternoon, NY), -300);
  assert.equal(getOffsetMinutes(madridAfternoon, TOKYO), 540);
  assert.equal(getOffsetMinutes(madridAfternoon, KOLKATA), 330);
  assert.equal(formatClock(madridAfternoon, MADRID, false), "15:00");
  assert.equal(formatClock(madridAfternoon, NY, false), "09:00");
  assert.equal(formatClock(madridAfternoon, TOKYO, false), "23:00");
  assert.equal(formatClock(madridAfternoon, KOLKATA, false), "19:30");
  assert.equal(formatOffset(330), "UTC+5:30");
  assert.equal(formatOffset(-300), "UTC−5");
});

test("start of day in Madrid winter is previous day 23:00 UTC", () => {
  const start = startOfDayUtc(MADRID, "2026-11-25");
  assert.equal(new Date(start).toISOString(), "2026-11-24T23:00:00.000Z");
  assert.equal(todayKey(MADRID, start), "2026-11-25");
});

test("spring forward skips the missing hour", () => {
  const slots = buildSlots(MADRID, "2026-03-29", 6);
  const labels = buildRowCells({
    slots,
    timeZone: MADRID,
    locale: "es",
    hour12: false,
    workStart: 9,
    workEnd: 18,
    weekend: [0, 6],
  }).map((cell) => cell.hour);
  assert.deepEqual(labels, [0, 1, 3, 4, 5, 6]);
});

test("fall back repeats the ambiguous hour", () => {
  const slots = buildSlots(MADRID, "2026-10-25", 6);
  const cells = buildRowCells({
    slots,
    timeZone: MADRID,
    locale: "es",
    hour12: false,
    workStart: 9,
    workEnd: 18,
    weekend: [0, 6],
  });
  assert.deepEqual(
    cells.map((cell) => cell.hour),
    [0, 1, 2, 2, 3, 4],
  );
  assert.equal(cells[3].offsetMark, "+1");
});

test("aligned slots convert across zones", () => {
  const slots = buildSlots(MADRID, "2026-11-25", 24);
  const madrid = buildRowCells({
    slots,
    timeZone: MADRID,
    locale: "en",
    hour12: false,
    workStart: 9,
    workEnd: 18,
    weekend: [0, 6],
  });
  const ny = buildRowCells({
    slots,
    timeZone: NY,
    locale: "en",
    hour12: false,
    workStart: 9,
    workEnd: 18,
    weekend: [0, 6],
  });
  const at15 = madrid.findIndex((cell) => cell.hour === 15);
  assert.equal(ny[at15].hour, 9);
  assert.equal(madrid[at15].band, "work");
  assert.equal(ny[at15].band, "work");
  assert.equal(madrid[0].band, "night");
});

test("weekend is not a work overlap", () => {
  const slots = buildSlots(MADRID, "2026-11-28", 24);
  const madrid = buildRowCells({
    slots,
    timeZone: MADRID,
    locale: "es",
    hour12: false,
    workStart: 9,
    workEnd: 18,
    weekend: [0, 6],
  });
  assert.equal(getZonedParts(slots[12], MADRID).weekday, 6);
  assert.equal(madrid[12].band, "weekend-work");
});

test("friday is the weekend in Cairo", () => {
  const slots = buildSlots("Africa/Cairo", "2026-11-27", 18);
  const cells = buildRowCells({
    slots,
    timeZone: "Africa/Cairo",
    locale: "en",
    hour12: false,
    workStart: 9,
    workEnd: 18,
    weekend: [5, 6],
  });
  const noon = cells.find((cell) => cell.hour === 12);
  assert.ok(noon);
  assert.equal(noon.band, "weekend-work");
});

test("best overlap is the longest fullest block", () => {
  const slots = buildSlots(MADRID, "2026-11-25", 24);
  const matrix = [MADRID, NY].map((timeZone) =>
    buildRowCells({
      slots,
      timeZone,
      locale: "en",
      hour12: false,
      workStart: 9,
      workEnd: 18,
      weekend: [0, 6],
    }).map((cell) => cell.band === "work"),
  );
  const counts = overlapCounts(matrix);
  const best = bestOverlap(counts);
  assert.ok(best);
  assert.equal(best.count, 2);
  assert.equal(best.end - best.start + 1, 3);
  assert.equal(formatClock(slots[best.start], MADRID, false), "15:00");
});

test("dst warning finds the March transition", () => {
  const from = zonedTimeToUtc(MADRID, 2026, 3, 22, 12, 0);
  const change = nextDstChange(MADRID, from, 10);
  assert.ok(change);
  assert.equal(change.before, 60);
  assert.equal(change.after, 120);
  assert.equal(todayKey(MADRID, change.atMs), "2026-03-29");
});

test("half-hour home zone still lines up", () => {
  const slots = buildSlots(KOLKATA, "2026-11-25", 4);
  const madrid = buildRowCells({
    slots,
    timeZone: MADRID,
    locale: "en",
    hour12: false,
    workStart: 9,
    workEnd: 18,
    weekend: [0, 6],
  });
  assert.equal(madrid[0].minute, 30);
  assert.equal(formatClock(slots[0], KOLKATA, false), "00:00");
});
