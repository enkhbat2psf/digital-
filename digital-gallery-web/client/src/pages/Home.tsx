import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl, isOAuthConfigured } from "@/const";
import { trpc } from "@/lib/trpc";
import HeroSection from "@/components/HeroSection";
// GalleryGrid is used on album pages; Home shows albums list.
import { useLocation } from "wouter";
import type { Album } from "@shared/types";
import { toast } from "sonner";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const publicUpload = import.meta.env.VITE_PUBLIC_UPLOAD === "true" || import.meta.env.VITE_PUBLIC_UPLOAD === "1";
  const canManage =
    isAuthenticated &&
    (user?.role === "admin" || user?.openId === import.meta.env.VITE_OWNER_OPEN_ID);
  const canWrite = publicUpload || canManage;

  const { data: albums = [], refetch } = trpc.album.list.useQuery();
  const createAlbumMutation = trpc.album.create.useMutation();
  const deleteAlbumMutation = trpc.album.delete.useMutation();

  const [newAlbumName, setNewAlbumName] = useState("");
  const [busyAlbumId, setBusyAlbumId] = useState<number | null>(null);
  const albumCards = useMemo(() => (albums as Album[]), [albums]);

  const handleCreate = async () => {
    if (!canWrite) return;
    const name = newAlbumName.trim();
    if (!name) {
      toast.error("Album name is required");
      return;
    }
    try {
      await createAlbumMutation.mutateAsync({ name });
      setNewAlbumName("");
      await refetch();
      toast.success("Album created");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create album (DB migrate хэрэгтэй байж магадгүй)");
    }
  };

  const handleDelete = async (id: number) => {
    if (!canWrite) return;
    if (!confirm("Delete this album and all its images?")) return;
    setBusyAlbumId(id);
    try {
      await deleteAlbumMutation.mutateAsync({ id });
      await refetch();
      toast.success("Album deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete album");
    } finally {
      setBusyAlbumId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-black bg-opacity-80 backdrop-blur-md border-b border-gray-800">
        <div className="container flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-lime-400 rounded-lg" />
            <span className="text-xl font-bold text-white">Gallery</span>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-300">{user?.name}</span>
                <button
                  onClick={() => {
                    // Logout handled by auth hook
                    window.location.href = "/api/auth/logout";
                  }}
                  className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                >
                  Logout
                </button>
              </div>
            ) : isOAuthConfigured() ? (
              <a
                href={getLoginUrl()}
                className="px-4 py-2 bg-lime-400 text-black font-semibold rounded hover:bg-lime-300 transition-colors text-sm"
              >
                Login
              </a>
            ) : (
              <span
                className="px-4 py-2 rounded text-sm text-gray-500 border border-gray-700 cursor-default"
                title="Set VITE_OAUTH_PORTAL_URL and VITE_APP_ID in .env for login"
              >
                Login (not configured)
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16 md:pt-20">
        {/* Hero Section */}
        <HeroSection />

        <section className="py-16 md:py-24 bg-white dark:bg-black">
          <div className="container">
            <div className="flex items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="text-4xl md:text-5xl font-black text-black dark:text-white">
                  Albums
                </h2>
                <div className="w-16 h-1 bg-lime-400 mt-4" />
              </div>

              {canWrite && (
                <div className="flex items-center gap-2">
                  <input
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="New album name"
                    className="bg-gray-900 text-white border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-lime-400"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={!newAlbumName.trim() || createAlbumMutation.isPending}
                    className="px-4 py-2 bg-lime-400 text-black font-semibold rounded hover:bg-lime-300 disabled:opacity-50 transition-colors text-sm"
                  >
                    {createAlbumMutation.isPending ? "Creating..." : "Create"}
                  </button>
                </div>
              )}
            </div>

            {albumCards.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400">
                No albums yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {albumCards.map((album) => (
                  <div
                    key={album.id}
                    className="bg-gray-900 rounded-lg border border-gray-800 p-6 hover:border-gray-700 transition-colors"
                  >
                    <button
                      onClick={() => setLocation(`/album/${album.id}`)}
                      className="w-full text-left"
                    >
                      <div className="text-white font-bold text-lg mb-1">
                        {album.name}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Album #{album.id}
                      </div>
                    </button>

                    {canWrite && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => handleDelete(album.id)}
                          disabled={busyAlbumId === album.id}
                          className="px-3 py-2 bg-red-900 text-white rounded hover:bg-red-800 disabled:opacity-50 transition-colors text-sm"
                        >
                          {busyAlbumId === album.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-12 md:py-16">
        <div className="container text-center">
          <p className="text-gray-400 mb-2">
            © 2026 Digital Gallery. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm">
            Crafted with attention to detail
          </p>
        </div>
      </footer>
    </div>
  );
}
