import { handle, ok } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

/** POST /api/auth/logout — clear the session cookie. */
export const POST = handle(async () => {
  await clearSessionCookie();
  return ok({ ok: true });
});
