import { Bell, EyeOff, Globe, Info, Lock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SettingsView({ onChangeAddress }: { onChangeAddress: () => void }) {
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const notify = useAppStore((s) => s.notify);
  const setNotify = useAppStore((s) => s.setNotify);
  const hideAddress = useAppStore((s) => s.hideAddress) !== false;
  const setHideAddress = useAppStore((s) => s.setHideAddress);
  const address = useAppStore((s) => s.address);

  async function toggleNotify() {
    if (!notify) {
      if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error(t(lang, "notifyNeed"));
          return;
        }
      }
      setNotify(true);
      toast.success(t(lang, "notifySet"));
      return;
    }
    setNotify(false);
  }

  return (
    <div className="px-5 pt-6 pb-28">
      <p className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">
        {t(lang, "brand")}
      </p>
      <h1 className="font-display mt-1 text-3xl leading-tight font-semibold tracking-tight text-ink">
        {t(lang, "settingsTitle")}
      </h1>

      <ul className="mt-6 flex flex-col gap-2">
        <li>
          <button
            type="button"
            onClick={() => setHideAddress(!hideAddress)}
            className="flex min-h-16 w-full items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left shadow-card"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              {hideAddress ? <EyeOff className="size-4" /> : <Lock className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{t(lang, "hideAddress")}</span>
              <span className="mt-0.5 block text-sm text-muted">
                {hideAddress ? t(lang, "hideAddressOn") : t(lang, "hideAddressOff")}
              </span>
            </span>
            <span
              className={cn(
                "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                hideAddress ? "bg-primary" : "bg-line",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-surface transition-transform",
                  hideAddress ? "translate-x-4" : "translate-x-0.5",
                )}
              />
            </span>
          </button>
        </li>

        <li>
          <button
            type="button"
            onClick={() => void toggleNotify()}
            className="flex min-h-16 w-full items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left shadow-card"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Bell className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{t(lang, "notifications")}</span>
              <span className="mt-0.5 block text-sm text-muted">
                {notify ? t(lang, "notificationsOn") : t(lang, "notificationsOff")}
              </span>
            </span>
            <span
              className={cn(
                "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                notify ? "bg-primary" : "bg-line",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-surface transition-transform",
                  notify ? "translate-x-4" : "translate-x-0.5",
                )}
              />
            </span>
          </button>
        </li>

        <li className="rounded-xl bg-surface px-4 py-3 shadow-card">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Globe className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{t(lang, "language")}</span>
              <span className="mt-0.5 block text-sm text-muted">{t(lang, "languageHint")}</span>
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={cn(
                "h-11 rounded-lg text-sm font-semibold",
                lang === "en" ? "bg-primary text-primary-fg" : "bg-surface-2 text-ink-soft",
              )}
            >
              {t(lang, "english")}
            </button>
            <button
              type="button"
              onClick={() => setLang("lt")}
              className={cn(
                "h-11 rounded-lg text-sm font-semibold",
                lang === "lt" ? "bg-primary text-primary-fg" : "bg-surface-2 text-ink-soft",
              )}
            >
              {t(lang, "lithuanian")}
            </button>
          </div>
        </li>

        <li>
          <button
            type="button"
            onClick={onChangeAddress}
            className="flex min-h-16 w-full items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left shadow-card"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <MapPin className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{t(lang, "savedAddress")}</span>
              <span className="mt-0.5 block truncate text-sm text-muted">
                {!address
                  ? t(lang, "addAddress")
                  : hideAddress
                    ? t(lang, "addressHidden")
                    : `${address.street} ${address.houseNumber}, ${address.city}`}
              </span>
            </span>
          </button>
        </li>

        <li className="rounded-xl bg-surface px-4 py-3 shadow-card">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Info className="size-4" />
            </span>
            <span>
              <span className="block font-semibold text-ink">{t(lang, "about")}</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">
                {t(lang, "aboutBody")}
              </span>
            </span>
          </div>
        </li>
      </ul>
    </div>
  );
}
