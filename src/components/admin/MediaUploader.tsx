"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { replaceMedia } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Notice } from "@/components/ui/States";
import type { Option } from "@/lib/admin/entities";
import { cn } from "@/lib/cn";

const MAX = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

type Item = {
  key: string;
  file: File;
  preview: string;
  progress: number;
  state: "queued" | "uploading" | "done" | "failed";
  message?: string;
  id?: string;
};

/** Reads the pixel size so pages can reserve space before the image loads. */
async function dimensions(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

/** Uploads one file with real byte progress (fetch cannot report it). */
function send(form: FormData, onProgress: (p: number) => void): Promise<{ ok: boolean; message: string; id?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/admin/api/upload");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      const body = xhr.response as { ok?: boolean; message?: string; id?: string } | null;
      resolve({ ok: xhr.status === 200 && Boolean(body?.ok), message: body?.message ?? "The upload failed. Please try again.", id: body?.id });
    };
    xhr.onerror = () => resolve({ ok: false, message: "The connection dropped during the upload. Please try again." });
    xhr.send(form);
  });
}

/**
 * Drag-and-drop uploader for the media library: several files at once,
 * previews, per-file progress, and album/event association. Uploaded
 * images stay hidden until consent is confirmed on each one.
 */
export function MediaUploader({ albums, events, kinds }: { albums: Option[]; events: Option[]; kinds: Option[] }) {
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState("photo");
  const [album, setAlbum] = useState("");
  const [event, setEvent] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const inputId = useId();
  const previews = useRef<string[]>([]);

  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const patch = (key: string, p: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  function add(files: FileList | File[]) {
    const next: Item[] = [];
    for (const file of Array.from(files).slice(0, 40)) {
      const preview = URL.createObjectURL(file);
      previews.current.push(preview);
      const bad = !TYPES.includes(file.type) ? "Not a JPEG, PNG, WebP or AVIF image." : file.size > MAX ? "Larger than 5 MB." : undefined;
      next.push({ key: `${file.name}-${file.size}-${Math.random()}`, file, preview, progress: 0, state: bad ? "failed" : "queued", message: bad });
    }
    setItems((list) => [...list, ...next]);
  }

  async function upload() {
    setBusy(true);
    for (const item of items.filter((i) => i.state === "queued")) {
      patch(item.key, { state: "uploading", progress: 0 });
      const form = new FormData();
      form.set("file", item.file);
      form.set("kind", kind);
      form.set("album_id", album);
      form.set("event_id", event);
      const size = await dimensions(item.file);
      if (size) {
        form.set("width", String(size.width));
        form.set("height", String(size.height));
      }
      const r = await send(form, (progress) => patch(item.key, { progress }));
      patch(item.key, { state: r.ok ? "done" : "failed", progress: r.ok ? 100 : 0, message: r.message, id: r.id });
    }
    setBusy(false);
    router.refresh();
  }

  const queued = items.filter((i) => i.state === "queued").length;
  const done = items.filter((i) => i.state === "done").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-2 text-xs text-silver">
          <span className="font-mono uppercase tracking-[0.18em]">Kind</span>
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            {kinds.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-2 text-xs text-silver">
          <span className="font-mono uppercase tracking-[0.18em]">Album</span>
          <Select value={album} onChange={(e) => setAlbum(e.target.value)}>
            <option value="">No album</option>
            {albums.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-2 text-xs text-silver">
          <span className="font-mono uppercase tracking-[0.18em]">Event</span>
          <Select value={event} onChange={(e) => setEvent(e.target.value)}>
            <option value="">No event</option>
            {events.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) add(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 border border-dashed px-6 py-10 text-center transition-colors",
          over ? "border-cyan bg-cyan/5" : "border-line-strong bg-abyss/50",
        )}
      >
        <p className="text-sm text-silver">Drop photographs here, or</p>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept={TYPES.join(",")}
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) add(e.target.files);
            e.target.value = "";
          }}
        />
        <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
          Choose files
        </Button>
        <p className="text-xs text-dim">JPEG, PNG, WebP or AVIF, up to 5 MB each. Responsive sizes are generated automatically.</p>
      </div>

      {items.length > 0 && (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Files to upload">
            {items.map((item) => (
              <li key={item.key} className="flex gap-3 border border-line bg-deep/60 p-3">
                <div className="relative size-16 shrink-0 overflow-hidden border border-line bg-abyss">
                  {/* Local blob preview: next/image cannot optimise it. */}
                  <Image src={item.preview} alt="" fill unoptimized className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ice">{item.file.name}</p>
                  <p className="text-xs text-dim">{(item.file.size / 1024 / 1024).toFixed(1)} MB</p>
                  <div
                    className="mt-2 h-1 bg-line"
                    role="progressbar"
                    aria-label={`Upload progress for ${item.file.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.progress}
                  >
                    <div className={cn("h-full transition-[width]", item.state === "failed" ? "bg-danger" : "bg-cyan")} style={{ width: `${item.progress}%` }} />
                  </div>
                  <p className={cn("mt-1 text-xs", item.state === "failed" ? "text-danger" : item.state === "done" ? "text-success" : "text-dim")}>
                    {item.state === "queued" ? "Ready" : item.state === "uploading" ? `Uploading ${item.progress}%` : item.message}
                  </p>
                  {item.id && (
                    <a href={`/admin/media/${item.id}`} className="text-xs text-cyan hover:underline">
                      Add caption and consent →
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={upload} disabled={busy || queued === 0}>
              {busy ? "Uploading…" : `Upload ${queued} ${queued === 1 ? "file" : "files"}`}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setItems([])} disabled={busy}>
              Clear list
            </Button>
            {done > 0 && !busy && (
              <p role="status" className="text-sm text-success">
                {done} uploaded. Each stays hidden until you confirm consent.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Swaps the file behind a library entry; every page that uses it follows. */
export function ReplaceMedia({ id, inUse }: { id: string; inUse: boolean }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const file = form.get("file");
        start(async () => {
          if (file instanceof File && file.size > 0) {
            const size = await dimensions(file);
            if (size) {
              form.set("width", String(size.width));
              form.set("height", String(size.height));
            }
          }
          const r = await replaceMedia(id, form);
          setMessage({ ok: r.ok, text: r.message });
          if (r.ok) router.refresh();
        });
      }}
    >
      {message && <Notice tone={message.ok ? "success" : "danger"}>{message.text}</Notice>}
      <input
        type="file"
        name="file"
        accept={TYPES.join(",")}
        required
        aria-label="Replacement image"
        className="block w-full text-sm text-silver file:mr-4 file:border file:border-line-strong file:bg-deep file:px-4 file:py-2 file:font-mono file:text-xs file:uppercase file:tracking-[0.18em] file:text-ice"
      />
      <label className="flex items-start gap-3 text-sm text-silver">
        <input type="checkbox" name="consent_confirmed" className="mt-0.5 size-4 accent-cyan" />
        <span>Everyone recognisable in the new photograph agreed to it being published.{inUse && " Required, because this image is in use."}</span>
      </label>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Replacing…" : "Replace image"}
      </Button>
    </form>
  );
}
