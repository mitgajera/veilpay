import { randomBytes } from "crypto";
import { getDb, schema } from "@/db";
import { handle, ok, badRequest } from "@/lib/api";
import { isValidAddress, buildSiwsMessage } from "@/lib/siws";

export const runtime = "nodejs";

/** POST /api/auth/nonce — issue a one-time nonce + the exact message to sign. */
export const POST = handle(async (req: Request) => {
  const { address } = (await req.json().catch(() => ({}))) as { address?: string };
  if (!address || !isValidAddress(address)) return badRequest("Valid Solana address required");

  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  await getDb().insert(schema.authNonces).values({ nonce, address, expiresAt });

  const message = buildSiwsMessage({ address, nonce, issuedAt });
  return ok({ nonce, message });
});
