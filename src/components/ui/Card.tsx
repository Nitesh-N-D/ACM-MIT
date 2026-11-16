import type { CSSProperties, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

type CardProps = ComponentPropsWithoutRef<"div"> & {
  /** Hex accent; tints the corner notch and hover edge. */
  accent?: string;
  interactive?: boolean;
};

/**
 * Chamfered NEXUS panel. Deliberately not a rounded card: a cut corner with
 * an accent notch reads as "architecture" rather than "template".
 */
export function Card({ accent = "#3fe4ff", interactive = false, className, style, children, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      style={{ "--accent": accent, ...style } as CSSProperties}
      className={cn(
        "nexus-frame group/card relative",
        interactive &&
          "transition-[background-color,border-color] duration-300 hover:border-(--accent)/50 hover:bg-panel/80 focus-within:border-(--accent)/60",
        className,
      )}
    >
      {/* Accent notch in the cut corner */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 h-px w-10 origin-right bg-(--accent) opacity-70 transition-[width,opacity] duration-500 group-hover/card:w-20 group-hover/card:opacity-100"
      />
      {children}
    </div>
  );
}
