/**
 * Local dev API server — serves the real `api/` serverless handlers on
 * http://localhost:3001 so the Vite proxy (`/api` → :3001) works in `npm run dev`.
 * No logic lives here: each request is delegated to the exact same handler
 * files that deploy to Vercel.
 *
 * Run: npx tsx scripts/dev-api.ts   (or via `npm run dev`, which runs both)
 */
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── load .env.local before any handler reads process.env ───────────────────
try {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
} catch {
  // no .env.local — handlers will report unconfigured env as usual
}

const PORT = 3001;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: any, res: any) => Promise<unknown>;

const handlerCache = new Map<string, Handler>();

async function loadHandler(route: string): Promise<Handler | null> {
  const cached = handlerCache.get(route);
  if (cached) return cached;
  if (!/^[a-z0-9/_-]+$/i.test(route)) return null; // path-traversal guard
  try {
    const mod = (await import(`../api/${route}`)) as { default?: Handler };
    if (typeof mod.default !== "function") return null;
    handlerCache.set(route, mod.default);
    return mod.default;
  } catch {
    return null;
  }
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolveBody) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      // 5 MB cap: application submissions carry a base64 resume (~3 MB file
      // → ~4 MB base64). Mirrors the ~4.5 MB Vercel body limit.
      if (raw.length > 5_000_000) req.destroy();
    });
    req.on("end", () => {
      if (!raw) return resolveBody({});
      try {
        resolveBody(JSON.parse(raw) as Record<string, unknown>);
      } catch {
        resolveBody({});
      }
    });
    req.on("error", () => resolveBody({}));
  });
}

function parseQuery(url: URL): Record<string, string> {
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  return query;
}

async function respond(req: IncomingMessage, res: ServerResponse, route: string) {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const handler = await loadHandler(route);
  if (!handler) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: `No API route for /api${url.pathname.replace("/api", "")}` }));
    return;
  }

  const headers: Record<string, string | string[] | undefined> = { ...req.headers };
  // The browser sends no X-Forwarded-For locally; synthesize one per socket
  // so per-IP rate limiting behaves like it will in production.
  if (!headers["x-forwarded-for"]) {
    headers["x-forwarded-for"] = req.socket.remoteAddress ?? "127.0.0.1";
  }

  const request = {
    method: req.method ?? "GET",
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? {} : await readBody(req),
    query: parseQuery(url),
    cookies: {},
  };

  let status = 200;
  const outHeaders: Record<string, string> = {};

  const response = {
    status(code: number) {
      status = code;
      return response;
    },
    json(payload: unknown) {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      for (const [k, v] of Object.entries(outHeaders)) res.setHeader(k, v);
      res.end(JSON.stringify(payload));
      return response;
    },
    end() {
      res.statusCode = status;
      for (const [k, v] of Object.entries(outHeaders)) res.setHeader(k, v);
      res.end();
      return response;
    },
    setHeader(key: string, value: string) {
      outHeaders[String(key).toLowerCase()] = String(value);
      return response;
    },
    getHeader(key: string) {
      return outHeaders[String(key).toLowerCase()];
    },
  };

  try {
    await handler(request, response);
    if (!res.writableEnded) {
      res.statusCode = status;
      res.end();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api] ${req.method} ${url.pathname} → error:`, message);
    if (!res.writableEnded) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
}

createServer((req, res) => {
  const url = req.url ?? "/";
  if (!url.startsWith("/api")) {
    res.statusCode = 404;
    res.end("This is the local API server. Use the Vite dev server on :5173.");
    return;
  }
  const route = url.replace(/^\/api\//, "").split("?")[0];
  void respond(req, res, route);
}).listen(PORT, () => {
  console.log(`[api] local dev API on http://localhost:${PORT} (serving api/*.ts handlers)`);
});
