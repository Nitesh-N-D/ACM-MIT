"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
};

/**
 * Modal built on the native <dialog> element: focus trapping, Escape to
 * close, inert background and top-layer stacking come from the browser.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = "md" }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes.
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "nexus-dialog m-auto w-[calc(100%-2rem)] border border-line-strong bg-deep p-0 text-silver",
        "backdrop:bg-void/80 backdrop:backdrop-blur-sm",
        { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" }[size],
      )}
    >
      <div className="p-6 sm:p-8">
        <h2 id={titleId} className="font-display text-xl font-semibold">
          {title}
        </h2>
        {description && (
          <div id={descId} className="mt-3 text-sm leading-relaxed text-muted">
            {description}
          </div>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
      {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-line bg-abyss/60 px-6 py-4 sm:px-8">{footer}</div>}
    </dialog>
  );
}
