import { notFound } from "next/navigation";
import { RecordForm } from "@/components/admin/RecordForm";
import { AdminHeader, Panel } from "@/components/admin/Shell";
import {
  ENTITIES,
  formChecked,
  formValue,
  isEntityKey,
} from "@/lib/admin/entities";
import { approvedImages, refOptions } from "@/lib/admin/server";
import { requireAdmin } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/supabase/env";

type Props = { params: Promise<{ entity: string }> };

export async function generateMetadata({ params }: Props) {
  const { entity } = await params;
  return {
    title: isEntityKey(entity)
      ? `New ${ENTITIES[entity].singular}`
      : "Not found",
  };
}

export default async function Page({ params }: Props) {
  const { entity } = await params;
  if (!isEntityKey(entity)) notFound();
  const def = ENTITIES[entity];
  const { db } = await requireAdmin(def.roles);
  const needsImages = def.fields.some((f) => f.type === "image");
  const needsRefs = def.fields.some((f) => f.type === "ref");
  const [images, refs] = await Promise.all([
    needsImages ? approvedImages(db, mediaUrl) : [],
    needsRefs ? refOptions(db) : { events: [], albums: [], teams: [] },
  ]);

  return (
    <>
      <AdminHeader
        title={`New ${def.singular}`}
        description="Leave the status on Draft until it is ready; drafts never appear on the public site."
        back={{ href: `/admin/${entity}`, label: def.label }}
      />
      <Panel>
        <RecordForm
          entity={entity}
          id={null}
          fields={def.fields}
          values={Object.fromEntries(
            def.fields.map((f) => [f.name, formValue(f, null)]),
          )}
          checks={Object.fromEntries(
            def.fields.map((f) => [f.name, formChecked(f, null)]),
          )}
          images={images}
          refs={refs}
          submitLabel={`Create ${def.singular}`}
        />
      </Panel>
    </>
  );
}
