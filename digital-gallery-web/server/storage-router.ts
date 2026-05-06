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
        // Prefer base64 to avoid huge JSON payloads (number[] is extremely large).
        dataBase64: z.string().optional(),
        data: z.array(z.number()).optional(),
        contentType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ENV.allowPublicUpload && !ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const buffer = input.dataBase64
        ? Buffer.from(input.dataBase64, "base64")
        : Buffer.from(input.data ?? []);
      const { url, key } = await storagePut(input.key, buffer, input.contentType);
      const proto =
        (ctx.req.headers["x-forwarded-proto"] as string | undefined) ??
        ctx.req.protocol ??
        "https";
      const host =
        (ctx.req.headers["x-forwarded-host"] as string | undefined) ??
        (ctx.req.headers["host"] as string | undefined) ??
        "";
      const origin = host ? `${proto}://${host}` : "";
      const absoluteUrl = origin && url.startsWith("/") ? `${origin}${url}` : url;
      return { url: absoluteUrl, key };
    }),

  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const url = await storageGet(input.key);
      return { url };
    }),
});
