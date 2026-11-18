import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdminHeader,
  Cell,
  ListFilter,
  LoadError,
  Pager,
  Panel,
  Table,
  td,
} from "@/components/admin/Shell";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState, Notice } from "@/components/ui/States";
import { ENTITIES, isEntityKey } from "@/lib/admin/entities";
import {
  PAGE_SIZE,
  ilikeAny,
  kept,
  pageOf,
  param,
  searchTerm,
} from "@/lib/admin/query";
import { requireAdmin } from "@/lib/auth/session";

type Props = {
  params: Promise<{ entity: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { entity } = await params;
  return { title: isEntityKey(entity) ? ENTITIES[entity].label : "Not found" };
}

export default async function Page({ params, searchParams }: Props) {
  const { entity } = await params;
  if (!isEntityKey(entity)) notFound();
  const def = ENTITIES[entity];
  const { db } = await requireAdmin(def.roles);
  const sp = await searchParams;
  const q = param(sp, "q");
  const status = param(sp, "status");
  const { page, from, to } = pageOf(sp);
  const statusField = def.fields.find((f) => f.name === "status");

  let query = db.from(def.table).select("*");
  const term = searchTerm(q);
  if (term) query = query.or(ilikeAny(def.search, term));
  if (statusField && statusField.options?.some((o) => o.value === status))
    query = query.eq("status", status);
  for (const o of def.order)
    query = query.order(o.column, {
      ascending: o.ascending,
      nullsFirst: false,
    });
  const { data, error } = await query.range(from, to);
  const rows = (data ?? []) as Record<string, unknown>[];
  const more = rows.length > PAGE_SIZE;

  return (
    <>
      <AdminHeader
        title={def.label}
        description={def.description}
        actions={
          <Link
            href={`/admin/${entity}/new`}
            className={buttonClasses({ size: "sm" })}
          >
            New {def.singular}
          </Link>
        }
      />
      {param(sp, "deleted") && (
        <Notice tone="success" className="mb-5">
          The {def.singular} was deleted.
        </Notice>
      )}
      <Panel>
        <ListFilter q={q} status={status} statuses={statusField?.options} />
        {error ? (
          <LoadError />
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              q || status
                ? "Nothing matches"
                : `No ${def.label.toLowerCase()} yet`
            }
            description={
              q || status
                ? "Try a different search or clear the filter."
                : `Create the first ${def.singular}; it stays hidden until you publish it.`
            }
          />
        ) : (
          <>
            <Table
              caption={def.label}
              head={[
                ...def.columns.map((c) => c.label),
                <span key="a" className="sr-only">
                  Actions
                </span>,
              ]}
            >
              {rows.slice(0, PAGE_SIZE).map((row) => {
                const href = `/admin/${entity}/${row.id}`;
                const live = def.publicPath?.(row);
                return (
                  <tr key={String(row.id)} className="hover:bg-panel/40">
                    {def.columns.map((c, i) => (
                      <td key={c.name} className={td}>
                        {i === 0 ? (
                          <Link
                            href={href}
                            className="font-medium text-ice hover:text-cyan"
                          >
                            <Cell value={row[c.name]} kind={c.kind} />
                          </Link>
                        ) : (
                          <Cell value={row[c.name]} kind={c.kind} />
                        )}
                      </td>
                    ))}
                    <td className={`${td} whitespace-nowrap text-right`}>
                      <Link
                        href={href}
                        className="text-xs text-cyan hover:underline"
                      >
                        Edit
                      </Link>
                      {live && (
                        <a
                          href={live}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-3 text-xs text-muted hover:text-ice"
                        >
                          View
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
            <Pager
              page={page}
              more={more}
              path={`/admin/${entity}`}
              params={kept({ q, status })}
            />
          </>
        )}
      </Panel>
    </>
  );
}
