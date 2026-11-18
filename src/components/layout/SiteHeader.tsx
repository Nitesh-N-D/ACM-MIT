"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { buttonClasses } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ctaNav, isActivePath, primaryNav } from "@/config/site";
import { cn } from "@/lib/cn";
import { ViewSwitch } from "./ViewSwitch";
import { SoundToggle } from "./SoundToggle";

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
    <header className="fixed inset-x-0 top-0 z-50">
      {/* The blur lives on this inner bar, never on <header>: backdrop-filter
          creates a containing block that would trap the fixed mobile panel. */}
      <div className="border-b border-line bg-void/75 backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-void">
        <Container
          size="wide"
          className="flex h-(--spacing-header) items-center justify-between gap-3 sm:gap-6"
        >
          <Logo />

          {/* Desktop navigation */}
          <nav aria-label="Primary" className="hidden xl:block">
            <ul className="flex items-center gap-1">
              {primaryNav.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative block px-3 py-2 font-mono 2xl:px-4 text-[0.72rem] uppercase tracking-[0.2em] transition-colors duration-300",
                        active ? "text-cyan" : "text-silver hover:text-ice",
                      )}
                    >
                      {item.label}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute inset-x-3 -bottom-px 2xl:inset-x-4 h-px origin-left bg-cyan shadow-[0_0_8px_rgb(63_228_255/0.9)] transition-transform duration-500 ease-(--ease-nexus)",
                          active ? "scale-x-100" : "scale-x-0",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* On small phones these two live in the menu panel instead. */}
            <span className="mr-1 hidden sm:block">
              <ViewSwitch />
            </span>
            <SoundToggle />
            <Link
              href="/search"
              aria-label="Search NEXUS"
              className="grid size-10 place-items-center text-silver transition-colors hover:text-cyan"
            >
              <SearchIcon />
            </Link>
            <Link
              href="/dashboard"
              aria-label="Your account"
              title="Your account"
              className="hidden size-10 place-items-center min-[400px]:grid text-silver transition-colors hover:text-cyan"
            >
              <AccountIcon />
            </Link>
            {/* Wrapper owns visibility: buttonClasses sets its own `display`. */}
            <span className="hidden sm:block">
              <Link
                href={ctaNav.href}
                className={buttonClasses({ size: "sm" })}
              >
                {ctaNav.label}
              </Link>
            </span>
            <button
              ref={toggleRef}
              type="button"
              className="grid size-10 place-items-center text-ice xl:hidden"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <MenuIcon open={open} />
            </button>
          </div>
        </Container>
      </div>

      {/* Mobile navigation panel */}
      <div
        id={menuId}
        ref={panelRef}
        hidden={!open}
        className="fixed inset-x-0 top-(--spacing-header) bottom-0 overflow-y-auto border-t border-line bg-void xl:hidden"
      >
        <Container
          as="nav"
          aria-label="Mobile"
          className="flex flex-col gap-1 py-8"
        >
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
                {item.code && (
                  <span className="font-mono text-xs tracking-[0.2em] text-dim">
                    {item.code}
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            href="/dashboard"
            onClick={close}
            className="flex items-baseline justify-between border-b border-line py-4 font-display text-2xl tracking-wide text-ice"
          >
            Your account
          </Link>
          <ViewSwitch wide className="mt-8" />
          <Link
            href={ctaNav.href}
            onClick={close}
            className={buttonClasses({ size: "lg", className: "mt-4" })}
          >
            {ctaNav.label}
          </Link>
        </Container>
      </div>
    </header>
  );
}

function AccountIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="12" cy="8.5" r="3.75" />
      <path
        d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      {open ? (
        <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
      ) : (
        <path d="M4 8h16M4 16h10" strokeLinecap="round" />
      )}
    </svg>
  );
}
