import { useState } from "react";
import { motion } from "framer-motion";
import Lightbox from "./Lightbox";
import type { GalleryImage } from "@shared/types";

type Props = {
  images: GalleryImage[];
  isLoading?: boolean;
  title?: string;
};

export default function GalleryGrid({ images, isLoading = false, title = "Gallery" }: Props) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleImageClick = (image: GalleryImage, index: number) => {
    setSelectedImage(image);
    setSelectedIndex(index);
  };

  const handleNext = () => {
    const nextIndex = (selectedIndex + 1) % images.length;
    setSelectedImage(images[nextIndex]);
    setSelectedIndex(nextIndex);
  };

  const handlePrev = () => {
    const prevIndex = (selectedIndex - 1 + images.length) % images.length;
    setSelectedImage(images[prevIndex]);
    setSelectedIndex(prevIndex);
  };

  if (isLoading) {
    return (
      <section className="py-16 md:py-24 bg-white dark:bg-black">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (images.length === 0) {
    return (
      <section className="py-16 md:py-24 bg-white dark:bg-black">
        <div className="container text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No images yet. Check back soon!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-white dark:bg-black">
      <div className="container">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-black text-black dark:text-white">{title}</h2>
          <div className="w-16 h-1 bg-lime-400 mt-4" />
        </motion.div>

        {/* Masonry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => handleImageClick(image, index)}
              className="group relative overflow-hidden rounded-lg cursor-pointer aspect-square"
            >
              <img
                src={image.imageUrl}
                alt={image.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                <h3 className="text-white font-bold text-lg mb-2">
                  {image.title}
                </h3>
                {image.description && (
                  <p className="text-gray-200 text-sm line-clamp-2">
                    {image.description}
                  </p>
                )}
              </div>

              {/* Lime Green Accent on Hover */}
              <div className="absolute top-0 left-0 w-1 h-0 bg-lime-400 group-hover:h-full transition-all duration-300" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <Lightbox
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onNext={handleNext}
          onPrev={handlePrev}
          currentIndex={selectedIndex}
          totalImages={images.length}
        />
      )}
    </section>
  );
}
