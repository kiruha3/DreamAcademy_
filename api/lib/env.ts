import { z } from "zod";

const envSchema = z.object({
  APP_ID: z.string().min(1),
  APP_SECRET: z.string().min(32),
  DATABASE_URL: z.string().min(1),
  OWNER_UNION_ID: z.string().min(1),
  S3_REGION: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_PUBLIC_URL: z.string().url(),
  KIMI_AUTH_URL: z.string().url().optional().or(z.literal("")),
  KIMI_OPEN_URL: z.string().url().optional().or(z.literal("")),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = parsed.data;
