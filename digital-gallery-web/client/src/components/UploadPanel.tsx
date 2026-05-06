import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Trash2, Edit2, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { GalleryImage } from "@shared/types";

interface UploadPanelProps {
  albumId: number;
  images: GalleryImage[];
  onImageUploaded: () => void;
}

export default function UploadPanel({ albumId, images, onImageUploaded }: UploadPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.image.upload.useMutation();
  const updateMutation = trpc.image.update.useMutation();
  const deleteMutation = trpc.image.delete.useMutation();
  const storageUploadMutation = trpc.storage.put.useMutation();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.type.startsWith("image/")) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Please select an image file");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title) {
      toast.error("Please select an image and enter a title");
      return;
    }

    setIsUploading(true);
    try {
      const dataUrl = preview;
      const base64 = dataUrl?.includes("base64,") ? dataUrl.split("base64,")[1] : null;
      if (!base64) {
        throw new Error("Could not read file data. Please re-select the image and try again.");
      }
      
      const { url, key } = await storageUploadMutation.mutateAsync({
        key: `gallery/${Date.now()}-${selectedFile.name}`,
        dataBase64: base64,
        contentType: selectedFile.type,
      });

      await uploadMutation.mutateAsync({
        albumId,
        title,
        description,
        imageUrl: url,
        imageKey: key,
      });

      setSelectedFile(null);
      setPreview(null);
      setTitle("");
      setDescription("");
      toast.success("Image uploaded successfully!");
      onImageUploaded();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this image?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast.success("Image deleted successfully!");
        onImageUploaded();
      } catch (error) {
        console.error("Delete failed:", error);
        toast.error("Failed to delete image");
      }
    }
  };

  const handleSaveEdit = async (id: number) => {
    try {
      await updateMutation.mutateAsync({
        id,
        title: editTitle,
        description: editDescription,
      });
      setEditingId(null);
      toast.success("Image updated successfully!");
      onImageUploaded();
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Failed to update image");
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 z-40 bg-lime-400 text-black p-4 rounded-full shadow-lg hover:bg-lime-300 transition-colors"
        aria-label="Toggle upload panel"
      >
        <Upload size={24} />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="fixed right-0 top-0 h-screen w-full md:w-96 bg-black border-l border-gray-800 z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Upload Image</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Upload Form */}
              {!editingId && (
                <div className="mb-8">
                  {/* File Drop Area */}
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      dragActive
                        ? "border-lime-400 bg-lime-400 bg-opacity-10"
                        : "border-gray-600 hover:border-gray-500"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                    />
                    <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                    <p className="text-white font-semibold">
                      Drag and drop your image
                    </p>
                    <p className="text-gray-400 text-sm">or click to browse</p>
                  </div>

                  {/* Preview */}
                  {preview && (
                    <div className="mt-6">
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full rounded-lg mb-4"
                      />
                      <input
                        type="text"
                        placeholder="Image title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-gray-900 text-white border border-gray-700 rounded px-4 py-2 mb-4 focus:outline-none focus:border-lime-400"
                      />
                      <textarea
                        placeholder="Image description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-gray-900 text-white border border-gray-700 rounded px-4 py-2 mb-4 focus:outline-none focus:border-lime-400 resize-none h-24"
                      />
                      <button
                        onClick={handleUpload}
                        disabled={isUploading || !title}
                        className="w-full bg-lime-400 text-black font-bold py-2 rounded hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isUploading ? "Uploading..." : "Upload Image"}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setPreview(null);
                          setTitle("");
                          setDescription("");
                        }}
                        className="w-full mt-2 bg-gray-800 text-white py-2 rounded hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Gallery Management */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">
                  Your Images ({images.length})
                </h3>
                <div className="space-y-4">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800"
                    >
                      {editingId === image.id ? (
                        <div className="p-4">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 mb-3 focus:outline-none focus:border-lime-400"
                          />
                          <textarea
                            value={editDescription}
                            onChange={(e) =>
                              setEditDescription(e.target.value)
                            }
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 mb-3 focus:outline-none focus:border-lime-400 resize-none h-20"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                handleSaveEdit(image.id)
                              }
                              className="flex-1 bg-lime-400 text-black py-2 rounded hover:bg-lime-300 transition-colors flex items-center justify-center gap-2"
                            >
                              <Check size={16} /> Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="flex-1 bg-gray-800 text-white py-2 rounded hover:bg-gray-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <img
                            src={image.imageUrl}
                            alt={image.title}
                            className="w-full h-32 object-cover"
                          />
                          <div className="p-4">
                            <h4 className="text-white font-semibold mb-1">
                              {image.title}
                            </h4>
                            {image.description && (
                              <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                                {image.description}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingId(image.id);
                                  setEditTitle(image.title);
                                  setEditDescription(
                                    image.description || ""
                                  );
                                }}
                                className="flex-1 bg-gray-800 text-white py-2 rounded hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm"
                              >
                                <Edit2 size={14} /> Edit
                              </button>
                              <button
                                onClick={() => handleDelete(image.id)}
                                className="flex-1 bg-red-900 text-white py-2 rounded hover:bg-red-800 transition-colors flex items-center justify-center gap-2 text-sm"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
