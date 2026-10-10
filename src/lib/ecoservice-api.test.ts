import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeRows,
  matchesAddress,
  providerRegion,
  findEcoserviceSchedule,
} from "./ecoservice-api.server.ts";
const address = {
  district: "Neringos sav.",
  subDistrict: "",
  city: "Neringos m.",
  street: "Alksnynės g.",
  houseNumber: "2",
};
test("municipality aliases match published regions and exclude Vilnius district", () => {
  assert.equal(providerRegion("Biržų r. sav."), "Biržų sav.");
  assert.equal(providerRegion("Klaipėdos m. sav."), "Klaipėdos sav.");
  assert.equal(providerRegion("Šiaulių r. sav."), "Šiaulių sav.");
  assert.equal(providerRegion("Kazlų Rūdos sav."), "Kazlų rudos sav.");
  assert.equal(providerRegion("Vilniaus r. sav."), undefined);
  assert.equal(providerRegion("Kauno r. sav."), undefined);
});
test("street, whole house number and settlement must match", () => {
  assert.ok(matchesAddress("Alksnynės g. 2, Neringos m.", address));
  assert.ok(!matchesAddress("Alksnynės g. 22, Neringos m.", address));
  assert.ok(!matchesAddress("Alksnynės g. 3-3, Neringos m.", { ...address, houseNumber: "33" }));
  assert.ok(!matchesAddress("Alksnynės g. 2, Vilniaus m.", address));
  assert.ok(!matchesAddress("Alksnynės g. 2-1, Neringos m.", address));
  assert.ok(!matchesAddress("Alksnynės g. 2, Neringos m.", { ...address, city: "" }));
});
test("decode dictionary values, repeated columns and null bitmaps", () => {
  assert.deepEqual(
    decodeRows({
      ValueDicts: { D0: ["container"] },
      PH: [
        {
          DM0: [
            { S: [{ N: "G0", DN: "D0" }, { N: "G1" }], C: [0, 1791763200000] },
            { C: [1791936000000], R: 1 },
            { R: 1, Ø: 2 },
          ],
        },
      ],
    }),
    [
      ["container", 1791763200000],
      ["container", 1791936000000],
      ["container", null],
    ],
  );
  assert.deepEqual(decodeRows({ PH: [{ DM0: [{ S: [{ N: "G0" }] }, { G0: "Neringos sav." }] }] }), [
    ["Neringos sav."],
  ]);
});
test("adapter returns genuine source dates with neutral waste type; fails on truncated data", async () => {
  const original = globalThis.fetch;
  let count = 0;
  let truncate = false;
  const day = new Date().toISOString().slice(0, 10);
  globalThis.fetch = (async (input: string | URL | Request) => {
    if (String(input).includes("modelsAndExploration"))
      return Response.json({
        models: [{ id: 1, dbName: "dataset" }],
        exploration: { report: { objectId: "report" } },
      });
    count++;
    const ds =
      count % 2 === 1
        ? {
            IC: !truncate,
            PH: [
              {
                DM0: [
                  {
                    S: [{ N: "G0" }, { N: "G1" }],
                    C: ["Alksnynės g. 2, Neringos m.", "inventory"],
                  },
                ],
              },
            ],
          }
        : {
            IC: true,
            PH: [{ DM0: [{ S: [{ N: "G0" }, { N: "G1" }], C: ["inventory", Date.parse(day)] }] }],
          };
    return Response.json({ results: [{ result: { data: { dsr: { DS: [ds] } } } }] });
  }) as typeof fetch;
  try {
    const rows = await findEcoserviceSchedule(address);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].wasteType, "unspecified");
    assert.equal(rows[0].provider, "ecoservice");
    assert.equal(rows[0].dates[0].iso, day);
    truncate = true;
    await assert.rejects(() => findEcoserviceSchedule(address), /Incomplete/);
  } finally {
    globalThis.fetch = original;
  }
});
