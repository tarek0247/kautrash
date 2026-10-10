import { findScheduleFn } from "./svara-fn";
import { addressKey, useAppStore } from "./store";
import type { Address, Lang } from "./types";

export type LookupStatus =
  "ready" | "not_found" | "verification_required" | "unsupported" | "unavailable";
export function lookupMessage(status: LookupStatus, lang: Lang) {
  const messages = {
    ready: [
      "Provider dates loaded. Ecoservice does not specify the waste type; check the container number.",
      "Tiekėjo datos įkeltos. Ecoservice nenurodo atliekų rūšies; patikrinkite konteinerio numerį.",
      "Даты оператора загружены. Ecoservice не указывает тип отходов; проверьте номер контейнера.",
    ],
    not_found: [
      "No exact address with upcoming dates was found in Ecoservice. Check your operator and the full address below.",
      "Ecoservice nerastas tikslus adresas su būsimomis datomis. Patikrinkite tiekėją ir visą adresą.",
      "Точный адрес с будущими датами в Ecoservice не найден. Проверьте оператора и полный адрес.",
    ],
    verification_required: [
      "Švara requires verification on its official site. Automatic lookup is unavailable for this operator. Saved dates are kept; file import is an optional backup.",
      "Švara reikalauja patvirtinimo oficialioje svetainėje. Automatinė šio tiekėjo paieška negalima. Išsaugotos datos lieka; failo importas yra atsarginis būdas.",
      "Švara требует проверки на официальном сайте. Автопоиск для этого оператора недоступен. Сохранённые даты остаются; импорт файла — резервный способ.",
    ],
    unsupported: [
      "This operator has no connected automatic source yet. Open your local official schedule below. File import remains an optional backup.",
      "Šiam tiekėjui automatinis šaltinis dar neprijungtas. Atverkite oficialų vietinį grafiką. Failo importas lieka atsarginis būdas.",
      "Для этого оператора автоматический источник ещё не подключён. Откройте официальное расписание ниже. Импорт файла остаётся резервным способом.",
    ],
    unavailable: [
      "The schedule source is temporarily unavailable. Your saved dates are kept. Retry or open the official schedule.",
      "Grafiko šaltinis laikinai nepasiekiamas. Išsaugotos datos lieka. Bandykite dar kartą arba atverkite oficialų grafiką.",
      "Источник расписания временно недоступен. Сохранённые даты остаются. Повторите поиск или откройте официальный график.",
    ],
  };
  return messages[status][lang === "lt" ? 1 : lang === "ru" ? 2 : 0];
}
const pending = new Map<string, Promise<LookupStatus>>();
export function refreshSchedule(address: Address): Promise<LookupStatus> {
  const key = addressKey(address);
  const active = pending.get(key);
  if (active) return active;
  useAppStore.getState().setRefreshing(true);
  const task = (async () => {
    let status: LookupStatus;
    try {
      const result = await findScheduleFn({ data: address });
      status = result.status;
      const state = useAppStore.getState();
      // An old response must never select an address the user has switched away from.
      if (!state.address || addressKey(state.address) !== key) return status;
      if (status === "ready") {
        const liveIds = new Set(result.collections.map((item) => item.id));
        const imported = state.collections.filter(
          (item) => item.provider !== "ecoservice" && !liveIds.has(item.id),
        );
        state.setSchedule(address, [...imported, ...result.collections]);
      }
      useAppStore.setState({ lookupStatus: status });
    } catch {
      status = "unavailable";
      const state = useAppStore.getState();
      if (state.address && addressKey(state.address) === key)
        useAppStore.setState({ lookupStatus: status });
    } finally {
      pending.delete(key);
      const state = useAppStore.getState();
      if (state.address && addressKey(state.address) === key) state.setRefreshing(false);
    }
    return status;
  })();
  pending.set(key, task);
  return task;
}
