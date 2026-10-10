import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HouseholdBackup } from "./household";
import { STORAGE_KEY } from "./constants.ts";
import type { Address, Collection, Lang } from "./types";

export function addressKey(address: Address) {
  return JSON.stringify(
    [address.district, address.subDistrict, address.city, address.street, address.houseNumber].map(
      (value) => value.trim().toLocaleLowerCase("lt"),
    ),
  );
}

type SavedSchedule = {
  key: string;
  address: Address;
  collections: Collection[];
  reminders?: string[];
  label?: string;
};
type AppState = {
  prepared: string[];
  togglePrepared: (key: string) => void;
  labelSchedule: (key: string, label: string) => void;
  restoreBackup: (backup: HouseholdBackup) => number;
  lookupStatus:
    "ready" | "not_found" | "verification_required" | "unsupported" | "unavailable" | null;
  savedSchedules: SavedSchedule[];
  selectSchedule: (key: string) => void;
  removeSchedule: (key: string) => void;
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
  prepared: string[];
  savedSchedules: SavedSchedule[];
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
      prepared: [],
      togglePrepared: (key) =>
        set((state) => ({
          prepared: state.prepared.includes(key)
            ? state.prepared.filter((item) => item !== key)
            : [...state.prepared.slice(-499), key],
        })),
      labelSchedule: (key, label) =>
        set((state) => ({
          savedSchedules: state.savedSchedules.map((item) =>
            item.key === key ? { ...item, label: label.slice(0, 60) } : item,
          ),
        })),
      restoreBackup: (backup) => {
        const state = get();
        const existing = new Set(state.savedSchedules.map((item) => item.key));
        const additions: SavedSchedule[] = [];
        for (const item of backup.schedules) {
          const key = addressKey(item.address);
          if (existing.has(key)) continue;
          existing.add(key);
          additions.push({ ...item, key });
        }
        set({ savedSchedules: [...state.savedSchedules, ...additions] });
        return additions.length;
      },
      lookupStatus: null,
      hydrated: false,
      savedSchedules: [],
      selectSchedule: (key) => {
        const saved = get().savedSchedules.find((item) => item.key === key);
        if (saved)
          set({
            address: saved.address,
            collections: saved.collections,
            reminders: saved.reminders ?? [],
            refreshing: false,
            lookupStatus: null,
          });
      },
      removeSchedule: (key) => {
        const state = get();
        const savedSchedules = state.savedSchedules.filter((item) => item.key !== key);
        set({
          savedSchedules,
          ...(state.address && addressKey(state.address) === key
            ? { address: null, collections: [], reminders: [], lookupStatus: null }
            : {}),
        });
      },
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
      setSchedule: (address, collections) => {
        const key = addressKey(address);
        const state = get();
        const savedSchedules = state.savedSchedules.filter((item) => item.key !== key);
        const reminders = (
          state.address && addressKey(state.address) === key
            ? state.reminders
            : (state.savedSchedules.find((item) => item.key === key)?.reminders ?? [])
        ).filter((id) => collections.some((item) => item.id === id));
        savedSchedules.push({
          key,
          address,
          collections,
          reminders,
          label: state.savedSchedules.find((item) => item.key === key)?.label,
        });
        set({
          address,
          collections,
          savedSchedules,
          refreshing: false,
          reminders,
          lookupStatus: null,
        });
      },
      toggleReminder: (id) => {
        const reminders = get().reminders.includes(id)
          ? get().reminders.filter((item) => item !== id)
          : [...get().reminders, id];
        const state = get();
        set({
          reminders,
          savedSchedules: state.savedSchedules.map((item) =>
            state.address && item.key === addressKey(state.address) ? { ...item, reminders } : item,
          ),
        });
      },
      clearSchedule: () =>
        set({ address: null, collections: [], reminders: [], lookupStatus: null }),
    }),
    {
      name: STORAGE_KEY,
      version: 5,
      partialize: (state): PersistSlice => ({
        prepared: state.prepared,
        savedSchedules: state.savedSchedules,
        lang: state.lang,
        address: state.address,
        collections: state.collections,
        reminders: state.reminders,
        notify: state.notify,
        hideAddress: state.hideAddress,
      }),
      migrate: (persisted): PersistSlice => {
        const state = (persisted ?? {}) as Partial<PersistSlice>;
        return {
          prepared: state.prepared ?? [],
          savedSchedules:
            state.savedSchedules ??
            (state.address
              ? [
                  {
                    key: addressKey(state.address),
                    address: state.address,
                    collections: state.collections ?? [],
                    reminders: state.reminders ?? [],
                  },
                ]
              : []),
          lang: state.lang === "lt" || state.lang === "ru" ? state.lang : "en",
          address: state.address ?? null,
          collections: state.collections ?? [],
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
