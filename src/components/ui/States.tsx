import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Shown when a list has no items. Never invents placeholder data. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border border-dashed border-line-strong px-6 py-12 text-center", className)}>
      <div aria-hidden="true" className="mx-auto mb-5 size-8 rotate-45 border border-cyan/50">
        <div className="m-2.5 size-1.5 bg-cyan/70" />
      </div>
      <p className="font-display text-lg text-ice">{title}</p>
      {description && <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/** Shimmer-free skeleton block (static to avoid needless repaints). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("bg-panel/70", className)} />;
}

/** Inline notice for info / warning / error messages. */
export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-cyan/40 text-cyan",
    warning: "border-warning/40 text-warning",
    danger: "border-danger/40 text-danger",
    success: "border-success/40 text-success",
  } as const;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("border-l-2 bg-panel/50 px-4 py-3", tones[tone], className)}>
      {title && <p className="font-mono text-xs uppercase tracking-[0.18em]">{title}</p>}
      {children && <div className="mt-1 text-sm text-silver">{children}</div>}
    </div>
  );
}
