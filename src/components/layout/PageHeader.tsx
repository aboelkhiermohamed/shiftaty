import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  action?: React.ReactNode;
  showMenuButton?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  className,
  action,
  showMenuButton = true,
}: PageHeaderProps) {
  const setSideMenuOpen = useAppStore((state) => state.setSideMenuOpen);

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("px-4 pt-6 pb-4", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {showMenuButton && (
            <button
              onClick={() => setSideMenuOpen(true)}
              aria-label="Open Menu"
              className="mt-1 w-9 h-9 rounded-xl bg-secondary/80 hover:bg-secondary flex items-center justify-center text-foreground touch-feedback transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </motion.header>
  );
}
