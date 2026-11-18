import { deleteMessage } from "@/app/actions/admin";
import { ConfirmAction, MessageStatus } from "@/components/admin/Controls";
import {
  AdminHeader,
  DownloadLink,
  ListFilter,
  LoadError,
  Pager,
  Panel,
  StatusBadge,
} from "@/components/admin/Shell";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import {
  PAGE_SIZE,
  ilikeAny,
  kept,
  pageOf,
  param,
  searchTerm,
} from "@/lib/admin/query";
import { ADMINS } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/validate";

export const metadata = { title: "Contact messages" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STATUSES = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
];

export default async function Page({ searchParams }: Props) {
  const { db } = await requireAdmin(ADMINS);
  const sp = await searchParams;
  const q = param(sp, "q");
  const status = param(sp, "status");
  const { page, from, to } = pageOf(sp);

  let query = db.from("contact_submissions").select("*");
  const term = searchTerm(q);
  if (term)
    query = query.or(ilikeAny(["name", "email", "subject", "message"], term));
  // Archived messages are kept out of the way unless asked for.
  if (STATUSES.some((s) => s.value === status))
    query = query.eq("status", status);
  else query = query.neq("status", "archived");
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);
  const rows = data ?? [];
  const more = rows.length > PAGE_SIZE;

  return (
    <>
      <AdminHeader
        title="Contact messages"
        description="Messages sent from the contact page. Reply from your own email; archived messages are hidden unless you filter for them."
        actions={<DownloadLink href="/admin/api/export/messages" />}
      />
      <Panel>
        <ListFilter q={q} status={status} statuses={STATUSES} />
        {error ? (
          <LoadError />
        ) : rows.length === 0 ? (
          <EmptyState
            title={q || status ? "Nothing matches" : "No messages"}
            description={
              q || status
                ? "Try a different search or status."
                : "Messages from the contact page appear here."
            }
          />
        ) : (
          <>
            <ul className="space-y-4">
              {rows.slice(0, PAGE_SIZE).map((m) => {
                const subject = (m.subject as string) || "Message from NEXUS";
                const reply = `mailto:${m.email as string}?subject=${encodeURIComponent(`Re: ${subject}`)}`;
                return (
                  <li
                    key={m.id as string}
                    className={
                      m.status === "new"
                        ? "border border-cyan/40 bg-abyss/60 p-5"
                        : "border border-line bg-abyss/40 p-5"
                    }
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-display text-base text-ice">
                          {subject}
                        </h2>
                        <p className="mt-1 text-xs text-muted">
                          {m.name as string} ·{" "}
                          <span className="break-all">{m.email as string}</span>{" "}
                          · {formatDate(String(m.created_at), true)}
                        </p>
                      </div>
                      <StatusBadge status={m.status as string} />
                    </div>
                    <p className="mt-3 text-sm whitespace-pre-line text-silver">
                      {m.message as string}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                      <a
                        href={reply}
                        className={buttonClasses({
                          size: "sm",
                          variant: "secondary",
                        })}
                      >
                        Reply by email
                      </a>
                      <MessageStatus
                        id={m.id as string}
                        status={m.status as string}
                      />
                      <ConfirmAction
                        label="Delete"
                        variant="ghost"
                        title="Delete this message?"
                        description="It is removed for good. Archive it instead to keep a record."
                        action={deleteMessage.bind(null, m.id as string)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pager
              page={page}
              more={more}
              path="/admin/messages"
              params={kept({ q, status })}
            />
          </>
        )}
      </Panel>
    </>
  );
}
