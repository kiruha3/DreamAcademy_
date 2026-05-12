import type { CookieOptions } from "hono/utils/cookie";
import { env } from "./env";

export const AUTH_COOKIE_NAME = "dreamdocs_auth";

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "Strict" : "Lax",
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: "/",
};

function serializeCookie(name: string, value: string, options: CookieOptions): string {
  let cookie = `${name}=${value}`;
  if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
  if (options.httpOnly) cookie += "; HttpOnly";
  if (options.secure) cookie += "; Secure";
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  if (options.path) cookie += `; Path=${options.path}`;
  return cookie;
}

export function setAuthCookieHeader(headers: Headers, token: string): void {
  headers.append("Set-Cookie", serializeCookie(AUTH_COOKIE_NAME, token, authCookieOptions));
}

export function clearAuthCookieHeader(headers: Headers): void {
  headers.append("Set-Cookie", `${AUTH_COOKIE_NAME}=; Max-Age=0; Path=/`);
}
