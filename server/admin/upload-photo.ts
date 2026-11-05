import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_lib/auth.js";
import { getSupabaseAdmin } from "../_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return res.status(auth.status === 429 ? 429 : 401).json({ error: auth.status === 429 ? "Too many requests" : "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as { fileName?: string; jobId?: string; dataBase64?: string; contentType?: string };
  const { fileName, jobId, dataBase64, contentType } = body;

  if (!fileName || !jobId || !dataBase64 || !contentType) {
    return res.status(400).json({ error: "Missing required fields: fileName, jobId, dataBase64, contentType" });
  }

  if (!contentType || !contentType.startsWith("image/")) {
    return res.status(400).json({ error: "Only image files are allowed" });
  }

  const buffer = Buffer.from(dataBase64, "base64");
  if (buffer.length > 5 * 1024 * 1024) {
    return res.status(400).json({ error: "File too large (max 5 MB)" });
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "png";
  const storagePath = `jobs/${jobId}/${Date.now()}.${ext}`;

  const db = getSupabaseAdmin();

  const { error: uploadError } = await db.storage
    .from("job-photos")
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    return res.status(500).json({ error: uploadError.message });
  }

  const { data: { publicUrl } } = db.storage.from("job-photos").getPublicUrl(storagePath);
  return res.status(200).json({ publicUrl });
}
