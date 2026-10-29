import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin, ADMIN_SESSION_COOKIE } from "../_lib/auth";
import { getFirebaseAdmin } from "../_lib/firebase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) {
    const status = auth.status === 429 ? 429 : auth.status;
    const message = status === 429 ? "Too many requests" : status === 401 ? "Unauthorized" : "Forbidden";
    return res.status(status).json({ error: message });
  }

  const firebaseAuth = getFirebaseAdmin().auth();
  await firebaseAuth.revokeRefreshTokens(auth.ok ? auth.uid : "");

  res.setHeader(
    "Set-Cookie",
    `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );

  return res.status(200).json({ ok: true });
}
