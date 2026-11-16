/**
 * Re-mounts on every navigation, giving each page a short CSS enter
 * transition. Pure CSS: no animation library, honours reduced motion.
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
