import { handle, ok } from "@/lib/api";

export const runtime = "nodejs";

/** GET /api/health — liveness. */
export const GET = handle(async () => ok({ status: "ok", time: new Date().toISOString() }));
