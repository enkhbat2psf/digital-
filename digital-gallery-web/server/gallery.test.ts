import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// Mock database functions
vi.mock("./db", () => ({
  getAlbums: vi.fn(async () => [
    {
      id: 10,
      name: "Test Album",
      createdBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  createAlbum: vi.fn(async (data) => ({ insertId: 1, ...data })),
  deleteAlbum: vi.fn(async () => ({ affectedRows: 1 })),
  getAlbumImages: vi.fn(async () => [
    {
      id: 1,
      albumId: 10,
      title: "Test Image",
      description: "A test image",
      imageUrl: "https://example.com/image.jpg",
      imageKey: "test-key",
      uploadedBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  createGalleryImage: vi.fn(async (data) => ({ insertId: 1, ...data })),
  updateGalleryImage: vi.fn(async () => ({ affectedRows: 1 })),
  deleteGalleryImage: vi.fn(async () => ({ affectedRows: 1 })),
}));

function createMockContext(user: User | null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

const mockOwner: User = {
  id: 1,
  openId: "owner-open-id",
  name: "Gallery Owner",
  email: "owner@example.com",
  loginMethod: "manus",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const mockUser: User = {
  id: 2,
  openId: "user-open-id",
  name: "Regular User",
  email: "user@example.com",
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("Gallery Procedures", () => {
  describe("album.list", () => {
    it("should return albums for public access", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.album.list();

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Test Album");
    });

    it("should return albums for authenticated users", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.album.list();

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Test Album");
    });
  });

  describe("image.list", () => {
    it("should return images for an album (public)", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.image.list({ albumId: 10 });
      expect(result).toHaveLength(1);
      expect(result[0]?.albumId).toBe(10);
    });
  });

  describe("image.upload", () => {
    it("should reject non-owner upload attempts", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.image.upload({
          albumId: 10,
          title: "Unauthorized Image",
          description: "Should fail",
          imageUrl: "https://example.com/image.jpg",
          imageKey: "key",
        })
      ).rejects.toThrow("Only the owner can upload images");
    });

    it("should reject unauthenticated upload attempts", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.image.upload({
          albumId: 10,
          title: "Unauthorized",
          description: "Should fail",
          imageUrl: "https://example.com/image.jpg",
          imageKey: "key",
        })
      ).rejects.toThrow();
    });

    it("should validate required fields", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.image.upload({
          albumId: 10,
          title: "",
          description: "Missing title",
          imageUrl: "https://example.com/image.jpg",
          imageKey: "key",
        })
      ).rejects.toThrow();
    });

    it("should validate image URL format", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.image.upload({
          albumId: 10,
          title: "Test",
          description: "Invalid URL",
          imageUrl: "not-a-url",
          imageKey: "key",
        })
      ).rejects.toThrow();
    });

    it("should accept app-relative URLs from storage (e.g. /manus-storage/...)", async () => {
      const ctx = createMockContext(mockOwner);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.image.upload({
          albumId: 10,
          title: "From Forge",
          description: "Relative path OK",
          imageUrl: "/manus-storage/gallery_abc12345.jpg",
          imageKey: "gallery_abc12345.jpg",
        })
      ).resolves.toMatchObject({ title: "From Forge" });
    });
  });

  describe("image.update", () => {
    it("should reject non-owner update attempts", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.image.update({
          id: 1,
          title: "Unauthorized Update",
        })
      ).rejects.toThrow("Only the owner can update images");
    });

    it("should reject unauthenticated update attempts", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.image.update({
          id: 1,
          title: "Unauthorized",
        })
      ).rejects.toThrow();
    });
  });

  describe("image.delete", () => {
    it("should reject non-owner delete attempts", async () => {
      const ctx = createMockContext(mockUser);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.image.delete({ id: 1 })).rejects.toThrow(
        "Only the owner can delete images"
      );
    });

    it("should reject unauthenticated delete attempts", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.image.delete({ id: 1 })).rejects.toThrow();
    });
  });

  describe("Authorization", () => {
    it("should correctly reject non-owner access", async () => {
      const userCtx = createMockContext(mockUser);
      const caller = appRouter.createCaller(userCtx);

      await expect(
        caller.image.upload({
          albumId: 10,
          title: "Test",
          description: "Should fail",
          imageUrl: "https://example.com/image.jpg",
          imageKey: "key",
        })
      ).rejects.toThrow("Only the owner can upload images");
    });

    it("should allow public album list access", async () => {
      const ctx = createMockContext(null);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.album.list();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
