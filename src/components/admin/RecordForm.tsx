"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { saveRecord } from "@/app/actions/admin";
import { AreaField, CheckField, FormMessage, SelectField, Submit, TextField } from "@/components/forms/FormKit";
import { Field, Select, describedBy } from "@/components/ui/Field";
import type { EntityKey, FieldDef, Option } from "@/lib/admin/entities";
import type { PickerImage } from "@/lib/admin/server";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/validate";

type Props = {
  entity: EntityKey;
  id: string | null;
  fields: FieldDef[];
  values: Record<string, string>;
  checks: Record<string, boolean>;
  images: PickerImage[];
  refs: { events: Option[]; albums: Option[]; teams: Option[] };
  submitLabel: string;
};

/**
 * The command centre's generic editor. The field list comes from the entity
 * definition; the server reads the submission through the same list and
 * never trusts this form's copy of it.
 */
export function RecordForm({ entity, id, fields, values, checks, images, refs, submitLabel }: Props) {
  const [state, action, pending] = useActionState(saveRecord.bind(null, entity, id), { values } as FormState);

  return (
    <form action={action} noValidate className="space-y-6">
      <FormMessage state={state} />
      <div className="grid gap-5 md:grid-cols-2">
        {fields.map((field) => (
          <FieldControl key={field.name} field={field} state={state} value={values[field.name] ?? ""} checked={checks[field.name] ?? false} images={images} refs={refs} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Submit pending={pending} busy="Saving…">
          {submitLabel}
        </Submit>
        <p className="text-xs text-dim">Every change is recorded in the activity log.</p>
      </div>
    </form>
  );
}

function FieldControl({
  field,
  state,
  value,
  checked,
  images,
  refs,
}: {
  field: FieldDef;
  state: FormState;
  value: string;
  checked: boolean;
  images: PickerImage[];
  refs: Props["refs"];
}) {
  const wide = field.wide || field.type === "textarea" || field.type === "image" ? "md:col-span-2" : undefined;
  const common = { name: field.name, label: field.label, state, hint: field.hint, required: field.required, defaultValue: value, className: wide };

  switch (field.type) {
    case "textarea":
      return <AreaField {...common} rows={field.max && field.max > 1000 ? 8 : 4} maxLength={field.max} />;
    case "select":
      return <SelectField {...common} options={field.options ?? []} />;
    case "ref": {
      const list = field.ref === "albums" ? refs.albums : field.ref === "teams" ? refs.teams : refs.events;
      return <SelectField {...common} options={[{ value: "", label: "None" }, ...list]} />;
    }
    case "checkbox":
      return (
        <div className={cn("self-end pb-2", field.wide && "md:col-span-2")}>
          <CheckField name={field.name} label={field.label} state={state} defaultChecked={state.values ? state.values[field.name] === "on" : checked} />
          {field.hint && <p className="mt-1.5 pl-7 text-xs text-dim">{field.hint}</p>}
        </div>
      );
    case "image":
      return <ImagePicker field={field} state={state} value={value} images={images} />;
    case "number":
      return <TextField {...common} type="number" inputMode="numeric" min={field.min} max={field.max} step={1} />;
    case "datetime":
      return <TextField {...common} type="datetime-local" />;
    case "date":
      return <TextField {...common} type="date" />;
    case "url":
      return <TextField {...common} type="url" inputMode="url" placeholder="https://" maxLength={500} />;
    case "slug":
      return <TextField {...common} maxLength={80} pattern="[a-z0-9-]*" autoCapitalize="none" spellCheck={false} />;
    default:
      return <TextField {...common} maxLength={field.max} />;
  }
}

/** Chooses an approved photograph from the media library. */
function ImagePicker({ field, state, value, images }: { field: FieldDef; state: FormState; value: string; images: PickerImage[] }) {
  const [path, setPath] = useState(state.values?.[field.name] ?? value);
  const id = `f-${field.name}`;
  const error = state.errors?.[field.name];
  const chosen = images.find((i) => i.path === path);
  const missing = path && !chosen;

  return (
    <Field
      label={field.label}
      htmlFor={id}
      error={error}
      className="md:col-span-2"
      hint={
        images.length === 0
          ? "No approved photographs yet. Upload one in the media library and confirm consent first."
          : (field.hint ?? "Only photographs with confirmed consent are listed.")
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden border border-line bg-abyss sm:w-56">
          {chosen ? (
            <Image src={chosen.url} alt="" fill sizes="224px" className="object-cover" />
          ) : (
            <span className="absolute inset-0 grid place-items-center px-3 text-center text-xs text-dim">{missing ? "Image not in the approved library" : "No image"}</span>
          )}
        </div>
        <Select id={id} name={field.name} value={path} onChange={(e) => setPath(e.target.value)} {...describedBy(id, error, true)}>
          <option value="">No image</option>
          {missing && <option value={path}>Current image (not approved)</option>}
          {images.map((img) => (
            <option key={img.path} value={img.path}>
              {img.label || img.path.split("/").pop()}
            </option>
          ))}
        </Select>
      </div>
    </Field>
  );
}
