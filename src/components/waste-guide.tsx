import { Drawer } from "vaul";
import { X } from "lucide-react";
import { WasteIcon } from "@/components/waste-icon";
import { t } from "@/lib/i18n";
import { WASTE_TYPES } from "@/lib/waste";
import type { Lang, WasteTypeId } from "@/lib/types";

export function WasteGuideSheet({
  typeId,
  lang,
  onClose,
}: {
  typeId: WasteTypeId | null;
  lang: Lang;
  onClose: () => void;
}) {
  const type = WASTE_TYPES.find((item) => item.id === typeId) ?? null;
  return (
    <Drawer.Root open={typeId !== null} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-ink/35" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] max-w-md overflow-y-auto rounded-t-2xl bg-bg outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-line" />
          {type ? (
            <div className="px-5 pt-4 pb-10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <WasteIcon type={type.id} size="lg" />
                  <div>
                    <Drawer.Title className="font-display text-2xl font-semibold tracking-tight text-ink">
                      {lang === "lt" ? type.nameLt : type.nameEn}
                    </Drawer.Title>
                    <p className="text-sm text-muted">{lang === "lt" ? type.hintLt : type.hintEn}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
                  aria-label={t(lang, "close")}
                >
                  <X className="size-5" />
                </button>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                {lang === "lt" ? type.bodyLt : type.bodyEn}
              </p>
              <Section
                title={t(lang, "yes")}
                items={lang === "lt" ? type.yesLt : type.yesEn}
                tone="yes"
              />
              <Section
                title={t(lang, "no")}
                items={lang === "lt" ? type.noLt : type.noEn}
                tone="no"
              />
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function Section({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "yes" | "no";
}) {
  return (
    <div className="mt-5">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-faint uppercase">{title}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-lg bg-surface px-3 py-2.5 text-sm text-ink shadow-card"
          >
            <span
              className={
                tone === "yes"
                  ? "mr-2 inline-block size-1.5 rounded-full bg-organic"
                  : "mr-2 inline-block size-1.5 rounded-full bg-danger"
              }
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
