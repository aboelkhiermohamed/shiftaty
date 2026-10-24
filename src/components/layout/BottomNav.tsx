import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, Plus, Building2, Settings, 
  Activity, PlusCircle, Hospital, UserCog,
  Grid, PlusSquare, Building, Sliders 
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/lib/utils";

const iconSets = {
  classic: { dashboard: LayoutDashboard, add: Plus, hospitals: Building2, settings: Settings },
  medical: { dashboard: Activity, add: PlusCircle, hospitals: Hospital, settings: UserCog },
  minimal: { dashboard: Grid, add: PlusSquare, hospitals: Building, settings: Sliders },
};

const navItems = [
  { path: "/", id: "dashboard", label: "Dashboard" },
  { path: "/add-shift", id: "add", label: "Add Shift" },
  { path: "/hospitals", id: "hospitals", label: "Hospitals" },
  { path: "/settings", id: "settings", label: "Settings" },
];

export function BottomNav() {
  const location = useLocation();
  const navIconStyle = useAppStore((state) => state.navIconStyle);
  const currentSet = iconSets[navIconStyle as keyof typeof iconSets] || iconSets.classic;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/70 backdrop-blur-md border-t border-border/50 safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.1)] transition-colors duration-300">
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = currentSet[item.id as keyof typeof currentSet];

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={cn(
                "relative flex flex-col items-center justify-center px-4 py-2 rounded-xl touch-feedback min-w-[70px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-primary/20 dark:bg-primary/10 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  style={{ willChange: "transform, opacity" }}
                />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 relative z-10 transition-all duration-300",
                  isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" : "opacity-60"
                )}
              />
              <span className={cn(
                "text-[10px] mt-1.5 font-bold relative z-10 tracking-tight transition-colors duration-300",
                isActive ? "text-primary dark:text-[#60a5fa]" : "text-muted-foreground/80 dark:text-white/60"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
