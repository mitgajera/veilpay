import { and, eq, gt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { handle, ok, badRequest, unauthorized } from "@/lib/api";
import { verifySiwsSignature, isValidAddress } from "@/lib/siws";
import { createSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

/** POST /api/auth/verify — verify the signed message, mint a session, upsert the user. */
export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as {
    address?: string;
    message?: string;
    signature?: string;
    nonce?: string;
  };
  const { address, message, signature, nonce } = body;

  if (!address || !isValidAddress(address)) return badRequest("Valid address required");
  if (!message || !signature || !nonce) return badRequest("message, signature and nonce required");

  const db = getDb();

  // Nonce must exist, match the address, and not be expired.
  const [row] = await db
    .select()
    .from(schema.authNonces)
    .where(
      and(
        eq(schema.authNonces.nonce, nonce),
        eq(schema.authNonces.address, address),
        gt(schema.authNonces.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) return unauthorized("Nonce invalid or expired");

  if (!verifySiwsSignature({ message, signature, address })) {
    return unauthorized("Signature verification failed");
  }

  // Single-use: delete the nonce.
  await db.delete(schema.authNonces).where(eq(schema.authNonces.nonce, nonce));

  // Upsert the user.
  await db
    .insert(schema.users)
    .values({ address })
    .onConflictDoUpdate({ target: schema.users.address, set: { updatedAt: new Date() } });

  const token = await createSession(address);
  await setSessionCookie(token);

  return ok({ address });
});
