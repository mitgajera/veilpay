import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { serverConfig } from "@/lib/config";

const COOKIE_NAME = "veilpay_session";
const ALG = "HS256";
const SESSION_TTL = "7d";

function secret() {
  return new TextEncoder().encode(serverConfig.jwtSecret());
}

export type Session = { address: string };

export async function createSession(address: string): Promise<string> {
  return new SignJWT({ address })
    .setProtectedHeader({ alg: ALG })
    .setSubject(address)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secret());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    if (typeof payload.address !== "string") return null;
    return { address: payload.address };
  } catch {
    return null;
  }
}

/** Read the current session from the request cookie (server components / route handlers). */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Throw-style guard for route handlers that require auth. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
