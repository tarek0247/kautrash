import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { backupFile, readBackup, scheduleShareText, vilniusDay, weekPickups } from "./household.ts";
import { addressKey, useAppStore } from "./store.ts";
import type { Collection } from "./types";
const address = {
  district: "Test",
  subDistrict: "",
  city: "Private city",
  street: "Private street",
  houseNumber: "33-2",
};
const collection: Collection = {
  id: "bin1",
  wasteObjectId: 1,
  title: "Mixed waste",
  titleLt: "Mišrios atliekos",
  wasteType: "mixed",
  frequency: "",
  frequencyLt: "",
  address: "Private street 33-2",
  street: "Private street",
  house: "33-2",
  containerCount: 1,
  provider: "ecoservice",
  sourceUrl: "https://ecoservice.lt",
  checkedAt: "2026-10-10",
  dates: ["2026-10-10", "2026-10-10", "2026-10-16", "2026-10-17"].map((iso) => ({
    iso,
    year: 2026,
    month: 10,
    day: Number(iso.slice(-2)),
  })),
};
describe("household schedules", () => {
  it("uses Vilnius date at UTC midnight boundaries and includes seven days once", () => {
    const now = new Date("2026-10-09T22:30:00Z");
    assert.equal(vilniusDay(now), "2026-10-10");
    assert.deepEqual(
      weekPickups([collection], now).map((r) => r.iso),
      ["2026-10-10", "2026-10-16"],
    );
    assert.doesNotMatch(scheduleShareText([collection], "en", now), /Private|33-2|bin1/);
  });
  it("restores dates without trusting file links, tokens, provider claims or date parts", () => {
    const text = backupFile([
      { address, collections: [{ ...collection, subscriptionUrl: "secret" }], reminders: ["bin1"] },
    ]);
    assert.doesNotMatch(text, /sourceUrl|subscriptionUrl|checkedAt|provider|secret/);
    const parsed = JSON.parse(text);
    parsed.schedules[0].collections[0].sourceUrl = "javascript:alert(1)";
    parsed.schedules[0].collections[0].dates[0].year = 2000;
    const backup = readBackup(JSON.stringify(parsed));
    assert.equal(backup.schedules[0]!.collections[0]!.dates[0]!.year, 2026);
    assert.equal("sourceUrl" in backup.schedules[0]!.collections[0]!, false);
    assert.throws(() => readBackup('{"format":"wrong"}'));
    assert.throws(() => readBackup("x".repeat(2_000_001)));
  });
  it("keeps existing homes on restore and preserves labels on schedule refresh", () => {
    useAppStore.setState({
      savedSchedules: [],
      address: null,
      collections: [],
      reminders: [],
      prepared: [],
    });
    useAppStore.getState().setSchedule(address, [collection]);
    const key = addressKey(address);
    useAppStore.getState().labelSchedule(key, "My home");
    useAppStore.getState().setSchedule(address, [collection]);
    const backup = readBackup(
      backupFile([
        { address, collections: [], label: "Wrong", reminders: [] },
        { address: { ...address, houseNumber: "34" }, collections: [collection], reminders: [] },
      ]),
    );
    assert.equal(useAppStore.getState().restoreBackup(backup), 1);
    assert.equal(useAppStore.getState().savedSchedules[0]!.label, "My home");
    assert.equal(useAppStore.getState().collections.length, 1);
    useAppStore.getState().togglePrepared("pickup");
    assert.ok(useAppStore.getState().prepared.includes("pickup"));
    useAppStore.getState().togglePrepared("pickup");
    assert.ok(!useAppStore.getState().prepared.includes("pickup"));
  });
});
