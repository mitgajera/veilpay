import { getDb, schema } from "@/db";
import { handle, ok, badRequest } from "@/lib/api";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/waitlist — join the pre-launch waitlist with { email }. Idempotent. */
export const POST = handle(async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { email?: string; source?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL.test(email)) {
    return badRequest("Enter a valid email address");
  }

  // onConflictDoNothing: re-joining with the same email is a friendly no-op.
  await getDb()
    .insert(schema.waitlist)
    .values({ email, source: body.source?.slice(0, 64) ?? "landing" })
    .onConflictDoNothing({ target: schema.waitlist.email });

  return ok({ joined: true });
});
