import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../trpc";
import { db } from "../queries/connection";
import {
  modules,
  moduleVersions,
  moduleContents,
} from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const adminModuleRouter = router({
  list: adminProcedure
    .input(
      z.object({
        courseVersionId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const items = await db.query.modules.findMany({
        where: eq(modules.courseVersionId, input.courseVersionId),
        orderBy: modules.sortOrder,
        with: {
          versions: {
            orderBy: desc(moduleVersions.versionNumber),
            limit: 1,
          },
        },
      });

      return { items };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const moduleItem = await db.query.modules.findFirst({
        where: eq(modules.id, input.id),
        with: {
          courseVersion: true,
          versions: {
            orderBy: desc(moduleVersions.versionNumber),
            limit: 1,
          },
        },
      });

      if (!moduleItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
      }

      const latestVersion = moduleItem.versions[0];
      let contents: (typeof moduleContents.$inferSelect)[] = [];

      if (latestVersion) {
        contents = await db.query.moduleContents.findMany({
          where: eq(moduleContents.moduleVersionId, latestVersion.id),
        });
      }

      return { ...moduleItem, contents };
    }),

  create: adminProcedure
    .input(
      z.object({
        courseVersionId: z.number(),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        moduleType: z.enum(["common", "employee", "partner", "integrator"]).default("common"),
        isMandatory: z.boolean().default(true),
        isLocked: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      // Get max sort_order
      const maxOrder = await db
        .select({ max: sql<number>`COALESCE(MAX(${modules.sortOrder}), 0)` })
        .from(modules)
        .where(eq(modules.courseVersionId, input.courseVersionId));

      const sortOrder = (maxOrder[0]?.max ?? 0) + 1;

      const [moduleRow] = await db.insert(modules).values({
        courseVersionId: input.courseVersionId,
        sortOrder,
        title: input.title,
        description: input.description ?? null,
        moduleType: input.moduleType,
        isMandatory: input.isMandatory,
        isLocked: input.isLocked,
      });

      const moduleId = Number(moduleRow.insertId);

      // Auto-create module version v1 (draft)
      await db.insert(moduleVersions).values({
        moduleId,
        versionNumber: 1,
        status: "draft",
      });

      return { id: moduleId };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        moduleType: z.enum(["common", "employee", "partner", "integrator"]).optional(),
        isMandatory: z.boolean().optional(),
        isLocked: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const existing = await db.query.modules.findFirst({
        where: eq(modules.id, id),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
      }

      await db
        .update(modules)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(modules.id, id));

      return { success: true };
    }),

  reorder: adminProcedure
    .input(
      z.object({
        courseVersionId: z.number(),
        orderedIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        for (let i = 0; i < input.orderedIds.length; i++) {
          await tx
            .update(modules)
            .set({ sortOrder: i + 1 })
            .where(
              and(
                eq(modules.id, input.orderedIds[i]),
                eq(modules.courseVersionId, input.courseVersionId)
              )
            );
        }
      });

      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(modules).where(eq(modules.id, input.id));
      return { success: true };
    }),
});
