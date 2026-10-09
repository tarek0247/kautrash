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

// Explicit dates only: never guess recurring schedules or waste categories.
export function importDays(text: string): string[] {
  if (text.length > 500_000) throw new Error("File is too large (maximum 500 KB).");
  let values: string[];
  if (text.includes("BEGIN:VCALENDAR")) {
    const unfolded = text.replace(/\r?\n[ \t]/g, "");
    if (/^(RRULE|RDATE|EXDATE|RECURRENCE-ID)[;:]/m.test(unfolded))
      throw new Error("Recurring calendars are not supported. Import explicit dates instead.");
    if (/^DTSTART[^\r\n]*T\d/m.test(unfolded))
      throw new Error("Import all-day collection dates, not timed events.");
    values = [...unfolded.matchAll(/^DTSTART(?:;VALUE=DATE)?:(\d{4})(\d{2})(\d{2})\r?$/gm)].map(
      (m) => `${m[1]}-${m[2]}-${m[3]}`,
    );
    if ((unfolded.match(/^DTSTART[;:]/gm) ?? []).length !== values.length)
      throw new Error("Unsupported date format. Use all-day dates without time zones.");
  } else {
    values = text
      .trim()
      .split(/[\s,;]+/)
      .filter(Boolean);
  }
  if (!values.length || values.length > 1000 || values.some((value) => !validDay(value)))
    throw new Error("Use valid YYYY-MM-DD dates or an all-day ICS file (maximum 1,000 dates).");
  return [...new Set(values)].sort();
}
