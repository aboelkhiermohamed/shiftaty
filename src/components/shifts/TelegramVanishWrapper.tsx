import React from "react";
import { motion } from "framer-motion";

interface TelegramVanishWrapperProps {
  children: React.ReactNode;
  hospitalColor?: string;
}

/**
 * High-performance smooth card wrapper.
 * Replaces the heavy particle vanish canvas/DOM loop that lagged and got stuck
 * with a buttery-smooth 60/120fps hardware-accelerated fade & scale exit.
 */
export const TelegramVanishWrapper = React.memo(function TelegramVanishWrapper({ children }: TelegramVanishWrapperProps) {
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.95,
        y: -4,
        transition: { duration: 0.15, ease: "easeOut" },
      }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
});

