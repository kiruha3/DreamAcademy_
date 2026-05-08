import { db } from "./queries/connection";
import type { TokenPayload } from "./lib/jwt";

export interface TrpcContext {
  user: TokenPayload | null;
  db: typeof db;
  req: Request;
  resHeaders: Headers;
  [key: string]: unknown;
}

export async function createContext({
  req,
  resHeaders,
}: {
  req: Request;
  resHeaders: Headers;
}): Promise<TrpcContext> {
  return {
    user: null,
    db,
    req,
    resHeaders,
  };
}
