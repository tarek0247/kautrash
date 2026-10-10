import { z } from "zod";
import type { Address, Collection, Lang } from "./types";
import { validDay } from "./calendar-export.ts";

export function vilniusDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vilnius",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((item) => item.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function pickupKey(addressKey: string, id: string, iso: string) {
  return JSON.stringify([addressKey, id, iso]);
}
export function weekPickups(collections: Collection[], now = new Date()) {
  const start = vilniusDay(now);
  const end = new Date(`${start}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const last = end.toISOString().slice(0, 10);
  return collections
    .flatMap((collection) =>
      [...new Set(collection.dates.map((d) => d.iso))]
        .filter((iso) => validDay(iso) && iso >= start && iso <= last)
        .map((iso) => ({ collection, iso })),
    )
    .sort((a, b) => a.iso.localeCompare(b.iso) || a.collection.id.localeCompare(b.collection.id));
}
export function scheduleShareText(collections: Collection[], lang: Lang, now = new Date()) {
  const title =
    lang === "lt"
      ? "KauTrash · artimiausios 7 dienos"
      : lang === "ru"
        ? "KauTrash · ближайшие 7 дней"
        : "KauTrash · next 7 days";
  return [
    title,
    ...weekPickups(collections, now).map(
      ({ collection, iso }) => `${iso} · ${lang === "lt" ? collection.titleLt : collection.title}`,
    ),
    lang === "lt"
      ? "Patikrinkite tiekėjo grafiką."
      : lang === "ru"
        ? "Сверьте с графиком оператора."
        : "Check against your provider's schedule.",
  ].join("\n");
}
const text = z.string().max(250);
const addressSchema = z.object({
  district: text,
  subDistrict: text,
  city: text,
  street: text,
  houseNumber: z.string().max(40),
});
const daySchema = z.object({
  iso: z.string().refine(validDay),
  year: z.number().int(),
  month: z.number().int(),
  day: z.number().int(),
});
const collectionSchema = z.object({
  id: text.min(1),
  wasteObjectId: z.number(),
  title: text,
  titleLt: text,
  wasteType: z.enum(["mixed", "paper", "glass", "organic", "unspecified"]),
  frequency: text,
  frequencyLt: text,
  address: text,
  street: text,
  house: text,
  containerCount: z.number().int().min(1).max(1000),
  dates: z.array(daySchema).max(2000),
});
const backupSchema = z.object({
  format: z.literal("kautrash-backup"),
  version: z.literal(1),
  schedules: z
    .array(
      z.object({
        address: addressSchema,
        label: z.string().max(60).optional(),
        collections: z.array(collectionSchema).max(50),
        reminders: z.array(text).max(50),
      }),
    )
    .max(30),
});
export type HouseholdBackup = z.infer<typeof backupSchema>;
export function readBackup(raw: string): HouseholdBackup {
  if (raw.length > 2_000_000) throw new Error("Backup is too large.");
  const parsed = backupSchema.parse(JSON.parse(raw));
  // Keep only date values, never trust provenance or links from an imported file.
  for (const schedule of parsed.schedules)
    for (const collection of schedule.collections) {
      collection.dates = [...new Set(collection.dates.map((d) => d.iso))].sort().map((iso) => {
        const [year, month, day] = iso.split("-").map(Number);
        return { iso, year: year!, month: month!, day: day! };
      });
      schedule.reminders = schedule.reminders.filter((id) =>
        schedule.collections.some((c) => c.id === id),
      );
    }
  return parsed;
}
export function backupFile(
  schedules: {
    address: Address;
    collections: Collection[];
    reminders?: string[];
    label?: string;
  }[],
) {
  return JSON.stringify(
    backupSchema.parse({
      format: "kautrash-backup",
      version: 1,
      schedules: schedules.map((s) => ({ ...s, reminders: s.reminders ?? [] })),
    }),
    null,
    2,
  );
}
