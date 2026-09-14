import { addDays, format, isBefore, isSameDay, startOfDay, startOfMonth } from "date-fns";
import { enUS, lt } from "date-fns/locale";
import type { Lang } from "./types";
import type { Collection, CollectionDate } from "./types";

export function localeOf(lang: Lang) {
  return lang === "lt" ? lt : enUS;
}

export function parseIsoDay(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function upcomingDates(dates: CollectionDate[], from = new Date()) {
  const start = startOfDay(from);
  return dates
    .map((item) => ({ item, date: parseIsoDay(item.iso) }))
    .filter(({ date }) => !isBefore(date, start))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function nextDate(dates: CollectionDate[], from = new Date()) {
  return upcomingDates(dates, from)[0] ?? null;
}

export function relativeLabel(date: Date, lang: Lang, inDaysTemplate: string) {
  const today = startOfDay(new Date());
  if (isSameDay(date, today)) return lang === "lt" ? "Šiandien" : "Today";
  if (isSameDay(date, addDays(today, 1))) return lang === "lt" ? "Rytoj" : "Tomorrow";
  const diff = Math.round((startOfDay(date).getTime() - today.getTime()) / 86400000);
  return inDaysTemplate.replace("{n}", String(diff));
}

export function monthTitle(date: Date, lang: Lang) {
  return format(date, "LLLL yyyy", { locale: localeOf(lang) });
}

export function weekdayShort(date: Date, lang: Lang) {
  return format(date, "EEEEE", { locale: localeOf(lang) });
}

export function weekdayLong(date: Date, lang: Lang) {
  return format(date, "EEEE", { locale: localeOf(lang) });
}

export function dayNumber(date: Date) {
  return format(date, "d");
}

export function longDate(date: Date, lang: Lang) {
  return format(date, "d MMMM yyyy", { locale: localeOf(lang) });
}

export function buildMonthGrid(cursor: Date) {
  const start = startOfMonth(cursor);
  const startWeekday = (start.getDay() + 6) % 7; // Monday first
  const days: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i += 1) days.push(null);
  const count = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= count; d += 1) {
    days.push(new Date(start.getFullYear(), start.getMonth(), d));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

export function allUpcoming(collections: Collection[], from = new Date()) {
  const rows: { collection: Collection; date: Date; iso: string }[] = [];
  for (const collection of collections) {
    for (const { date, item } of upcomingDates(collection.dates, from)) {
      rows.push({ collection, date, iso: item.iso });
    }
  }
  rows.sort((a, b) => a.date.getTime() - b.date.getTime() || a.collection.title.localeCompare(b.collection.title));
  return rows;
}

export function collectionsTomorrow(collections: Collection[]) {
  const tomorrow = addDays(startOfDay(new Date()), 1);
  return collections.filter((collection) =>
    collection.dates.some((item) => isSameDay(parseIsoDay(item.iso), tomorrow)),
  );
}
