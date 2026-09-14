import { useMemo, useState } from "react";
import { Drawer } from "vaul";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { NamedOption } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PickerDrawer({
  open,
  title,
  placeholder,
  options,
  loading,
  emptyTitle,
  emptyBody,
  loadingLabel,
  onClose,
  onSelect,
}: {
  open: boolean;
  title: string;
  placeholder: string;
  options: NamedOption[];
  loading?: boolean;
  emptyTitle: string;
  emptyBody: string;
  loadingLabel: string;
  onClose: () => void;
  onSelect: (item: NamedOption) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((item) => item.name.toLowerCase().includes(needle));
  }, [options, query]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setQuery("");
          onClose();
        }
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-ink/35" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[88dvh] max-w-md flex-col rounded-t-2xl bg-bg outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-line" />
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <Drawer.Title className="font-display text-2xl font-semibold tracking-tight text-ink">
              {title}
            </Drawer.Title>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="relative px-5 pb-3">
            <Search className="pointer-events-none absolute top-1/2 left-9 size-4 -translate-y-1/2 text-faint" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="pl-10"
              autoCapitalize="none"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
            {loading ? (
              <p className="px-1 py-8 text-center text-sm text-muted">{loadingLabel}</p>
            ) : null}
            {!loading && filtered.length === 0 ? (
              <div className="px-2 py-10 text-center">
                <p className="font-display text-xl font-semibold text-ink">{emptyTitle}</p>
                <p className="mt-2 text-sm text-muted">{emptyBody}</p>
              </div>
            ) : null}
            <ul className="flex flex-col gap-2">
              {filtered.map((item) => (
                <li key={String(item.code ?? item.name)}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      onSelect(item);
                    }}
                    className={cn(
                      "flex min-h-12 w-full items-center rounded-xl bg-surface px-4 py-3 text-left text-base font-medium text-ink shadow-card",
                      "transition-transform duration-150 ease-out active:scale-[0.98]",
                    )}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
