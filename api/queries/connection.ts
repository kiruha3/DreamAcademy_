import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const globalForDb = globalThis as unknown as {
  conn: mysql.Connection | undefined;
};

export const conn =
  globalForDb.conn ??
  (await mysql.createConnection(env.DATABASE_URL));

if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema: { ...schema, ...relations }, mode: "default" });
