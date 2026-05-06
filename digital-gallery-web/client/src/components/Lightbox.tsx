import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { GalleryImage } from "@shared/types";
import { useEffect, useMemo, useState } from "react";

interface LightboxProps {
  image: GalleryImage;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentIndex: number;
  totalImages: number;
}

export default function Lightbox({
  image,
  onClose,
  onNext,
  onPrev,
  currentIndex,
  totalImages,
}: LightboxProps) {
  const [direction, setDirection] = useState<1 | -1>(1);

  const normalizeImageSrc = (url: string) => {
    if (!url) return url;
    return url.startsWith("/") ? `${window.location.origin}${url}` : url;
  };

  const imageVariants = useMemo(
    () => ({
      enter: (dir: 1 | -1) => ({
        x: dir === 1 ? 40 : -40,
        opacity: 0,
        scale: 0.98,
      }),
      center: {
        x: 0,
        opacity: 1,
        scale: 1,
      },
      exit: (dir: 1 | -1) => ({
        x: dir === 1 ? -40 : 40,
        opacity: 0,
        scale: 0.98,
      }),
    }),
    []
  );

  const goNext = () => {
    setDirection(1);
    onNext();
  };

  const goPrev = () => {
    setDirection(-1);
    onPrev();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
      >
        {/* Close Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onClose}
          className="absolute top-6 right-6 text-white hover:text-lime-400 transition-colors z-60"
          aria-label="Close lightbox"
        >
          <X size={32} />
        </motion.button>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-6 max-w-4xl w-full"
        >
          {/* Image */}
          <div className="relative w-full aspect-auto max-h-[70vh] overflow-hidden rounded-lg">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.img
                key={image.id}
                custom={direction}
                variants={imageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 320, damping: 32 },
                  opacity: { duration: 0.18 },
                  scale: { duration: 0.18 },
                }}
                src={normalizeImageSrc(image.imageUrl)}
                alt={image.title}
                className="w-full h-full object-contain"
                draggable={false}
              />
            </AnimatePresence>
          </div>

          {/* Image Info */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={image.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="text-center w-full"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {image.title}
              </h2>
              {image.description && (
                <p className="text-gray-300 text-base md:text-lg max-w-2xl mx-auto">
                  {image.description}
                </p>
              )}
              <div className="mt-4 text-sm text-gray-400">
                {currentIndex + 1} / {totalImages}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center gap-6 mt-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={goPrev}
              className="text-lime-400 hover:text-lime-300 transition-colors p-2"
              aria-label="Previous image"
            >
              <ChevronLeft size={32} />
            </motion.button>

            <div className="flex gap-2">
              {[...Array(Math.min(totalImages, 5))].map((_, i) => (
                <motion.div
                  key={i}
                  className={`h-1 transition-all ${
                    i === currentIndex % 5
                      ? "bg-lime-400 w-8"
                      : "bg-gray-600 w-2"
                  }`}
                />
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={goNext}
              className="text-lime-400 hover:text-lime-300 transition-colors p-2"
              aria-label="Next image"
            >
              <ChevronRight size={32} />
            </motion.button>
          </div>
        </motion.div>

        {/* Keyboard Navigation Hint */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-gray-400 text-sm">
          Press ESC to close • ← → to navigate
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
