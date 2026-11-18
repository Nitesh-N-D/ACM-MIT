import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteRecord } from "@/app/actions/admin";
import { ConfirmAction } from "@/components/admin/Controls";
import { RecordForm } from "@/components/admin/RecordForm";
import {
  AdminHeader,
  LoadError,
  Panel,
  StatusBadge,
} from "@/components/admin/Shell";
import { buttonClasses } from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";
import {
  ENTITIES,
  formChecked,
  formValue,
  isEntityKey,
} from "@/lib/admin/entities";
import { approvedImages, isUuid, refOptions } from "@/lib/admin/server";
import { requireAdmin } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/supabase/env";
import { formatDate } from "@/lib/validate";

type Props = {
  params: Promise<{ entity: string; id: string }>;
  searchParams: Promise<{ created?: string; from?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { entity } = await params;
  return {
    title: isEntityKey(entity)
      ? `Edit ${ENTITIES[entity].singular}`
      : "Not found",
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { entity, id } = await params;
  if (!isEntityKey(entity) || !isUuid(id)) notFound();
  const def = ENTITIES[entity];
  const { db } = await requireAdmin(def.roles);
  const { created, from } = await searchParams;

  const { data, error } = await db
    .from(def.table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return <LoadError />;
  if (!data) notFound();
  const row = data as Record<string, unknown>;

  const needsImages = def.fields.some((f) => f.type === "image");
  const needsRefs = def.fields.some((f) => f.type === "ref");
  const [images, refs] = await Promise.all([
    needsImages ? approvedImages(db, mediaUrl) : [],
    needsRefs ? refOptions(db) : { events: [], albums: [] },
  ]);
  const title = String(row[def.title] ?? def.singular);
  const live = def.publicPath?.(row);

  return (
    <>
      <AdminHeader
        title={title}
        description={
          <>
            {typeof row.status === "string" && (
              <StatusBadge status={row.status} />
            )}{" "}
            {row.updated_at ? (
              <span>
                Last changed {formatDate(String(row.updated_at), true)}
              </span>
            ) : null}
          </>
        }
        back={{ href: `/admin/${entity}`, label: def.label }}
        actions={
          live ? (
            <a
              href={live}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ size: "sm", variant: "secondary" })}
            >
              View on site
            </a>
          ) : undefined
        }
      />
      {created && (
        <Notice tone="success" className="mb-5">
          Created.{" "}
          {live
            ? "It is live on the site now."
            : "It stays hidden until its status is Published."}
        </Notice>
      )}
      {from === "submission" && (
        <Notice tone="info" className="mb-5">
          This draft was made from a member&apos;s submission. Add an image and
          details, then publish it.
        </Notice>
      )}
      <Panel>
        <RecordForm
          entity={entity}
          id={id}
          fields={def.fields}
          values={Object.fromEntries(
            def.fields.map((f) => [f.name, formValue(f, row)]),
          )}
          checks={Object.fromEntries(
            def.fields.map((f) => [f.name, formChecked(f, row)]),
          )}
          images={images}
          refs={refs}
          submitLabel="Save changes"
        />
      </Panel>
      <Panel
        title="Delete"
        description={`Removes this ${def.singular} for good. Archiving hides it instead and can be undone.`}
        className="mt-6 border-danger/20"
      >
        <div className="flex flex-wrap items-center gap-4">
          <ConfirmAction
            label={`Delete ${def.singular}`}
            title={`Delete "${title}"?`}
            description="This cannot be undone. The deletion is recorded in the activity log."
            action={deleteRecord.bind(null, entity, id)}
          />
          {entity === "events" && (
            <Link
              href={`/admin/registrations?event=${id}`}
              className="text-sm text-cyan hover:underline"
            >
              See registrations for this event →
            </Link>
          )}
        </div>
      </Panel>
    </>
  );
}
