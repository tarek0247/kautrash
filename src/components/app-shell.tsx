import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Home, Settings } from "lucide-react";
import { Toaster } from "sonner";
import { AddressSheet } from "@/components/address-sheet";
import { WasteGuideSheet } from "@/components/waste-guide";
import { collectionsTomorrow } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { findScheduleFn } from "@/lib/svara-fn";
import { useAppStore } from "@/lib/store";
import type { WasteTypeId } from "@/lib/types";
import { cn } from "@/lib/utils";

type Actions = {
  openAddress: () => void;
  openGuide: (id: WasteTypeId) => void;
};

const ActionsContext = createContext<Actions>({
  openAddress: () => {},
  openGuide: () => {},
});

export function useAppActions() {
  return useContext(ActionsContext);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lang = useAppStore((s) => s.lang);
  const hydrated = useAppStore((s) => s.hydrated);
  const notify = useAppStore((s) => s.notify);
  const collections = useAppStore((s) => s.collections);
  const [addressOpen, setAddressOpen] = useState(false);
  const [guide, setGuide] = useState<WasteTypeId | null>(null);

  const actions = useMemo<Actions>(
    () => ({
      openAddress: () => setAddressOpen(true),
      openGuide: (id) => setGuide(id),
    }),
    [],
  );

  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      useAppStore.getState().setHydrated();
    }
    return useAppStore.persist.onFinishHydration(() => {
      useAppStore.getState().setHydrated();
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const address = useAppStore.getState().address;
    if (!address?.street || !address.houseNumber || !address.district) return;
    let cancelled = false;
    useAppStore.getState().setRefreshing(true);
    findScheduleFn({ data: address })
      .then((result) => {
        if (cancelled) return;
        if (result.collections.length) {
          useAppStore.getState().setSchedule(result.address, result.collections);
        } else {
          useAppStore.getState().setRefreshing(false);
        }
      })
      .catch(() => {
        if (!cancelled) useAppStore.getState().setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !notify || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    const due = collectionsTomorrow(collections);
    if (due.length === 0) return;
    const key = `svara-ping-${due.map((d) => d.id).join("-")}-${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const names = due.map((d) => (lang === "lt" ? d.titleLt : d.title)).join(", ");
    new Notification(t(lang, "brand"), { body: `${t(lang, "tomorrow")}: ${names}` });
  }, [hydrated, notify, collections, lang]);

  const items = [
    { to: "/", icon: Home, label: t(lang, "navHome"), match: pathname === "/" },
    {
      to: "/calendar",
      icon: CalendarDays,
      label: t(lang, "navCalendar"),
      match: pathname.startsWith("/calendar"),
    },
    {
      to: "/settings",
      icon: Settings,
      label: t(lang, "navSettings"),
      match: pathname.startsWith("/settings"),
    },
  ] as const;

  return (
    <ActionsContext.Provider value={actions}>
      <div className="relative min-h-dvh bg-bg-deep">
        <div className="grain absolute inset-0 opacity-40" />
        <div className="relative mx-auto flex min-h-dvh max-w-6xl">
          <aside className="hidden w-80 shrink-0 flex-col justify-between px-10 py-16 lg:flex">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
                {t(lang, "brandKicker")}
              </p>
              <p className="font-display mt-4 text-4xl leading-tight font-semibold tracking-tight text-ink">
                {t(lang, "brand")}
              </p>
              <p className="font-display mt-8 text-2xl leading-snug text-ink-soft italic">
                {t(lang, "putOut")}
              </p>
            </div>
            <p className="text-sm text-muted">grafikai.svara.lt</p>
          </aside>

          <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-bg shadow-card lg:my-6 lg:min-h-[calc(100dvh-3rem)] lg:overflow-hidden lg:rounded-2xl">
            <div className="relative min-h-0 flex-1 overflow-y-auto">
              {children}
              <AddressSheet open={addressOpen} onClose={() => setAddressOpen(false)} />
            </div>
            <nav className="sticky bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur-sm">
              <ul className="grid grid-cols-3">
                {items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="flex h-20 flex-col items-center justify-center gap-1"
                    >
                      <item.icon
                        className={cn("size-5", item.match ? "text-primary" : "text-muted")}
                        strokeWidth={item.match ? 2.2 : 1.75}
                      />
                      <span
                        className={cn(
                          "text-xs",
                          item.match ? "font-semibold text-primary" : "text-muted",
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
        <WasteGuideSheet typeId={guide} lang={lang} onClose={() => setGuide(null)} />
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "font-sans bg-surface text-ink border-line",
            },
          }}
        />
      </div>
    </ActionsContext.Provider>
  );
}
