import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEY } from "./constants";
import type { Address, Collection, Lang } from "./types";

type AppState = {
  hydrated: boolean;
  refreshing: boolean;
  lang: Lang;
  address: Address | null;
  collections: Collection[];
  reminders: string[];
  notify: boolean;
  hideAddress: boolean;
  setHydrated: () => void;
  setRefreshing: (value: boolean) => void;
  setLang: (lang: Lang) => void;
  setNotify: (value: boolean) => void;
  setHideAddress: (value: boolean) => void;
  setSchedule: (address: Address, collections: Collection[]) => void;
  toggleReminder: (id: string) => void;
  clearSchedule: () => void;
};

type PersistSlice = {
  lang: Lang;
  address: Address | null;
  collections: Collection[];
  reminders: string[];
  notify: boolean;
  hideAddress: boolean;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      refreshing: false,
      lang: "en",
      address: null,
      collections: [],
      reminders: [],
      notify: false,
      hideAddress: true,
      setHydrated: () => set({ hydrated: true }),
      setRefreshing: (value) => set({ refreshing: value }),
      setLang: (lang) => set({ lang }),
      setNotify: (value) => set({ notify: value }),
      setHideAddress: (value) => set({ hideAddress: value }),
      setSchedule: (address, collections) => set({ address, collections, refreshing: false }),
      toggleReminder: (id) => {
        const reminders = get().reminders.includes(id)
          ? get().reminders.filter((item) => item !== id)
          : [...get().reminders, id];
        set({ reminders });
      },
      clearSchedule: () => set({ address: null, collections: [] }),
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      partialize: (state): PersistSlice => ({
        lang: state.lang,
        address: state.address,
        collections: state.collections,
        reminders: state.reminders,
        notify: state.notify,
        hideAddress: state.hideAddress,
      }),
      migrate: (persisted): PersistSlice => {
        const state = (persisted ?? {}) as Partial<PersistSlice>;
        const seeded =
          state.address?.street === "Vynuogyno g." && state.address?.houseNumber === "33-2";
        return {
          lang: state.lang === "lt" ? "lt" : "en",
          address: seeded ? null : (state.address ?? null),
          collections: seeded ? [] : (state.collections ?? []),
          reminders: state.reminders ?? [],
          notify: Boolean(state.notify),
          hideAddress: state.hideAddress ?? true,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state && state.hideAddress == null) state.hideAddress = true;
        state?.setHydrated();
      },
    },
  ),
);

