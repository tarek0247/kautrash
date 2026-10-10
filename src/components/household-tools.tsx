import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download } from "lucide-react";
import { useAppStore, addressKey } from "@/lib/store";
import {
  backupFile,
  readBackup,
  pickupKey,
  scheduleShareText,
  weekPickups,
  vilniusDay,
  type HouseholdBackup,
} from "@/lib/household";
import { downloadText } from "@/lib/calendar-export";
import { longDate, parseIsoDay } from "@/lib/dates";
import { WasteIcon } from "./waste-icon";

const words = {
  en: {
    week: "Next 7 days",
    ready: "Bin ready",
    prepare: "Mark bin ready",
    none: "No saved pickups in the next 7 days.",
    share: "Copy weekly schedule",
    copied: "Copied without your address",
    offline: "You are offline. Showing saved dates; updates need a connection.",
    name: "Home name",
    home: "Home",
    backup: "Backup & restore",
    privacy:
      "The backup contains your addresses. Keep it private. Restored dates should be checked against the provider.",
    save: "Download backup",
    restore: "Choose backup file",
    preview: "Preview",
    merge: "Add missing homes",
    existing: "Existing homes and dates stay unchanged.",
    invalid: "Invalid backup. Choose a KauTrash JSON backup under 2 MB.",
    count: "homes added",
    expired: "No upcoming saved dates. Refresh or check the official schedule.",
  },
  lt: {
    week: "Artimiausios 7 dienos",
    ready: "Konteineris paruoštas",
    prepare: "Pažymėti kaip paruoštą",
    none: "Per artimiausias 7 dienas išsaugotų išvežimų nėra.",
    share: "Kopijuoti savaitės grafiką",
    copied: "Nukopijuota be jūsų adreso",
    offline: "Nėra ryšio. Rodomos išsaugotos datos; atnaujinimui reikia interneto.",
    name: "Namų pavadinimas",
    home: "Namai",
    backup: "Atsarginė kopija ir atkūrimas",
    privacy:
      "Kopijoje yra jūsų adresai. Saugokite ją privačiai. Atkurtas datas patikrinkite pagal tiekėjo grafiką.",
    save: "Atsisiųsti kopiją",
    restore: "Pasirinkti kopijos failą",
    preview: "Peržiūra",
    merge: "Pridėti trūkstamus namus",
    existing: "Esami adresai ir datos nekeičiami.",
    invalid: "Netinkama kopija. Pasirinkite KauTrash JSON failą iki 2 MB.",
    count: "pridėti adresai",
    expired: "Nėra būsimų išsaugotų datų. Atnaujinkite arba patikrinkite oficialų grafiką.",
  },
  ru: {
    week: "Ближайшие 7 дней",
    ready: "Контейнер готов",
    prepare: "Отметить готовность",
    none: "На ближайшие 7 дней сохранённых вывозов нет.",
    share: "Копировать график недели",
    copied: "Скопировано без адреса",
    offline: "Нет сети. Показаны сохранённые даты; для обновления нужен интернет.",
    name: "Название дома",
    home: "Дом",
    backup: "Резервная копия и восстановление",
    privacy:
      "Копия содержит адреса. Храните её приватно. Сверьте восстановленные даты с оператором.",
    save: "Скачать копию",
    restore: "Выбрать файл копии",
    preview: "Предпросмотр",
    merge: "Добавить недостающие дома",
    existing: "Существующие адреса и даты сохранятся.",
    invalid: "Неверная копия. Выберите JSON-файл KauTrash до 2 МБ.",
    count: "дома добавлены",
    expired: "Нет будущих сохранённых дат. Обновите или проверьте официальный график.",
  },
};
const buttonClass =
  "min-h-11 rounded-lg bg-primary-soft px-3 py-2 text-sm font-semibold text-primary";
export function HouseholdOverview() {
  const lang = useAppStore((s) => s.lang);
  const address = useAppStore((s) => s.address);
  const collections = useAppStore((s) => s.collections);
  const saved = useAppStore((s) => s.savedSchedules);
  const prepared = useAppStore((s) => s.prepared);
  const toggle = useAppStore((s) => s.togglePrepared);
  const select = useAppStore((s) => s.selectSchedule);
  const hide = useAppStore((s) => s.hideAddress);
  const [now, setNow] = useState(() => new Date());
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => {
      setNow(new Date());
      setOffline(!navigator.onLine);
    };
    update();
    const timer = setInterval(update, 60_000);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const w = words[lang];
  const rows = weekPickups(collections, now);
  const key = address ? addressKey(address) : "";
  const upcoming = collections.some((c) => c.dates.some((d) => d.iso >= vilniusDay(now)));
  async function share() {
    const text = scheduleShareText(collections, lang, now);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(w.copied);
    } catch {
      downloadText("kautrash-week.txt", text, "text/plain;charset=utf-8");
    }
  }
  if (!address && !saved.length) return null;
  return (
    <section className="mt-3 rounded-2xl bg-surface p-4 shadow-card">
      {saved.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {saved.map((s, i) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={s.key === key}
              onClick={() => select(s.key)}
              className={`${buttonClass} ${s.key === key ? "ring-1 ring-primary" : ""}`}
            >
              {s.label ||
                (hide ? `${w.home} ${i + 1}` : `${s.address.street} ${s.address.houseNumber}`)}
            </button>
          ))}
        </div>
      )}
      {offline && (
        <p role="status" className="mb-3 text-sm text-muted">
          {w.offline}
        </p>
      )}
      {address && (
        <>
          <h2 className="font-display text-xl font-semibold text-ink">{w.week}</h2>
          {!rows.length && (
            <p className="mt-2 text-sm text-muted">
              {collections.length && !upcoming ? w.expired : w.none}
            </p>
          )}
          <ul className="mt-2 space-y-3">
            {rows.map(({ collection, iso }) => {
              const id = pickupKey(key, collection.id, iso);
              const checked = prepared.includes(id);
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 border-b border-line pb-3 last:border-0"
                >
                  <WasteIcon type={collection.wasteType} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {lang === "lt" ? collection.titleLt : collection.title}
                    </p>
                    <p className="text-xs text-muted">{longDate(parseIsoDay(iso), lang)}</p>
                  </div>
                  <button
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggle(id)}
                    className={`${buttonClass} max-w-36`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {checked && <Check className="size-4 shrink-0" />}
                      {checked ? w.ready : w.prepare}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={() => void share()}
              className={`${buttonClass} mt-3 inline-flex items-center gap-2`}
            >
              <Copy className="size-4" />
              {w.share}
            </button>
          )}
        </>
      )}
    </section>
  );
}
export function HouseholdSettings() {
  const lang = useAppStore((s) => s.lang);
  const saved = useAppStore((s) => s.savedSchedules);
  const label = useAppStore((s) => s.labelSchedule);
  const restore = useAppStore((s) => s.restoreBackup);
  const [preview, setPreview] = useState<HouseholdBackup | null>(null);
  const w = words[lang];
  async function choose(file?: File) {
    setPreview(null);
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error();
      setPreview(readBackup(await file.text()));
    } catch {
      toast.error(w.invalid);
    }
  }
  return (
    <section className="mt-5 rounded-2xl bg-surface p-4 shadow-card">
      <h2 className="font-display text-xl font-semibold text-ink">{w.backup}</h2>
      {saved.map((s, i) => (
        <label key={s.key} className="mt-3 block text-sm text-muted">
          {w.name} {i + 1}
          <input
            aria-label={`${w.name} ${i + 1}`}
            maxLength={60}
            value={s.label ?? ""}
            placeholder={`${w.home} ${i + 1}`}
            onChange={(e) => label(s.key, e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-ink"
          />
        </label>
      ))}
      <p className="mt-3 text-sm text-muted">{w.privacy}</p>
      <button
        type="button"
        disabled={!saved.length}
        className={`${buttonClass} mt-3 inline-flex items-center gap-2 disabled:opacity-50`}
        onClick={() => {
          try {
            downloadText("kautrash-backup.json", backupFile(saved), "application/json");
          } catch {
            toast.error(w.invalid);
          }
        }}
      >
        <Download className="size-4" />
        {w.save}
      </button>
      <label className="mt-3 block text-sm text-muted">
        {w.restore}
        <input
          type="file"
          accept=".json,application/json"
          className="mt-2 block w-full text-sm"
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {preview && (
        <div className="mt-3 rounded-lg bg-surface-2 p-3">
          <p className="font-semibold text-ink">
            {w.preview}: {preview.schedules.length}
          </p>
          <ul className="mt-2 text-sm text-muted">
            {preview.schedules.map((s, i) => (
              <li key={i}>
                {s.label || `${w.home} ${i + 1}`} · {s.collections.length}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">{w.existing}</p>
          <button
            type="button"
            className={`${buttonClass} mt-2`}
            onClick={() => {
              const count = restore(preview);
              setPreview(null);
              toast.success(`${count} · ${w.count}`);
            }}
          >
            {w.merge}
          </button>
        </div>
      )}
    </section>
  );
}
