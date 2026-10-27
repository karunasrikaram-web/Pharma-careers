import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) {
  console.warn(
    "[pharma-careers] TURSO_DATABASE_URL is not set for this deployment. " +
      "Pages that read the database will return an error until the Turso variables are configured.",
  );
}

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-src 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Render metadata as blocking tags in <head> for every client. Without this,
  // dynamically rendered pages stream metadata at the end of <body>, where some
  // crawlers and audit tools do not detect the meta description.
  htmlLimitedBots: /.*/,
  serverExternalPackages: ["@libsql/client"],
  experimental: {
    serverActions: {
      // Resumes are limited to 5 MB in the action; the transport limit needs
      // headroom for the multipart envelope and the remaining form fields.
      bodySizeLimit: "6mb",
    },
  },
  outputFileTracingIncludes: {
    "/**": ["./db/migrations/**/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
