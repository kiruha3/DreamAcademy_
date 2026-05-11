import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../trpc";
import { db } from "../queries/connection";
import { users, userProgramEnrollments, programs, certificates } from "@db/schema";
import { eq, and, like, or, desc, count } from "drizzle-orm";
import { hashPassword } from "../lib/hash";
import { ROLES } from "@contracts/constants";

export const adminUserRouter = router({
  list: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
        role: z.enum(ROLES).optional(),
        status: z.enum(["active", "blocked", "pending"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const conditions = [];
      if (input?.search) {
        conditions.push(
          or(
            like(users.name, `%${input.search}%`),
            like(users.email, `%${input.search}%`)
          )
        );
      }
      if (input?.role) {
        conditions.push(eq(users.role, input.role));
      }
      if (input?.status) {
        conditions.push(eq(users.status, input.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db.query.users.findMany({
        where: whereClause,
        orderBy: desc(users.createdAt),
        limit,
        offset,
      });

      const totalResult = await db
        .select({ count: count() })
        .from(users)
        .where(whereClause);

      return {
        items,
        total: totalResult[0]?.count ?? 0,
        limit,
        offset,
      };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, input.id),
        with: {
          programProgress: {
            with: {
              programVersion: {
                with: {
                  program: true,
                },
              },
            },
          },
          certificates: {
            with: {
              programVersion: {
                with: {
                  program: true,
                },
              },
            },
          },
          enrollments: {
            with: {
              program: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return user;
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(ROLES),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      const passwordHash = await hashPassword(input.password);
      const [result] = await db.insert(users).values({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        status: "active",
      });

      return {
        id: Number(result.insertId),
        name: input.name,
        email: input.email,
        role: input.role,
      };
    }),

  block: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .update(users)
        .set({ status: "blocked" })
        .where(eq(users.id, input.id));

      return { success: true };
    }),

  unblock: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .update(users)
        .set({ status: "active" })
        .where(eq(users.id, input.id));

      return { success: true };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().optional(),
        role: z.enum(ROLES).optional(),
        password: z.string().min(8).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, password, ...fields } = input;

      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // If email is changing, check uniqueness
      if (fields.email && fields.email !== user.email) {
        const existing = await db.query.users.findFirst({
          where: eq(users.email, fields.email),
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User with this email already exists",
          });
        }
      }

      const updateData: Record<string, any> = { ...fields };
      if (password) {
        updateData.passwordHash = await hashPassword(password);
      }

      await db.update(users).set(updateData).where(eq(users.id, id));

      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.id === ctx.user.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot delete your own account",
        });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, input.id),
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      await db.delete(users).where(eq(users.id, input.id));

      return { success: true };
    }),

  assignProgram: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        programId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if program exists and is published
      const program = await db.query.programs.findFirst({
        where: eq(programs.id, input.programId),
      });

      if (!program) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Program not found" });
      }

      // Check if already assigned
      const existing = await db.query.userProgramEnrollments.findFirst({
        where: and(
          eq(userProgramEnrollments.userId, input.userId),
          eq(userProgramEnrollments.programId, input.programId),
          eq(userProgramEnrollments.revokedAt, null as any)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already assigned to this program",
        });
      }

      await db.insert(userProgramEnrollments).values({
        userId: input.userId,
        programId: input.programId,
        assignedBy: ctx.user.userId,
      });

      return { success: true };
    }),

  revokeProgram: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        programId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(userProgramEnrollments)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(userProgramEnrollments.userId, input.userId),
            eq(userProgramEnrollments.programId, input.programId),
            eq(userProgramEnrollments.revokedAt, null as any)
          )
        );

      return { success: true };
    }),

  stats: adminProcedure.query(async () => {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [activeCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, "active"));
    const [programCount] = await db
      .select({ count: count() })
      .from(programs);
    const [certCount] = await db
      .select({ count: count() })
      .from(certificates);

    return {
      users: userCount?.count ?? 0,
      activeUsers: activeCount?.count ?? 0,
      programs: programCount?.count ?? 0,
      certificates: certCount?.count ?? 0,
    };
  }),
});
