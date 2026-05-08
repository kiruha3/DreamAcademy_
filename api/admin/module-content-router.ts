import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../trpc";
import { db } from "../queries/connection";
import { moduleContents } from "@db/schema";
import { eq } from "drizzle-orm";

export const adminModuleContentRouter = router({
  getByModuleVersionId: adminProcedure
    .input(z.object({ moduleVersionId: z.number() }))
    .query(async ({ input }) => {
      const items = await db.query.moduleContents.findMany({
        where: eq(moduleContents.moduleVersionId, input.moduleVersionId),
      });
      return { items };
    }),

  upsert: adminProcedure
    .input(
      z.object({
        id: z.number().optional(),
        moduleVersionId: z.number(),
        contentType: z.enum(["html_zip", "pdf", "rutube"]),
        s3Key: z.string().optional(),
        s3Checksum: z.string().optional(),
        rutubeVideoId: z.string().optional(),
        rutubeUrl: z.string().optional(),
        durationSeconds: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      if (id) {
        const existing = await db.query.moduleContents.findFirst({
          where: eq(moduleContents.id, id),
        });

        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Content not found" });
        }

        await db
          .update(moduleContents)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(moduleContents.id, id));

        return { id, updated: true };
      }

      const [row] = await db.insert(moduleContents).values(data);
      return { id: Number(row.insertId), created: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(moduleContents).where(eq(moduleContents.id, input.id));
      return { success: true };
    }),
});
