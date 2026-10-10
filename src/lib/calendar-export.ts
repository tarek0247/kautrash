import type { Collection } from "./types";

export function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function fold(line: string) {
  const lines: string[] = [];
  let current = "";
  for (const char of line) {
    if (new TextEncoder().encode(current + char).length > 75) {
      lines.push(current);
      current = " ";
    }
    current += char;
  }
  return [...lines, current].join("\r\n");
}

export function calendarFile(
  collections: Collection[],
  reminders: string[] = [],
  now = new Date(),
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KauTrash//Collection calendar//EN",
    "CALSCALE:GREGORIAN",
  ];
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  for (const item of collections) {
    for (const iso of [...new Set(item.dates.map((date) => date.iso))]) {
      if (!validDay(iso)) continue;
      const end = new Date(`${iso}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${encodeURIComponent(item.id)}-${iso}@kautrash`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${iso.replace(/-/g, "")}`,
        `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replace(/-/g, "")}`,
        `SUMMARY:${escapeText(item.titleLt || item.title)}`,
        "DESCRIPTION:Check dates against your waste provider. Export contains no home address.",
      );
      if (reminders.includes(item.id))
        lines.push(
          "BEGIN:VALARM",
          "TRIGGER:-PT6H",
          "ACTION:DISPLAY",
          "DESCRIPTION:Put bins out for tomorrow",
          "END:VALARM",
        );
      lines.push("END:VEVENT");
    }
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadText(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type IcsEvent = {
  start?: string;
  rule?: string;
  rdates: string[];
  exdates: string[];
};

const weekdayNumbers: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};
const maxDates = 1000;
const recurrenceYears = 2;

function icsDay(value: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (!match) return null;
  const day = `${match[1]}-${match[2]}-${match[3]}`;
  return validDay(day) ? day : null;
}

function asUtcDay(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseRule(rule: string) {
  const values = Object.fromEntries(
    rule.split(";").map((part) => {
      const index = part.indexOf("=");
      return index < 0 ? [part.toUpperCase(), ""] : [part.slice(0, index).toUpperCase(), part.slice(index + 1).toUpperCase()];
    }),
  );
  const freq = values.FREQ;
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq ?? ""))
    throw new Error("This calendar uses a recurrence type KauTrash cannot expand yet.");
  const interval = Number(values.INTERVAL ?? 1);
  const count = values.COUNT === undefined ? undefined : Number(values.COUNT);
  if (!Number.isInteger(interval) || interval < 1 || interval > 366 ||
      (count !== undefined && (!Number.isInteger(count) || count < 1 || count > 10000)))
    throw new Error("This calendar has an invalid repeat interval or count.");
  const untilRaw = values.UNTIL?.slice(0, 8);
  const until = untilRaw ? icsDay(untilRaw) : undefined;
  if (values.UNTIL && !until) throw new Error("This calendar has an unsupported repeat end date.");
  const byDay = values.BYDAY?.split(",").map((day) => {
    const match = /^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(day);
    if (!match || match[1]) throw new Error("This calendar uses an unsupported weekday rule.");
    return weekdayNumbers[match[2]!];
  });
  const byMonthDay = values.BYMONTHDAY?.split(",").map(Number);
  if (byMonthDay?.some((day) => !Number.isInteger(day) || day < 1 || day > 31))
    throw new Error("This calendar uses an unsupported month-day rule.");
  if (freq !== "WEEKLY" && byDay?.length)
    throw new Error("Weekday repeat rules are currently supported for weekly calendars.");
  if (freq === "YEARLY" && (byDay?.length || byMonthDay?.length))
    throw new Error("This yearly calendar uses a repeat rule KauTrash cannot expand yet.");
  return { values, freq, interval, count, until, byDay, byMonthDay };
}

function expandRule(startIso: string, rule: string, now: Date): string[] {
  const parsed = parseRule(rule);
  const start = asUtcDay(startIso);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const horizon = new Date(Date.UTC(today.getUTCFullYear() + recurrenceYears, today.getUTCMonth(), today.getUTCDate()));
  const until = parsed.until ? asUtcDay(parsed.until) : horizon;
  const end = until < horizon ? until : horizon;
  const weekdays = parsed.byDay?.length ? new Set(parsed.byDay) : new Set([start.getUTCDay()]);
  const monthDays = parsed.byMonthDay?.length ? new Set(parsed.byMonthDay) : new Set([start.getUTCDate()]);
  const startWeek = new Date(start);
  startWeek.setUTCDate(startWeek.getUTCDate() - ((startWeek.getUTCDay() + 6) % 7));
  const results: string[] = [];
  let occurrences = 0;
  const cursor = new Date(start);
  let examined = 0;
  while (cursor <= end && examined < 200_000) {
    examined += 1;
    const dayDelta = Math.floor((cursor.getTime() - start.getTime()) / 86_400_000);
    const monthDelta = (cursor.getUTCFullYear() - start.getUTCFullYear()) * 12 + cursor.getUTCMonth() - start.getUTCMonth();
    const matches = parsed.freq === "DAILY"
      ? dayDelta % parsed.interval === 0
      : parsed.freq === "WEEKLY"
        ? Math.floor((cursor.getTime() - startWeek.getTime()) / (7 * 86_400_000)) % parsed.interval === 0 && weekdays.has(cursor.getUTCDay())
        : parsed.freq === "MONTHLY"
          ? monthDelta >= 0 && monthDelta % parsed.interval === 0 && monthDays.has(cursor.getUTCDate())
          : monthDelta >= 0 && monthDelta % (parsed.interval * 12) === 0 && cursor.getUTCMonth() === start.getUTCMonth() && cursor.getUTCDate() === start.getUTCDate();
    if (matches) {
      occurrences += 1;
      if (parsed.count !== undefined && occurrences > parsed.count) break;
      const day = dateKey(cursor);
      if (day >= startIso && day >= dateKey(today)) results.push(day);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (examined >= 200_000) throw new Error("This calendar starts too far in the past to expand safely.");
  return results;
}

// Imports explicit dates and expands supported ICS rules through the next two years.
export function importDays(text: string, now = new Date()): string[] {
  if (text.length > 500_000) throw new Error("File is too large (maximum 500 KB).");
  let values: string[];
  if (text.includes("BEGIN:VCALENDAR")) {
    const unfolded = text.replace(/\r?\n[ \t]/g, "");
    const lines = unfolded.split(/\r?\n/);
    const events: IcsEvent[] = [];
    let event: IcsEvent | null = null;
    for (const line of lines) {
      if (line === "BEGIN:VEVENT") {
        event = { rdates: [], exdates: [] };
        continue;
      }
      if (line === "END:VEVENT") {
        if (event) events.push(event);
        event = null;
        continue;
      }
      if (!event) continue;
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      const name = line.slice(0, colon).split(";")[0]!.toUpperCase();
      const raw = line.slice(colon + 1);
      if (name === "DTSTART") {
        if (!/^\d{8}$/.test(raw)) throw new Error("Import all-day collection dates, not timed events.");
        event.start = icsDay(raw) ?? undefined;
        if (!event.start) throw new Error("The calendar contains an invalid date.");
      } else if (name === "RRULE") {
        event.rule = raw;
      } else if (name === "RDATE" || name === "EXDATE") {
        if (!/^\d{8}(,\d{8})*$/.test(raw)) throw new Error("Import all-day dates, not timed recurrence exceptions.");
        const days = raw.split(",").map((value) => icsDay(value));
        if (days.some((day) => !day)) throw new Error("The calendar contains an invalid date.");
        (name === "RDATE" ? event.rdates : event.exdates).push(...days as string[]);
      }
    }
    values = [];
    for (const item of events) {
      const itemDates: string[] = [];
      if (item.start) {
        if (item.rule) itemDates.push(...expandRule(item.start, item.rule, now));
        else itemDates.push(item.start);
      }
      itemDates.push(...item.rdates);
      const excluded = new Set(item.exdates);
      values.push(...itemDates.filter((day) => !excluded.has(day)));
      if (values.length > maxDates) throw new Error("The calendar expands to more than 1,000 dates. Import a shorter date range.");
    }
  } else {
    values = text.trim().split(/[\s,;]+/).filter(Boolean);
  }
  if (!values.length || values.length > maxDates || values.some((value) => !validDay(value)))
    throw new Error("Use valid YYYY-MM-DD dates or an all-day ICS file (maximum 1,000 dates).");
  return [...new Set(values)].sort();
}
