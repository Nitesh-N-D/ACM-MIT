import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  id?: string;
  align?: "left" | "center";
  action?: ReactNode;
  className?: string;
};

/** Section-level heading (h2) with eyebrow, optional lede and action slot. */
export function SectionHeading({ eyebrow, title, description, id, align = "left", action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "items-center text-center sm:flex-col sm:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
          {title}
        </h2>
        {description && <p className="mt-4 leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
