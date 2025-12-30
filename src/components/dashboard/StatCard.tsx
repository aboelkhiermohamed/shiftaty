import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "primary" | "success" | "warning" | "accent";
  className?: string;
  delay?: number;
}

const variantStyles = {
  primary: "stat-card-primary",
  success: "stat-card-success",
  warning: "stat-card-warning",
  accent: "stat-card-accent",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "primary",
  className,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className={cn(
        "rounded-2xl p-4 text-primary-foreground shadow-lg",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium opacity-80 uppercase tracking-wide">
            {title}
          </p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs opacity-70 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-2 rounded-xl bg-white/20">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
