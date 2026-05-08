import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { AUTH_COOKIE_NAME, authCookieOptions } from "./cookies";
import { createToken, verifyToken, type TokenPayload } from "./jwt";

export async function setAuthCookie(
  c: Context,
  payload: TokenPayload
): Promise<void> {
  const token = await createToken(payload);
  setCookie(c, AUTH_COOKIE_NAME, token, authCookieOptions);
}

export function clearAuthCookie(c: Context): void {
  deleteCookie(c, AUTH_COOKIE_NAME, { path: "/" });
}

export async function getUserFromCookie(
  c: Context
): Promise<TokenPayload | null> {
  const token = getCookie(c, AUTH_COOKIE_NAME);
  if (!token) return null;

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export function getAuthTokenFromHeader(c: Context): string | null {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export async function getUserFromHeader(
  c: Context
): Promise<TokenPayload | null> {
  const token = getAuthTokenFromHeader(c);
  if (!token) return null;

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}
