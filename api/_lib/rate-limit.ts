type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function consume(key: string, max: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (bucket.count >= max) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientIp(req: { headers?: Record<string, unknown> }): string {
  const headers = req.headers ?? {};
  const fwd = headers["x-forwarded-for"];
  const fwdStr = Array.isArray(fwd) ? fwd[0] : fwd;
  const ip = typeof fwdStr === "string" ? fwdStr.split(",")[0].trim() : "";
  if (ip) return ip;
  const real = headers["x-real-ip"];
  const realStr = Array.isArray(real) ? real[0] : real;
  if (typeof realStr === "string" && realStr) return realStr;
  return "unknown";
}
