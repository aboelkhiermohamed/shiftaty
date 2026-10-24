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
  primary: {
    container: "stat-card-primary text-primary-foreground border-transparent",
    iconContainer: "bg-white/20 text-white",
  },
  success: {
    container: "bg-card text-foreground border-border",
    iconContainer: "bg-success/15 text-success",
  },
  warning: {
    container: "bg-card text-foreground border-border",
    iconContainer: "bg-warning/15 text-warning",
  },
  accent: {
    container: "bg-card text-foreground border-border",
    iconContainer: "bg-accent/15 text-accent",
  },
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
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: "easeOut" }}
      style={{ willChange: "transform, opacity" }}
      className={cn(
        "rounded-2xl p-4 shadow-sm border",
        styles.container,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={cn(
            "text-xs font-medium uppercase tracking-wide",
            variant === 'primary' ? 'opacity-80' : 'text-muted-foreground'
          )}>
            {title}
          </p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className={cn(
              "text-xs mt-1",
              variant === 'primary' ? 'opacity-70' : 'text-muted-foreground'
            )}>{subtitle}</p>
          )}
        </div>
        <div className={cn("p-2 rounded-xl", styles.iconContainer)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
