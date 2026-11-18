import { AdminHeader, DownloadLink, Panel } from "@/components/admin/Shell";
import { buttonClasses } from "@/components/ui/Button";
import { EXPORTS, type ExportKind } from "@/lib/admin/exports";
import { refOptions } from "@/lib/admin/server";
import { EVENTS, STAFF, hasAny } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Export centre" };

export default async function Page() {
  const { db, viewer } = await requireAdmin(STAFF);
  const kinds = (Object.keys(EXPORTS) as ExportKind[]).filter((k) =>
    hasAny(viewer.roles, EXPORTS[k].roles),
  );
  const events = hasAny(viewer.roles, EVENTS)
    ? (await refOptions(db)).events
    : [];

  return (
    <>
      <AdminHeader
        title="Export centre"
        description="Download what the chapter has recorded as CSV files that open in any spreadsheet. Each download is written to the activity log. Keep files with personal details private and delete them when you are done."
      />
      <ul className="grid gap-4 md:grid-cols-2">
        {kinds.map((k) => {
          const def = EXPORTS[k];
          return (
            <li key={k}>
              <Panel
                title={def.label}
                description={def.description}
                className="h-full"
              >
                <p className="mb-4 font-mono text-[11px] tracking-[0.12em] text-dim uppercase">
                  Columns: {def.columns.map((c) => c.label).join(" · ")}
                </p>
                {k === "registrations" && events.length > 0 ? (
                  <form
                    method="get"
                    action="/admin/api/export/registrations"
                    className="flex flex-wrap items-end gap-3"
                  >
                    <label className="flex min-w-0 flex-1 basis-48 flex-col gap-1.5 text-xs text-silver">
                      <span className="font-mono tracking-[0.18em] uppercase">
                        Event
                      </span>
                      <select
                        name="event"
                        defaultValue=""
                        className="h-10 border border-line-strong bg-abyss px-2 text-sm text-ice"
                      >
                        <option value="">All events</option>
                        {events.map((e) => (
                          <option key={e.value} value={e.value}>
                            {e.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      className={buttonClasses({ size: "sm" })}
                    >
                      Download CSV
                    </button>
                  </form>
                ) : (
                  <DownloadLink
                    href={`/admin/api/export/${k}`}
                    variant="primary"
                  />
                )}
              </Panel>
            </li>
          );
        })}
      </ul>
    </>
  );
}
