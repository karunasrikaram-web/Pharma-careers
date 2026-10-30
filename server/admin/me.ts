import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAdmin(req);
  const failure = auth && !auth.ok ? auth : null;
  if (failure) {
    const status = failure.status === 429 ? 429 : failure.status;
    const message = status === 429 ? "Too many requests" : status === 401 ? "Unauthorized" : "Forbidden";
    return res.status(status).json({ error: message });
  }

  return res.status(200).json({ admin: true, uid: auth.ok ? auth.uid : "", email: auth.ok ? auth.email : "" });
}
