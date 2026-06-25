import { handle, ok } from "@/lib/api";
import { publicConfig } from "@/lib/config";

export const runtime = "nodejs";

/** GET /api/config — public, cacheable client config. */
export const GET = handle(async () => {
  return ok(publicConfig, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
});
