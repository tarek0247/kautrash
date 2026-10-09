import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarFile, importDays, validDay } from "./calendar-export.ts";

test("validates calendar days and deduplicates", () => {
  assert.equal(validDay("2026-02-30"), false);
  assert.deepEqual(importDays("2026-12-01\n2026-12-01"), ["2026-12-01"]);
  assert.throws(() => importDays("next Monday"));
});
test("imports all-day ICS but rejects unsupported recurrence and timed events", () => {
  assert.deepEqual(importDays("BEGIN:VCALENDAR\r\nDTSTART;VALUE=DATE:20261201\r\nEND:VCALENDAR"), [
    "2026-12-01",
  ]);
  assert.throws(() => importDays("BEGIN:VCALENDAR\nRRULE:FREQ=WEEKLY\nDTSTART:20261201"));
  assert.throws(() => importDays("BEGIN:VCALENDAR\nDTSTART:20261201T120000Z"));
});
test("exports portable all-day events with next-day end and without addresses", () => {
  const output = calendarFile(
    [
      {
        id: "one",
        title: "Glass",
        titleLt: "Stiklas",
        address: "PRIVATE ADDRESS",
        wasteObjectId: 0,
        wasteType: "glass",
        frequency: "",
        frequencyLt: "",
        street: "",
        house: "",
        containerCount: 1,
        dates: [{ iso: "2026-12-31", year: 2026, month: 12, day: 31 }],
      },
    ],
    ["one"],
    new Date("2026-01-01T00:00:00Z"),
  );
  assert.match(output, /DTEND;VALUE=DATE:20270101/);
  assert.match(output, /BEGIN:VALARM/);
  assert.ok(!output.includes("PRIVATE ADDRESS"));
  assert.match(output, /\r\nEND:VCALENDAR\r\n$/);
});
