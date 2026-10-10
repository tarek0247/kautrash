import { useState } from "react";
import { toast } from "sonner";
import { useAppStore, addressKey } from "@/lib/store";
import { calendarFile, downloadText, importDays } from "@/lib/calendar-export";
import { WASTE_TYPES } from "@/lib/waste";
import type { WasteTypeId } from "@/lib/types";
import { scheduleSources } from "@/lib/schedule-sources";

export function ScheduleTools({ onAdd }: { onAdd: () => void }) {
  const state = useAppStore();
  const [kind, setKind] = useState<WasteTypeId>("mixed");
  const [dates, setDates] = useState("");
  const [source, setSource] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const say = (en: string, lt: string, ru: string) =>
    state.lang === "lt" ? lt : state.lang === "ru" ? ru : en;
  const field = "mt-2 w-full rounded-lg border border-line bg-surface p-3 text-sm text-ink";
  const button = "min-h-11 rounded-lg bg-primary-soft px-3 py-2 text-sm font-semibold text-primary";

  function addDates() {
    if (!state.address || !confirmed || !source.trim()) return;
    try {
      const days = importDays(dates);
      const waste = WASTE_TYPES.find((item) => item.id === kind)!;
      state.setSchedule(state.address, [
        ...state.collections,
        {
          id: crypto.randomUUID(),
          wasteObjectId: 0,
          wasteType: kind,
          title: waste.nameEn,
          titleLt: waste.nameLt,
          frequency: `Imported: ${source.trim()}`,
          frequencyLt: `Importuota: ${source.trim()}`,
          address: `${state.address.street} ${state.address.houseNumber}`,
          street: state.address.street,
          house: state.address.houseNumber,
          containerCount: 1,
          dates: days.map((iso) => {
            const [year, month, day] = iso.split("-").map(Number);
            return { iso, year, month, day };
          }),
        },
      ]);
      setDates("");
      setConfirmed(false);
      toast.success(
        say(
          "Dates saved on this device",
          "Datos išsaugotos šiame įrenginyje",
          "Даты сохранены на этом устройстве",
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <details className="mt-4 rounded-xl bg-surface p-4 shadow-card">
      <summary className="cursor-pointer font-semibold text-ink">
        {say("Addresses & schedule tools", "Adresai ir grafikų įrankiai", "Адреса и расписания")}
      </summary>
      <p className="mt-3 text-sm text-muted">
        {say(
          "Search automatically from Home when adding an address. File import below is a backup for operators without a connected source. Saved data stays on this device.",
          "Pridėdami adresą ieškokite automatiškai pradžios lange. Failo importas yra atsarginis būdas neprijungtiems tiekėjams. Duomenys saugomi šiame įrenginyje.",
          "Автопоиск доступен на главной при добавлении адреса. Импорт файла ниже — резерв для неподключённых операторов. Данные хранятся на этом устройстве.",
        )}
      </p>
      <button type="button" className={`${button} mt-3`} onClick={onAdd}>
        {say("Add / edit address", "Pridėti / keisti adresą", "Добавить / изменить адрес")}
      </button>
      <ul className="mt-3 space-y-2">
        {state.savedSchedules.map((item, index) => (
          <li key={item.key} className="flex gap-2">
            <button
              type="button"
              className={`${button} min-w-0 flex-1 truncate`}
              aria-pressed={!!state.address && addressKey(state.address) === item.key}
              onClick={() => state.selectSchedule(item.key)}
            >
              {state.hideAddress
                ? `${say("Address", "Adresas", "Адрес")} ${index + 1}`
                : `${item.address.street} ${item.address.houseNumber}, ${item.address.city}`}
            </button>
            <button
              type="button"
              className={button}
              onClick={() => {
                if (
                  window.confirm(
                    say(
                      "Delete this saved address and its dates?",
                      "Pašalinti šį adresą ir jo datas?",
                      "Удалить адрес и его даты?",
                    ),
                  )
                )
                  state.removeSchedule(item.key);
              }}
            >
              {say("Delete", "Šalinti", "Удалить")}
            </button>
          </li>
        ))}
      </ul>
      {state.address && (
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold text-ink">
            {say(
              "Backup file / manual dates",
              "Atsarginis failas / datos ranka",
              "Резервный файл / даты вручную",
            )}
          </summary>
          <label className="mt-4 block text-sm">
            {say("Waste type", "Atliekų rūšis", "Тип отходов")}
            <select
              className={field}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as WasteTypeId);
                setConfirmed(false);
              }}
            >
              {WASTE_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {state.lang === "lt"
                    ? item.nameLt
                    : state.lang === "ru"
                      ? item.nameRu
                      : item.nameEn}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm">
            {say(
              "Schedule source / document name",
              "Grafiko šaltinis / dokumento pavadinimas",
              "Источник / название документа",
            )}
            <input
              className={field}
              value={source}
              maxLength={200}
              onChange={(e) => setSource(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm">
            {say(
              "Dates (YYYY-MM-DD, one per line)",
              "Datos (YYYY-MM-DD, po vieną eilutėje)",
              "Даты (YYYY-MM-DD, по одной в строке)",
            )}
            <textarea
              className={field}
              rows={4}
              value={dates}
              onChange={(e) => setDates(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm">
            {say(
              "Or import TXT / ICS (recurring dates expand for 2 years)",
              "Arba importuokite TXT / ICS (pasikartojimai išplečiami 2 metams)",
              "Или импортируйте TXT / ICS (повторы раскрываются на 2 года)",
            )}
            <input
              className="mt-2 block w-full text-sm"
              type="file"
              accept=".txt,.ics"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 500_000) throw new Error("Maximum 500 KB");
                  const imported = importDays(await file.text());
                  setDates(imported.join("\n"));
                  setSource((current) => current.trim() || file.name);
                  toast.success(
                    say(
                      `Loaded ${imported.length} collection dates`,
                      `Įkelta datų: ${imported.length}`,
                      `Загружено дат: ${imported.length}`,
                    ),
                  );
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : String(error));
                }
                e.target.value = "";
              }}
            />
          </label>
          <label className="my-3 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            {say(
              "I checked these dates, waste type and address against the provider's schedule.",
              "Patikrinau datas, atliekų rūšį ir adresą pagal tiekėjo grafiką.",
              "Я сверил даты, тип отходов и адрес с расписанием оператора.",
            )}
          </label>
          <button
            type="button"
            disabled={!confirmed || !source.trim() || !dates.trim()}
            className={`${button} disabled:opacity-40`}
            onClick={addDates}
          >
            {say("Save dates", "Išsaugoti datas", "Сохранить даты")}
          </button>
        </details>
      )}
      {state.collections.length > 0 && (
        <button
          type="button"
          className={`${button} mt-3 w-full`}
          onClick={() =>
            downloadText(
              "kautrash.ics",
              calendarFile(state.collections, state.reminders),
              "text/calendar;charset=utf-8",
            )
          }
        >
          {say(
            "Export to Apple / Google Calendar",
            "Eksportuoti į Apple / Google kalendorių",
            "Экспорт в Apple / Google Календарь",
          )}
        </button>
      )}
      <ul className="mt-3 space-y-2">
        {state.collections.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
            <span>
              {state.lang === "lt"
                ? item.titleLt
                : state.lang === "ru"
                  ? (WASTE_TYPES.find((type) => type.id === item.wasteType)?.nameRu ?? item.title)
                  : item.title}{" "}
              ({item.dates.length})
            </span>
            <button
              type="button"
              className={button}
              onClick={() => {
                if (
                  state.address &&
                  window.confirm(
                    say("Delete these saved dates?", "Pašalinti šias datas?", "Удалить эти даты?"),
                  )
                )
                  state.setSchedule(
                    state.address,
                    state.collections.filter((collection) => collection.id !== item.id),
                  );
              }}
            >
              {say("Delete dates", "Šalinti datas", "Удалить даты")}
            </button>
          </li>
        ))}
      </ul>
      {scheduleSources(state.address?.district ?? "").map((provider) => (
        <a
          key={provider.url}
          className="mt-3 block text-sm text-primary underline"
          href={provider.url}
          target="_blank"
          rel="noreferrer"
        >
          {say(
            `Open ${provider.name} schedules${provider.operatorCheck ? " (if your operator)" : ""}`,
            `Atidaryti ${provider.name} grafikus${provider.operatorCheck ? " (jei tai jūsų vežėjas)" : ""}`,
            `Открыть расписания ${provider.name}${provider.operatorCheck ? " (если это ваш оператор)" : ""}`,
          )}
        </a>
      ))}
    </details>
  );
}
