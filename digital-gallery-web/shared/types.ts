/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

export interface GalleryImage {
  id: number;
  albumId: number;
  title: string;
  description?: string | null;
  imageUrl: string;
  imageKey: string;
  uploadedBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Album {
  id: number;
  name: string;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}
