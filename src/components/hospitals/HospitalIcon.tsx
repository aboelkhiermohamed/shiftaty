import React from "react";
import { Hospital } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHospitalColor } from "@/lib/hospitalUtils";

interface HospitalIconProps {
  color?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  iconClassName?: string;
}

export function HospitalIcon({
  color,
  name,
  size = "md",
  className,
  iconClassName,
}: HospitalIconProps) {
  const finalColor = getHospitalColor({ color, name });

  const sizeClasses = {
    sm: "w-8 h-8 rounded-xl",
    md: "w-11 h-11 rounded-2xl",
    lg: "w-14 h-14 rounded-2xl",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 transition-transform duration-200 shadow-md",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: finalColor,
        boxShadow: `0 4px 14px ${finalColor}45`,
      }}
    >
      <Hospital
        className={cn("text-white stroke-[2.2]", iconSizes[size], iconClassName)}
      />
    </div>
  );
}
