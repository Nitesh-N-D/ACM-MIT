"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ctaNav, isActivePath, primaryNav } from "@/config/site";
import { cn } from "@/lib/cn";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // While the mobile menu is open: lock page scroll, close on Escape,
  // and move focus into the panel. Focus returns to the toggle on close.
  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      toggle?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-void/75 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-void">
      <Container size="wide" className="flex h-(--spacing-header) items-center justify-between gap-6">
        <Logo />

        {/* Desktop navigation */}
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {primaryNav.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative block px-4 py-2 font-mono text-[0.72rem] uppercase tracking-[0.2em] transition-colors duration-300",
                      active ? "text-cyan" : "text-silver hover:text-ice",
                    )}
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-x-4 -bottom-px h-px origin-left bg-cyan shadow-[0_0_8px_rgb(63_228_255/0.9)] transition-transform duration-500 ease-(--ease-nexus)",
                        active ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            aria-label="Search NEXUS"
            className="grid size-10 place-items-center text-silver transition-colors hover:text-cyan"
          >
            <SearchIcon />
          </Link>
          <Link href={ctaNav.href} className={buttonClasses({ size: "sm", className: "hidden sm:inline-flex" })}>
            {ctaNav.label}
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="grid size-10 place-items-center text-ice lg:hidden"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </Container>

      {/* Mobile navigation panel */}
      <div
        id={menuId}
        ref={panelRef}
        hidden={!open}
        className="fixed inset-x-0 top-(--spacing-header) bottom-0 overflow-y-auto border-t border-line bg-void lg:hidden"
      >
        <Container as="nav" aria-label="Mobile" className="flex flex-col gap-1 py-8">
          {primaryNav.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-baseline justify-between border-b border-line py-4 font-display text-2xl tracking-wide",
                  active ? "text-cyan" : "text-ice",
                )}
              >
                {item.label}
                {item.code && <span className="font-mono text-xs tracking-[0.2em] text-dim">{item.code}</span>}
              </Link>
            );
          })}
          <Link href={ctaNav.href} onClick={close} className={buttonClasses({ size: "lg", className: "mt-8" })}>
            {ctaNav.label}
          </Link>
        </Container>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {open ? (
        <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
      ) : (
        <path d="M4 8h16M4 16h10" strokeLinecap="round" />
      )}
    </svg>
  );
}
