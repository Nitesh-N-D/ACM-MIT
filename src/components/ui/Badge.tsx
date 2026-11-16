import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "cyan" | "violet" | "gold" | "success" | "warning" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "border-line-strong text-silver",
  cyan: "border-cyan/40 text-cyan bg-cyan/5",
  violet: "border-violet/40 text-violet bg-violet/5",
  gold: "border-gold/40 text-gold bg-gold/5",
  success: "border-success/40 text-success bg-success/5",
  warning: "border-warning/40 text-warning bg-warning/5",
  danger: "border-danger/40 text-danger bg-danger/5",
};

export function Badge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
