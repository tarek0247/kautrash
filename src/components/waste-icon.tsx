import { Leaf, Package, Recycle, Trash2, Wine } from "lucide-react";
import type { WasteTypeId } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAP = {
  mixed: { Icon: Trash2, className: "bg-mixed/12 text-mixed" },
  paper: { Icon: Package, className: "bg-paper/12 text-paper" },
  glass: { Icon: Wine, className: "bg-glass/12 text-glass" },
  organic: { Icon: Leaf, className: "bg-organic/12 text-organic" },
} as const;

export function WasteIcon({
  type,
  className,
  size = "md",
}: {
  type: WasteTypeId;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { Icon, className: tone } = MAP[type] ?? MAP.mixed;
  const box =
    size === "lg" ? "size-14 rounded-xl" : size === "sm" ? "size-9 rounded-md" : "size-12 rounded-lg";
  const icon = size === "lg" ? "size-7" : size === "sm" ? "size-4" : "size-5";
  return (
    <span
      className={cn("inline-flex items-center justify-center", tone, box, className)}
      aria-hidden
    >
      <Icon className={icon} strokeWidth={1.75} />
    </span>
  );
}

export function RecycleMark({ className }: { className?: string }) {
  return <Recycle className={className} strokeWidth={1.75} />;
}
