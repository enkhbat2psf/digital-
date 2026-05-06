import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { storagePut, storageGet } from "./storage";
import { ENV } from "./_core/env";
import { TRPCError } from "@trpc/server";

export const storageRouter = router({
  put: publicProcedure
    .input(
      z.object({
        key: z.string(),
        data: z.array(z.number()),
        contentType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ENV.allowPublicUpload && !ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const buffer = Buffer.from(input.data);
      const { url, key } = await storagePut(input.key, buffer, input.contentType);
      return { url, key };
    }),

  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const url = await storageGet(input.key);
      return { url };
    }),
});
