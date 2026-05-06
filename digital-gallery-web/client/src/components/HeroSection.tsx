import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <section className="relative w-full min-h-screen bg-black text-white overflow-hidden">
      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 md:mb-20"
        >
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-tight mb-4 md:mb-6">
            Digital
            <br />
            <span className="text-lime-400">Gallery</span>
          </h1>
          <p className="text-lg md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Immerse yourself in a curated collection of stunning visual moments
          </p>
        </motion.div>
      </div>
    </section>
  );
}
