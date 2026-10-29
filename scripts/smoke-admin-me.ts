import handler from "../api/admin/me";

function makeRes() {
  const res: Record<string, unknown> = { statusCode: 0, body: null as unknown };
  (res as any).status = (c: number) => {
    (res as any).statusCode = c;
    return res;
  };
  (res as any).json = async (b: unknown) => {
    (res as any).body = b;
    return res;
  };
  (res as any).end = async () => res;
  return res as any;
}

async function call(method: string, headers: Record<string, string>, query: Record<string, string> = {}) {
  const res = makeRes();
  await handler({ method, headers, query } as never, res);
  return { status: res.statusCode as number, body: res.body };
}

async function main() {
  // 1. No token at all → expect 401
  const noToken = await call("GET", {});
  console.log("NO_TOKEN_RESULT", JSON.stringify(noToken));

  // 2. Bearer token present but invalid → expect 401
  const badToken = await call("GET", { authorization: "Bearer not-a-real-id-token" });
  console.log("BAD_TOKEN_RESULT", JSON.stringify(badToken));

  // 3. Method not allowed → expect 405
  const methodNotAllowed = await call("POST", { authorization: "Bearer not-a-real-id-token" });
  console.log("METHOD_NOT_ALLOWED_RESULT", JSON.stringify(methodNotAllowed));
}

void main();
