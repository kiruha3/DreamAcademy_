import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, authedProcedure, publicProcedure } from "./trpc";
import { db } from "./queries/connection";
import { certificates } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const certificateRouter = router({
  getMyCertificates: authedProcedure.query(async ({ ctx }) => {
    const certs = await db.query.certificates.findMany({
      where: eq(certificates.userId, ctx.user.userId),
      with: {
        programVersion: {
          with: {
            program: {
              columns: { id: true, slug: true, title: true },
            },
          },
        },
      },
      orderBy: desc(certificates.issuedAt),
    });

    return { items: certs };
  }),

  getByNumber: publicProcedure
    .input(z.object({ number: z.string() }))
    .query(async ({ input }) => {
      const cert = await db.query.certificates.findFirst({
        where: eq(certificates.certificateNumber, input.number),
        with: {
          user: {
            columns: { id: true, name: true },
          },
          programVersion: {
            with: {
              program: {
                columns: { id: true, title: true },
              },
            },
          },
        },
      });

      if (!cert) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Certificate not found",
        });
      }

      return cert;
    }),
});
