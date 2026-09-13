import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, isSameDay, isSameMonth, startOfDay, startOfMonth } from "date-fns";
import { WasteIcon } from "@/components/waste-icon";
import {
  allUpcoming,
  buildMonthGrid,
  dayNumber,
  longDate,
  monthTitle,
  weekdayLong,
  weekdayShort,
} from "@/lib/dates";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CalendarView() {
  const lang = useAppStore((s) => s.lang);
  const collections = useAppStore((s) => s.collections);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const events = useMemo(() => allUpcoming(collections), [collections]);
  const byDay = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const row of events) {
      const key = row.iso;
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const grid = buildMonthGrid(cursor);
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2026, 5, 1 + i); // Monday 1 Jun 2026
    return weekdayShort(d, lang);
  });

  const monthEvents = events.filter((row) => isSameMonth(row.date, cursor));
  const laterEvents = events.filter((row) => row.date >= addMonths(startOfMonth(cursor), 1)).slice(0, 8);

  return (
    <div className="px-5 pt-6 pb-28">
      <p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">
        {t(lang, "brand")}
      </p>
      <h1 className="font-display mt-1 text-3xl leading-tight font-semibold tracking-tight text-ink">
        {t(lang, "calendarTitle")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t(lang, "calendarSubtitle")}</p>

      <div className="mt-5 rounded-2xl bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg text-ink hover:bg-surface-2"
            onClick={() => setCursor((d) => addMonths(d, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="font-display text-lg font-semibold capitalize">{monthTitle(cursor, lang)}</p>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg text-ink hover:bg-surface-2"
            onClick={() => setCursor((d) => addMonths(d, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold tracking-wide text-faint uppercase">
          {weekdays.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((day, index) => {
            if (!day) return <span key={`e-${index}`} />;
            const key = day.toISOString().slice(0, 10);
            const marks = byDay.get(
              `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
            );
            const today = isSameDay(day, startOfDay(new Date()));
            return (
              <div
                key={key}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center rounded-md text-sm",
                  today && "bg-primary-soft font-semibold text-primary",
                )}
              >
                {dayNumber(day)}
                {marks && marks.length > 0 ? (
                  <span className="mt-0.5 flex gap-0.5">
                    {marks.slice(0, 3).map((mark) => (
                      <span
                        key={mark.collection.id + mark.iso}
                        className={cn(
                          "size-1 rounded-full",
                          mark.collection.wasteType === "mixed" && "bg-mixed",
                          mark.collection.wasteType === "paper" && "bg-paper",
                          mark.collection.wasteType === "glass" && "bg-glass",
                          mark.collection.wasteType === "organic" && "bg-organic",
                        )}
                      />
                    ))}
                  </span>
                ) : (
                  <span className="mt-0.5 h-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {collections.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-surface px-6 py-10 text-center shadow-card">
          <p className="font-display text-xl font-semibold">{t(lang, "calendarTitle")}</p>
          <p className="mt-2 text-sm text-muted">{t(lang, "calendarEmpty")}</p>
        </div>
      ) : (
        <>
          <h2 className="mt-7 font-display text-xl font-semibold tracking-tight">
            {t(lang, "thisMonth")}
          </h2>
          <EventList rows={monthEvents} />
          {laterEvents.length > 0 ? (
            <>
              <h2 className="mt-7 font-display text-xl font-semibold tracking-tight">
                {t(lang, "later")}
              </h2>
              <EventList rows={laterEvents} />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

function EventList({
  rows,
}: {
  rows: ReturnType<typeof allUpcoming>;
}) {
  const lang = useAppStore((s) => s.lang);
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-muted">{t(lang, "calendarEmpty")}</p>;
  }
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={`${row.collection.id}-${row.iso}`}
          className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-card"
        >
          <div className="flex size-12 flex-col items-center justify-center rounded-lg bg-primary-soft">
            <span className="text-lg font-semibold text-primary tabular-nums">
              {dayNumber(row.date)}
            </span>
          </div>
          <WasteIcon type={row.collection.wasteType} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink">
              {lang === "lt" ? row.collection.titleLt : row.collection.title}
            </p>
            <p className="text-xs text-muted capitalize">{weekdayLong(row.date, lang)}</p>
            <p className="truncate text-xs text-faint">{longDate(row.date, lang)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
