import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertAlbum, InsertUser, albums, users, galleryImages, InsertGalleryImage } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAlbums() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(albums).orderBy(albums.createdAt);
  } catch (e) {
    console.warn("[Database] getAlbums failed (did you run migrations?):", e);
    return [];
  }
}

export async function createAlbum(album: InsertAlbum) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    return await db.insert(albums).values(album);
  } catch (e) {
    console.error("[Database] createAlbum failed:", e);
    throw new Error("Failed to create album. Run `npx drizzle-kit migrate` and retry.");
  }
}

export async function deleteAlbum(albumId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // galleryImages has FK ON DELETE CASCADE in migration, so images are removed automatically.
  try {
    return await db.delete(albums).where(eq(albums.id, albumId));
  } catch (e) {
    console.error("[Database] deleteAlbum failed:", e);
    throw new Error("Failed to delete album. Run `npx drizzle-kit migrate` and retry.");
  }
}

export async function getAlbumImages(albumId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.albumId, albumId))
      .orderBy(galleryImages.createdAt);
  } catch (e) {
    console.warn("[Database] getAlbumImages failed (did you run migrations?):", e);
    return [];
  }
}

export async function createGalleryImage(image: InsertGalleryImage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(galleryImages).values(image);
}

export async function updateGalleryImage(id: number, updates: Partial<InsertGalleryImage>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (Object.keys(updateData).length === 0) return { success: true };
  return db.update(galleryImages).set(updateData as any).where(eq(galleryImages.id, id));
}

export async function deleteGalleryImage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(galleryImages).where(eq(galleryImages.id, id));
}

// TODO: add feature queries here as your schema grows.
