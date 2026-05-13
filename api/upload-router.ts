import { z } from "zod";
import { router, authedProcedure } from "./trpc";
import { TRPCError } from "@trpc/server";
import { getPresignedUploadUrl, getPublicUrl } from "./lib/s3";
import { nanoid } from "nanoid";

const CONTENT_TYPE_LIMITS: Record<string, { maxSize: number; folder: string }> = {
  "text/html": { maxSize: 5 * 1024 * 1024, folder: "html" },
  "application/pdf": { maxSize: 10 * 1024 * 1024, folder: "pdf" },
  "application/zip": { maxSize: 50 * 1024 * 1024, folder: "zip" },
  "application/x-zip-compressed": { maxSize: 50 * 1024 * 1024, folder: "zip" },
  "image/jpeg": { maxSize: 5 * 1024 * 1024, folder: "images" },
  "image/png": { maxSize: 5 * 1024 * 1024, folder: "images" },
  "image/webp": { maxSize: 5 * 1024 * 1024, folder: "images" },
};

export const uploadRouter = router({
  getPresignedUrl: authedProcedure
    .input(
      z.object({
        filename: z.string().min(1),
        contentType: z.string(),
        fileSize: z.number().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const config = CONTENT_TYPE_LIMITS[input.contentType];

      if (!config) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Content type "${input.contentType}" is not allowed`,
        });
      }

      if (input.fileSize > config.maxSize) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `File size exceeds limit of ${config.maxSize / 1024 / 1024}MB`,
        });
      }

      const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `uploads/${config.folder}/${nanoid()}-${safeFilename}`;

      const presignedUrl = await getPresignedUploadUrl(key, input.contentType, 600);
      const publicUrl = getPublicUrl(key);

      return { presignedUrl, publicUrl, key };
    }),
});
