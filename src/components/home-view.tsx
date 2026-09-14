import { Bell, BellOff, CalendarPlus, ChevronRight, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WasteIcon } from "@/components/waste-icon";
import { nextDate, relativeLabel, longDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { WASTE_TYPES } from "@/lib/waste";
import type { Collection, WasteTypeId } from "@/lib/types";

export function HomeView({
  onChangeAddress,
  onOpenGuide,
}: {
  onChangeAddress: () => void;
  onOpenGuide: (id: WasteTypeId) => void;
}) {
  const lang = useAppStore((s) => s.lang);
  const address = useAppStore((s) => s.address);
  const hideAddress = useAppStore((s) => s.hideAddress) !== false;
  const collections = useAppStore((s) => s.collections);
  const refreshing = useAppStore((s) => s.refreshing);
  const reminders = useAppStore((s) => s.reminders);
  const toggleReminder = useAppStore((s) => s.toggleReminder);

  return (
    <div className="px-5 pt-6 pb-28">
      <p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">
        {t(lang, "brand")}
      </p>
      <h1 className="font-display mt-1 text-3xl leading-tight font-semibold tracking-tight text-ink">
        {t(lang, "homeTitle")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t(lang, "homeSubtitle")}</p>

      <section className="mt-6 rounded-2xl bg-surface p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.16em] text-faint uppercase">
            {t(lang, "yourAddress")}
          </p>
          <button
            type="button"
            onClick={onChangeAddress}
            className="rounded-md bg-primary-soft px-3 py-2 text-sm font-semibold text-primary"
          >
            {address ? t(lang, "change") : t(lang, "addAddress")}
          </button>
        </div>
        {address ? (
          hideAddress ? (
            <div className="mt-3 flex items-start gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Lock className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-xl font-semibold tracking-tight text-ink">
                  {t(lang, "addressHidden")}
                </p>
                <p className="mt-1 text-sm text-muted">{t(lang, "addressSavedPrivate")}</p>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-2 font-display text-xl font-semibold tracking-tight text-ink">
                {address.street} {address.houseNumber}
              </p>
              <p className="mt-1 text-sm text-muted">{address.city}</p>
              <p className="text-sm text-muted">
                {[address.subDistrict, address.district].filter(Boolean).join(", ")}
              </p>
            </>
          )
        ) : (
          <p className="mt-2 pr-2 text-sm text-muted">{t(lang, "emptyBody")}</p>
        )}
      </section>

      <h2 className="mt-8 font-display text-xl font-semibold tracking-tight text-ink">
        {t(lang, "collections")}
      </h2>

      {refreshing && collections.length === 0 ? (
        <ul className="mt-3 flex flex-col gap-3">
          {[0, 1, 2].map((key) => (
            <li key={key} className="h-24 animate-pulse rounded-2xl bg-surface shadow-card" />
          ))}
        </ul>
      ) : collections.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-surface px-6 py-10 text-center shadow-card">
          <EyeOff className="mx-auto size-8 text-primary" strokeWidth={1.5} />
          <p className="mt-3 font-display text-xl font-semibold text-ink">{t(lang, "emptyTitle")}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t(lang, "emptyBody")}</p>
          <Button className="mt-5" onClick={onChangeAddress}>
            {t(lang, "addAddress")}
          </Button>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {collections.map((item) => (
            <CollectionCard
              key={item.id}
              item={item}
              reminded={reminders.includes(item.id)}
              onToggle={() => {
                toggleReminder(item.id);
                toast.success(
                  reminders.includes(item.id) ? t(lang, "reminderOff") : t(lang, "reminderOn"),
                );
              }}
            />
          ))}
        </ul>
      )}

      <h2 className="mt-8 font-display text-xl font-semibold tracking-tight text-ink">
        {t(lang, "wasteGuide")}
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {WASTE_TYPES.map((type) => (
          <li key={type.id}>
            <button
              type="button"
              onClick={() => onOpenGuide(type.id)}
              className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-surface px-3 py-3 text-left shadow-card"
            >
              <WasteIcon type={type.id} />
              <span className="flex-1 font-medium text-ink">
                {lang === "lt" ? type.nameLt : type.nameEn}
              </span>
              <ChevronRight className="size-5 text-faint" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CollectionCard({
  item,
  reminded,
  onToggle,
}: {
  item: Collection;
  reminded: boolean;
  onToggle: () => void;
}) {
  const lang = useAppStore((s) => s.lang);
  const next = nextDate(item.dates);
  const title = lang === "lt" ? item.titleLt : item.title;
  const frequency = lang === "lt" ? item.frequencyLt : item.frequency;

  return (
    <li className="rounded-2xl bg-surface p-3 shadow-card">
      <div className="flex items-center gap-3">
        <WasteIcon type={item.wasteType} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-sm text-muted">{frequency}</p>
          {next ? (
            <p className="mt-1 text-sm font-semibold text-primary">
              {relativeLabel(next.date, lang, t(lang, "inDays"))}
              <span className="font-medium text-muted"> · {longDate(next.date, lang)}</span>
            </p>
          ) : null}
          {item.containerCount > 1 ? (
            <p className="mt-1 text-xs text-faint">
              {t(lang, "containers", { n: item.containerCount })}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex size-11 items-center justify-center rounded-lg bg-surface-2 text-primary"
          aria-label={reminded ? t(lang, "reminderOn") : t(lang, "reminderOff")}
        >
          {reminded ? <Bell className="size-4" /> : <BellOff className="size-4" />}
        </button>
      </div>
      {item.subscriptionUrl ? (
        <a
          href={item.subscriptionUrl}
          className="mt-2 inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-primary"
        >
          <CalendarPlus className="size-4" />
          {t(lang, "addToCalendar")}
        </a>
      ) : null}
    </li>
  );
}
