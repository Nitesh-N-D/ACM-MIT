import { NextResponse, type NextRequest } from "next/server";
import { uploadMedia } from "@/app/actions/admin";

/**
 * Media upload endpoint for the command centre's uploader, which needs real
 * byte progress (XMLHttpRequest) and so cannot call the server action
 * directly. The action does all checks: role, file type by content, size.
 */
export async function POST(request: NextRequest) {
  // Same-origin only: a form on another site cannot post here with the
  // editor's cookies.
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ ok: false, message: "Uploads are only accepted from the command centre." }, { status: 403 });
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 6 * 1024 * 1024) return NextResponse.json({ ok: false, message: "That file is larger than 5 MB." }, { status: 413 });

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "The upload could not be read. Please try again." }, { status: 400 });
  }
  const result = await uploadMedia(data);
  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: { "Cache-Control": "no-store" } });
}
