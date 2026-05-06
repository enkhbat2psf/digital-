import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { storageRouter } from "./storage-router";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createAlbum,
  createGalleryImage,
  deleteAlbum,
  deleteGalleryImage,
  getAlbumImages,
  getAlbums,
  updateGalleryImage,
} from "./db";
import { ENV } from "./_core/env";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

/** storagePut returns app paths like /manus-storage/... — z.string().url() rejects those */
const galleryImageUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) => {
      if (value.startsWith("/")) {
        return !value.includes("..");
      }
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid image URL" },
  );

function canManageGallery(user: User): boolean {
  if (user.role === "admin") return true;
  if (ENV.ownerOpenId && user.openId === ENV.ownerOpenId) return true;
  return false;
}

const albumNameSchema = z.string().trim().min(1).max(255);
type AuthedContext = TrpcContext & { user: NonNullable<TrpcContext["user"]> };

function canWrite(ctx: TrpcContext): boolean {
  if (ENV.allowPublicUpload) return true;
  return Boolean(ctx.user && canManageGallery(ctx.user));
}

export const appRouter = router({
  system: systemRouter,
  storage: storageRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }: { ctx: TrpcContext }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }: { ctx: TrpcContext }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  album: router({
    list: publicProcedure.query(async () => {
      return getAlbums();
    }),

    create: publicProcedure
      .input(z.object({ name: albumNameSchema }))
      .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: { name: string } }) => {
        if (!canWrite(ctx)) {
          throw new Error("Only the owner can create albums");
        }
        return createAlbum({
          name: input.name,
          createdBy: ctx.user?.id ?? 0,
        });
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: { id: number } }) => {
        if (!canWrite(ctx)) {
          throw new Error("Only the owner can delete albums");
        }
        return deleteAlbum(input.id);
      }),
  }),

  image: router({
    list: publicProcedure
      .input(z.object({ albumId: z.number() }))
      .query(async ({ input }: { input: { albumId: number } }) => {
        return getAlbumImages(input.albumId);
      }),

    upload: publicProcedure
      .input(
        z.object({
          albumId: z.number(),
          title: z.string().min(1),
          description: z.string().optional(),
          imageUrl: galleryImageUrlSchema,
          imageKey: z.string(),
        }),
      )
      .mutation(
        async ({
          ctx,
          input,
        }: {
          ctx: TrpcContext;
          input: {
            albumId: number;
            title: string;
            description?: string;
            imageUrl: string;
            imageKey: string;
          };
        }) => {
        if (!canWrite(ctx)) {
          throw new Error("Only the owner can upload images");
        }
        return createGalleryImage({
          albumId: input.albumId,
          title: input.title,
          description: input.description,
          imageUrl: input.imageUrl,
          imageKey: input.imageKey,
          uploadedBy: ctx.user?.id ?? 0,
        });
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: { id: number; title?: string; description?: string } }) => {
        if (!canWrite(ctx)) {
          throw new Error("Only the owner can update images");
        }
        return updateGalleryImage(input.id, {
          title: input.title,
          description: input.description,
        });
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }: { ctx: TrpcContext; input: { id: number } }) => {
        if (!canWrite(ctx)) {
          throw new Error("Only the owner can delete images");
        }
        return deleteGalleryImage(input.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
