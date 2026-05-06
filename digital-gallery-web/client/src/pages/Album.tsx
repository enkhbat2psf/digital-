import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";
import GalleryGrid from "@/components/GalleryGrid";
import UploadPanel from "@/components/UploadPanel";

export default function AlbumPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/album/:id");
  const albumId = useMemo(() => Number(params?.id ?? NaN), [params?.id]);

  const { user, isAuthenticated } = useAuth();
  const { data: config } = trpc.system.config.useQuery();
  const publicUpload =
    config?.allowPublicUpload ??
    (import.meta.env.VITE_PUBLIC_UPLOAD === "true" ||
      import.meta.env.VITE_PUBLIC_UPLOAD === "1");
  const canManage =
    isAuthenticated &&
    (user?.role === "admin" || user?.openId === import.meta.env.VITE_OWNER_OPEN_ID);
  const canWrite = publicUpload || canManage;

  const { data: albums = [] } = trpc.album.list.useQuery();
  const album = albums.find(a => a.id === albumId);

  const {
    data: images = [],
    isLoading,
    refetch,
  } = trpc.image.list.useQuery(
    { albumId },
    { enabled: Number.isFinite(albumId) }
  );

  const deleteAlbumMutation = trpc.album.delete.useMutation();
  const [isDeletingAlbum, setIsDeletingAlbum] = useState(false);

  const handleDeleteAlbum = async () => {
    if (!canWrite) return;
    if (!Number.isFinite(albumId)) return;
    if (!confirm("Delete this album and all its images?")) return;
    setIsDeletingAlbum(true);
    try {
      await deleteAlbumMutation.mutateAsync({ id: albumId });
      setLocation("/");
    } finally {
      setIsDeletingAlbum(false);
    }
  };

  if (!Number.isFinite(albumId)) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Invalid album id
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="fixed top-0 left-0 right-0 z-40 bg-black bg-opacity-80 backdrop-blur-md border-b border-gray-800">
        <div className="container flex items-center justify-between h-16 md:h-20">
          <button
            onClick={() => setLocation("/")}
            className="text-sm text-gray-300 hover:text-white"
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-300">
              {album ? album.name : `Album #${albumId}`}
            </div>
            {canWrite && (
              <button
                onClick={handleDeleteAlbum}
                disabled={isDeletingAlbum}
                className="px-3 py-2 bg-red-900 text-white rounded hover:bg-red-800 disabled:opacity-50 transition-colors text-sm"
              >
                {isDeletingAlbum ? "Deleting..." : "Delete album"}
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-16 md:pt-20">
        <GalleryGrid
          images={images}
          isLoading={isLoading}
          title={album?.name ?? "Album"}
        />

        {canWrite && (
          <UploadPanel
            albumId={albumId}
            images={images}
            onImageUploaded={() => refetch()}
          />
        )}
      </main>
    </div>
  );
}

