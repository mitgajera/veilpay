import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Wrap a route handler so thrown auth/errors become clean JSON responses. */
export function handle<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof UnauthorizedError) return unauthorized();
      console.error("[api] unhandled error:", err);
      const message = err instanceof Error ? err.message : "Internal error";
      return serverError(message);
    }
  };
}

/** JSON.stringify replacer-safe serialization of bigint amounts. */
export function jsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}
