import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  CalendarDays,
  Plus,
  Building2,
  BarChart3,
  Activity,
  Calendar,
  Hospital,
  FileText,
  Grid,
  Clock,
  Building,
  PieChart,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/lib/utils";

const iconSets = {
  classic: {
    home: LayoutDashboard,
    shifts: CalendarDays,
    hospitals: Building2,
    reports: BarChart3,
  },
  medical: {
    home: Activity,
    shifts: Calendar,
    hospitals: Hospital,
    reports: FileText,
  },
  minimal: {
    home: Grid,
    shifts: Clock,
    hospitals: Building,
    reports: PieChart,
  },
};

export function BottomNav() {
  const location = useLocation();
  const navIconStyle = useAppStore((state) => state.navIconStyle);
  const currentSet =
    iconSets[navIconStyle as keyof typeof iconSets] || iconSets.classic;

  const HomeIcon = currentSet.home;
  const ShiftsIcon = currentSet.shifts;
  const HospitalsIcon = currentSet.hospitals;
  const ReportsIcon = currentSet.reports;

  const isHomeActive = location.pathname === "/";
  const isShiftsActive = location.pathname === "/shifts";
  const isHospitalsActive = location.pathname === "/hospitals";
  const isReportsActive = location.pathname === "/reports";
  const isAddActive = location.pathname === "/add-shift";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 dark:bg-[#121214]/95 backdrop-blur-xl border-t border-border/50 safe-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.12)] transition-colors duration-300">
      <div className="max-w-lg mx-auto grid grid-cols-5 items-center h-[66px] px-2 relative">
        {/* 1. Home */}
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={cn(
            "relative flex flex-col items-center justify-center h-full py-1.5 touch-feedback transition-colors group",
            isHomeActive
              ? "text-primary dark:text-[#60a5fa]"
              : "text-muted-foreground/70 hover:text-foreground"
          )}
        >
          <div className="relative flex items-center justify-center">
            <HomeIcon
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                isHomeActive
                  ? "scale-110 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  : "group-hover:scale-105"
              )}
            />
            {isHomeActive && (
              <motion.div
                layoutId="nav-dot"
                className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary dark:bg-[#60a5fa]"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
          </div>
          <span
            className={cn(
              "text-[10px] mt-1.5 font-bold tracking-tight transition-colors duration-200",
              isHomeActive
                ? "text-primary dark:text-[#60a5fa] font-extrabold"
                : "text-muted-foreground/80 font-medium"
            )}
          >
            Home
          </span>
        </Link>

        {/* 2. Shifts */}
        <Link
          to="/shifts"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={cn(
            "relative flex flex-col items-center justify-center h-full py-1.5 touch-feedback transition-colors group",
            isShiftsActive
              ? "text-primary dark:text-[#60a5fa]"
              : "text-muted-foreground/70 hover:text-foreground"
          )}
        >
          <div className="relative flex items-center justify-center">
            <ShiftsIcon
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                isShiftsActive
                  ? "scale-110 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  : "group-hover:scale-105"
              )}
            />
            {isShiftsActive && (
              <motion.div
                layoutId="nav-dot"
                className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary dark:bg-[#60a5fa]"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
          </div>
          <span
            className={cn(
              "text-[10px] mt-1.5 font-bold tracking-tight transition-colors duration-200",
              isShiftsActive
                ? "text-primary dark:text-[#60a5fa] font-extrabold"
                : "text-muted-foreground/80 font-medium"
            )}
          >
            Shifts
          </span>
        </Link>

        {/* 3. Center FAB: Add Shift */}
        <div className="flex flex-col items-center justify-center relative -top-3">
          <Link
            to="/add-shift"
            aria-label="Add Shift"
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full",
              "bg-gradient-to-tr from-blue-600 via-primary to-indigo-500 text-white",
              "shadow-[0_8px_18px_rgba(37,99,235,0.4)] hover:shadow-[0_10px_24px_rgba(37,99,235,0.55)]",
              "border-[3.5px] border-background dark:border-[#121214]",
              "active:scale-90 hover:scale-105 transition-all duration-200",
              isAddActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
          >
            <Plus className="w-6 h-6 stroke-[2.75]" />
          </Link>
          <span
            className={cn(
              "text-[9px] font-bold tracking-tight mt-1 text-center leading-none",
              isAddActive
                ? "text-primary dark:text-[#60a5fa]"
                : "text-muted-foreground/75"
            )}
          >
            Add
          </span>
        </div>

        {/* 4. Hospitals */}
        <Link
          to="/hospitals"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={cn(
            "relative flex flex-col items-center justify-center h-full py-1.5 touch-feedback transition-colors group",
            isHospitalsActive
              ? "text-primary dark:text-[#60a5fa]"
              : "text-muted-foreground/70 hover:text-foreground"
          )}
        >
          <div className="relative flex items-center justify-center">
            <HospitalsIcon
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                isHospitalsActive
                  ? "scale-110 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  : "group-hover:scale-105"
              )}
            />
            {isHospitalsActive && (
              <motion.div
                layoutId="nav-dot"
                className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary dark:bg-[#60a5fa]"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
          </div>
          <span
            className={cn(
              "text-[10px] mt-1.5 font-bold tracking-tight transition-colors duration-200",
              isHospitalsActive
                ? "text-primary dark:text-[#60a5fa] font-extrabold"
                : "text-muted-foreground/80 font-medium"
            )}
          >
            Hospitals
          </span>
        </Link>

        {/* 5. Reports */}
        <Link
          to="/reports"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={cn(
            "relative flex flex-col items-center justify-center h-full py-1.5 touch-feedback transition-colors group",
            isReportsActive
              ? "text-primary dark:text-[#60a5fa]"
              : "text-muted-foreground/70 hover:text-foreground"
          )}
        >
          <div className="relative flex items-center justify-center">
            <ReportsIcon
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                isReportsActive
                  ? "scale-110 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  : "group-hover:scale-105"
              )}
            />
            {isReportsActive && (
              <motion.div
                layoutId="nav-dot"
                className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary dark:bg-[#60a5fa]"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
          </div>
          <span
            className={cn(
              "text-[10px] mt-1.5 font-bold tracking-tight transition-colors duration-200",
              isReportsActive
                ? "text-primary dark:text-[#60a5fa] font-extrabold"
                : "text-muted-foreground/80 font-medium"
            )}
          >
            Reports
          </span>
        </Link>
      </div>
    </nav>
  );
}
