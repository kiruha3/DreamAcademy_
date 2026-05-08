import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../trpc";
import { db } from "../queries/connection";
import {
  courses,
  courseVersions,
  modules,
  moduleVersions,
} from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const adminCourseRouter = router({
  list: adminProcedure
    .input(
      z.object({
        programVersionId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const items = await db.query.courses.findMany({
        where: eq(courses.programVersionId, input.programVersionId),
        orderBy: courses.sortOrder,
        with: {
          versions: {
            orderBy: desc(courseVersions.versionNumber),
            limit: 1,
          },
        },
      });

      return { items };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, input.id),
        with: {
          programVersion: true,
          versions: {
            orderBy: desc(courseVersions.versionNumber),
            limit: 1,
          },
        },
      });

      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      // Get modules for the latest course version
      const latestVersion = course.versions[0];
      let modulesList: Array<
        typeof modules.$inferSelect & { versions: (typeof moduleVersions.$inferSelect)[] }
      > = [];

      if (latestVersion) {
        modulesList = await db.query.modules.findMany({
          where: eq(modules.courseVersionId, latestVersion.id),
          orderBy: modules.sortOrder,
          with: {
            versions: {
              orderBy: desc(moduleVersions.versionNumber),
              limit: 1,
            },
          },
        });
      }

      return { ...course, modules: modulesList };
    }),

  create: adminProcedure
    .input(
      z.object({
        programVersionId: z.number(),
        slug: z.string().min(1).max(100),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        targetRole: z.enum(["all", "employee", "partner", "integrator"]).default("all"),
        isMandatory: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await db.query.courses.findFirst({
        where: and(
          eq(courses.programVersionId, input.programVersionId),
          eq(courses.slug, input.slug)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Course with this slug already exists in this program version",
        });
      }

      // Get max sort_order
      const maxOrder = await db
        .select({ max: sql<number>`COALESCE(MAX(${courses.sortOrder}), 0)` })
        .from(courses)
        .where(eq(courses.programVersionId, input.programVersionId));

      const sortOrder = (maxOrder[0]?.max ?? 0) + 1;

      const [courseRow] = await db.insert(courses).values({
        programVersionId: input.programVersionId,
        sortOrder,
        slug: input.slug,
        title: input.title,
        description: input.description ?? null,
        targetRole: input.targetRole,
        isMandatory: input.isMandatory,
      });

      const courseId = Number(courseRow.insertId);

      // Auto-create course version v1 (draft)
      await db.insert(courseVersions).values({
        courseId,
        versionNumber: 1,
        status: "draft",
      });

      return { id: courseId };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        slug: z.string().min(1).max(100).optional(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        targetRole: z.enum(["all", "employee", "partner", "integrator"]).optional(),
        isMandatory: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const existing = await db.query.courses.findFirst({
        where: eq(courses.id, id),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      await db
        .update(courses)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(courses.id, id));

      return { success: true };
    }),

  reorder: adminProcedure
    .input(
      z.object({
        programVersionId: z.number(),
        orderedIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        for (let i = 0; i < input.orderedIds.length; i++) {
          await tx
            .update(courses)
            .set({ sortOrder: i + 1 })
            .where(
              and(
                eq(courses.id, input.orderedIds[i]),
                eq(courses.programVersionId, input.programVersionId)
              )
            );
        }
      });

      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(courses).where(eq(courses.id, input.id));
      return { success: true };
    }),
});
