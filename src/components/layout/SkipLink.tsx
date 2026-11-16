/** Keyboard users can jump past the navigation straight to page content. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="fixed left-4 top-3 z-100 -translate-y-24 bg-cyan px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-void transition-transform focus:translate-y-0"
    >
      Skip to content
    </a>
  );
}
