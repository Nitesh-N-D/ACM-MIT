import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/cn";

type ContainerProps<T extends ElementType> = {
  as?: T;
  size?: "default" | "narrow" | "wide";
} & ComponentPropsWithoutRef<T>;

const widths = {
  narrow: "max-w-3xl",
  default: "max-w-7xl",
  wide: "max-w-[96rem]",
} as const;

/** Horizontal page container with consistent gutters. */
export function Container<T extends ElementType = "div">({ as, size = "default", className, ...rest }: ContainerProps<T>) {
  const Tag: ElementType = as ?? "div";
  return <Tag className={cn("mx-auto w-full px-4 sm:px-6 lg:px-10", widths[size], className)} {...rest} />;
}
