import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "group relative inline-flex items-center justify-center gap-2 font-mono uppercase tracking-[0.18em] " +
  "transition-[color,background-color,border-color,box-shadow] duration-300 ease-(--ease-nexus) " +
  "disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-cyan text-void border border-cyan hover:bg-ice hover:border-ice " +
    "shadow-[0_0_0_0_rgb(63_228_255/0)] hover:shadow-[0_0_32px_-6px_rgb(63_228_255/0.7)]",
  secondary: "border border-line-strong text-ice bg-deep/60 hover:border-cyan hover:text-cyan",
  ghost: "text-silver hover:text-cyan",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.68rem]",
  md: "h-11 px-6 text-xs",
  lg: "h-13 px-8 text-[0.8rem]",
};

// Chamfered corners — consistent with the .nexus-frame motif.
const chamfer = "[clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,10px_100%,0_calc(100%-10px))]";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps & Omit<ComponentPropsWithoutRef<"button">, keyof CommonProps> & { href?: undefined };
type ButtonAsLink = CommonProps & Omit<ComponentPropsWithoutRef<typeof Link>, keyof CommonProps> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function buttonClasses({ variant = "primary", size = "md", className }: Partial<CommonProps> = {}) {
  return cn(base, variants[variant], sizes[size], variant !== "ghost" && chamfer, className);
}

/** NEXUS button. Renders a Next.js `<Link>` when `href` is provided. */
export function Button({ variant, size, className, children, ...rest }: ButtonProps) {
  const classes = buttonClasses({ variant, size, className });

  if (typeof rest.href === "string") {
    const linkProps = rest as Omit<ButtonAsLink, keyof CommonProps>;
    return (
      <Link {...linkProps} className={classes}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = rest as Omit<ButtonAsButton, keyof CommonProps>;
  return (
    <button type={type} {...buttonProps} className={classes}>
      {children}
    </button>
  );
}
