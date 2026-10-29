import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

interface AdminTarget {
  uid?: string;
  email?: string;
}

function flagValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  const value = process.argv[idx + 1];
  return value && value.length > 0 ? value : undefined;
}

async function main(): Promise<void> {
  const byUid = flagValue("--uid");
  const byEmail = flagValue("--email");

  if (!byUid && !byEmail) {
    throw new Error("Provide either --uid <uid> or --email <email>");
  }

  const app = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) })
    : admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID ?? "",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
          privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim(),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

  const auth = app.auth();
  const user = byUid ? await auth.getUser(byUid) : await auth.getUserByEmail(byEmail as string);
  await auth.setCustomUserAttributes(user.uid, { admin: true });

  process.stdout.write(JSON.stringify({ uid: user.uid, email: user.email ?? "", admin: true }, null, 2));
}

main().then(
  () => process.exit(0),
  (err) => {
    process.stderr.write(`Failed to set admin claim: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
);
