import { getUserDetailResume } from "@/lib/user-details";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function asciiFileName(name: string): string {
  const cleaned = name
    .replace(/[^\x20-\x7e]+/g, "_")
    .replace(/["\\]/g, "_")
    .trim();
  return cleaned || "resume.pdf";
}

export async function GET(_request: Request, { params }: { params: Params }) {
  await requireAdmin();

  const { id } = await params;
  const resume = await getUserDetailResume(id);
  if (!resume) {
    return new Response("Resume not found.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const filename = asciiFileName(resume.name);
  const bytes = new Uint8Array(resume.data);

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": resume.mime,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
