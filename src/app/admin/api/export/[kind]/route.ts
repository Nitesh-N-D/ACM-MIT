import { NextResponse, type NextRequest } from "next/server";
import { EXPORTS, isExportKind, toCsv } from "@/lib/admin/exports";
import { adminAccess } from "@/lib/auth/session";

/**
 * CSV downloads for the export centre. Each export checks the role it needs,
 * reads through Row Level Security as the signed-in editor, and is written
 * to the activity log.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isExportKind(kind)) return NextResponse.json({ message: "Unknown export." }, { status: 404 });
  const def = EXPORTS[kind];
  const access = await adminAccess(def.roles);
  if (!access.ok) return NextResponse.json({ message: "Not authorised." }, { status: access.reason === "signed-out" ? 401 : 403 });

  const event = request.nextUrl.searchParams.get("event");
  const rows = await def.load(access.db, { event });
  if (rows === null) return NextResponse.json({ message: "The data could not be loaded just now. Please try again." }, { status: 502 });

  await access.db.rpc("log_admin_action", { p_action: "export", p_entity: kind, p_summary: `${rows.length} rows${event ? ` (event ${event})` : ""}` });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(def.columns, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nexus-${kind}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
