import React, { useEffect, useState, useMemo } from "react";
import { motion, usePresence } from "framer-motion";

interface TelegramVanishWrapperProps {
  children: React.ReactNode;
  hospitalColor?: string;
}

interface Particle {
  id: number;
  startX: string;
  startY: string;
  driftX: number;
  driftY: number;
  size: number;
  delay: number;
}

export function TelegramVanishWrapper({ children, hospitalColor = "#3b82f6" }: TelegramVanishWrapperProps) {
  const [isPresent, safeToRemove] = usePresence();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!isPresent) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        safeToRemove();
      }, 1300); // Wait for the extended majestic particle drift to complete
      return () => clearTimeout(timer);
    }
  }, [isPresent, safeToRemove]);

  // Generate random particles distributed across the card's original bounds
  const particles = useMemo<Particle[]>(() => {
    if (!isExiting) return [];
    return Array.from({ length: 40 }).map((_, i) => {
      const startX = 5 + Math.random() * 90; // percentage from left
      const startY = 10 + Math.random() * 80; // percentage from top
      const driftX = (Math.random() - 0.5) * 140; // float slightly sideways (wider spread)
      const driftY = -120 - Math.random() * 140; // float upwards significantly higher
      const size = 2.5 + Math.random() * 5.0; // random particle sizing
      const delay = Math.random() * 0.32; // wider staggered launch delay
      return {
        id: i,
        startX: `${startX}%`,
        startY: `${startY}%`,
        driftX,
        driftY,
        size,
        delay,
      };
    });
  }, [isExiting]);

  return (
    <motion.div
      layout
      style={{ willChange: "transform" }}
      className="relative overflow-visible w-full"
    >
      {/* Collapsing height container */}
      <motion.div
        layout
        initial={{ height: "auto", opacity: 1 }}
        animate={{
          height: isExiting ? 0 : "auto",
          transition: {
            duration: 0.75, // slower and smoother layout collapse
            delay: 0.22, // delay start to let card dissolve first
            ease: [0.16, 1, 0.3, 1], // Custom ultra-smooth decelerate curve (similar to iOS)
          },
        }}
        style={{
          overflow: "hidden",
        }}
      >
        <motion.div
          animate={{
            opacity: isExiting ? 0 : 1,
            scale: isExiting ? 0.90 : 1,
            filter: isExiting ? "blur(5px)" : "blur(0px)",
            transition: { duration: 0.35, ease: "easeOut" }, // slower dissolve
          }}
        >
          {children}
        </motion.div>
      </motion.div>

      {/* Particle explosion rendered in overflow: visible overlay container */}
      {isExiting && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full z-50"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: hospitalColor,
                left: p.startX,
                top: p.startY,
                boxShadow: `0 0 6px ${hospitalColor}c0`,
              }}
              initial={{ x: 0, y: 0, opacity: 0.95, scale: 1 }}
              animate={{
                x: p.driftX,
                y: p.driftY,
                opacity: 0,
                scale: 0,
                transition: {
                  duration: 0.95, // slower majestic drift
                  delay: p.delay,
                  ease: [0.1, 0.8, 0.25, 1], // custom organic slowing-down curve
                },
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
