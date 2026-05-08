import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";


const SECRET = new TextEncoder().encode(env.APP_SECRET);

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  [key: string]: unknown;
}

export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, SECRET, {
    clockTolerance: 60,
  });
  return payload as unknown as TokenPayload;
}
