import { createHash } from "node:crypto";

const DEVELOPMENT_SECRET =
  "development-only-app-secret-do-not-use-this-in-production-0000000000";

/**
 * Returns the application secret used for hashing IP addresses.
 * Fails closed in production when no strong secret is configured.
 */
export function getAppSecret(): string {
  const secret = process.env.APP_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "APP_SECRET is missing or too short. Set APP_SECRET to a random value of at least 32 characters.",
    );
  }

  return DEVELOPMENT_SECRET;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashIp(ip: string): string {
  return sha256(`${getAppSecret()}:ip:${ip}`);
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // fall through to the platform or local default
    }
  }

  // Vercel exposes the project's production domain and the current deployment
  // host without a scheme. Using them keeps canonical and Open Graph URLs
  // correct even when NEXT_PUBLIC_SITE_URL has not been configured.
  const platformHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (platformHost) {
    try {
      const withScheme = platformHost.includes("://")
        ? platformHost
        : `https://${platformHost}`;
      return new URL(withScheme).origin;
    } catch {
      // fall through to the local default
    }
  }

  return "http://localhost:3000";
}
