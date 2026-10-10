import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { downloadText } from "@/lib/calendar-export";

export function ReportTools() {
  const lang = useAppStore((s) => s.lang);
  const [day, setDay] = useState("");
  const [container, setContainer] = useState("");
  const [notes, setNotes] = useState("");
  const say = (en: string, lt: string, ru: string) =>
    lang === "lt" ? lt : lang === "ru" ? ru : en;
  const field = "mt-2 min-h-11 w-full rounded-lg border border-line bg-surface p-3 text-ink";
  return (
    <details className="mt-4 rounded-xl bg-surface p-4 shadow-card">
      <summary className="cursor-pointer font-semibold">
        {say(
          "Report missed collection",
          "Pranešti apie neišvežtas atliekas",
          "Сообщить о пропущенном вывозе",
        )}
      </summary>
      <p className="mt-3 text-sm text-muted">
        {say(
          "Prepare a report to send to your provider. Nothing is submitted automatically; add your address yourself before sending.",
          "Paruoškite pranešimą tiekėjui. Jis automatiškai nesiunčiamas; prieš siųsdami įrašykite adresą.",
          "Подготовьте сообщение оператору. Оно не отправляется автоматически; добавьте адрес перед отправкой.",
        )}
      </p>
      <label className="mt-3 block text-sm">
        {say("Missed date", "Neįvykusio išvežimo data", "Дата пропущенного вывоза")}
        <input type="date" className={field} value={day} onChange={(e) => setDay(e.target.value)} />
      </label>
      <label className="mt-3 block text-sm">
        {say("Container number", "Konteinerio numeris", "Номер контейнера")}
        <input
          className={field}
          maxLength={100}
          value={container}
          onChange={(e) => setContainer(e.target.value)}
        />
      </label>
      <label className="mt-3 block text-sm">
        {say("Details", "Aplinkybės", "Подробности")}
        <textarea
          className={field}
          maxLength={3000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={!day || !notes.trim()}
        className="mt-3 min-h-11 rounded-lg bg-primary-soft px-3 text-sm font-semibold text-primary disabled:opacity-40"
        onClick={() =>
          downloadText(
            "kautrash-report.txt",
            `${say("Missed collection", "Neišvežtos atliekos", "Пропущенный вывоз")}\n${day}\n${container}\n\n${notes}\n\n${say("Address: add before sending", "Adresas: įrašykite prieš siųsdami", "Адрес: добавьте перед отправкой")}`,
            "text/plain;charset=utf-8",
          )
        }
      >
        {say(
          "Download report draft",
          "Atsisiųsti pranešimo juodraštį",
          "Скачать черновик сообщения",
        )}
      </button>
    </details>
  );
}
