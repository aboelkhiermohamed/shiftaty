import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Wallet, Calendar, Users, Clock, Cloud, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { FeaturedStatCard } from "@/components/dashboard/FeaturedStatCard";
import { ShiftCard } from "@/components/shifts/ShiftCard";
import { TelegramVanishWrapper } from "@/components/shifts/TelegramVanishWrapper";
import { IncomeBreakdown } from "@/components/dashboard/IncomeBreakdown";
import { useAppStore } from "@/stores/appStore";
import { calculateFixedSalariesForShifts } from "@/lib/hospitalUtils";

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const shifts = useAppStore((state) => state.shifts);
  const hospitals = useAppStore((state) => state.hospitals);
  const userProfile = useAppStore((state) => state.userProfile);
  const isSyncing = useAppStore((state) => state.isSyncing);
  const hasUnsyncedChanges = useAppStore((state) => state.hasUnsyncedChanges);
  const syncData = useAppStore((state) => state.syncData);
  const isPrivacyMode = useAppStore((state) => state.isPrivacyMode);
  const setPrivacyMode = useAppStore((state) => state.setPrivacyMode);
  const setSideMenuOpen = useAppStore((state) => state.setSideMenuOpen);
  const navigate = useNavigate();

  const monthlyStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const monthShifts = shifts.filter((s) => {
      const shiftDate = new Date(s.date);
      return shiftDate >= monthStart && shiftDate <= monthEnd;
    });

    const totalShifts = monthShifts.length;
    const totalPatients = monthShifts.reduce((sum, s) => sum + s.casesCount, 0);
    
    const totalIncome = monthShifts.reduce((sum, s) => sum + s.totalEarnings, 0) +
      calculateFixedSalariesForShifts(monthShifts, hospitals, shifts);

    const totalHours = monthShifts.reduce((sum, s) => {
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      let mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins <= 0) mins += 24 * 60; // handle overnight shifts
      return sum + Math.round((mins / 60) * 100) / 100;
    }, 0);

    return {
      totalShifts,
      totalPatients,
      totalIncome,
      totalHours,
      recentShifts: monthShifts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  }, [shifts, currentMonth]);

  const prevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const nextMonth = () => setCurrentMonth((m) => addMonths(m, 1));

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const displayName = userProfile?.name || "Doctor";

  return (
    <AppLayout>
      <div className="px-4 pt-3 pb-10 space-y-4">
        {/* Greeting and Profile Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setSideMenuOpen(true)}
              aria-label="Open Side Menu"
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1C1C1E] hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-foreground touch-feedback transition-colors shrink-0 border border-slate-200/80 dark:border-white/5 active:scale-95 shadow-sm"
            >
              <Menu className="w-5 h-5 text-slate-700 dark:text-white/80" />
            </button>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-white/40 flex items-center gap-1">
                {greeting} <span className="text-sm">👋</span>
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
                {displayName}
              </h1>
            </div>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="flex-shrink-0 relative active:scale-95 transition-transform"
            aria-label="Profile"
          >
            <div className="w-10 h-10 rounded-full border-2 border-primary/20 dark:border-white/10 overflow-hidden shadow-sm">
              {userProfile?.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Month Selector & Sync Status */}
        <div className="flex items-center justify-between gap-2 h-10">
          <div className="flex items-center bg-slate-100 dark:bg-[#1C1C1E] rounded-xl p-1 border border-slate-200/80 dark:border-white/5 shadow-sm">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-white/10 rounded-lg transition-all active:scale-90 text-slate-500 dark:text-white/50"
              aria-label="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="px-3 min-w-[110px] flex items-center justify-center">
              <span className="text-xs font-bold text-slate-800 dark:text-white/90 text-center tracking-tight">
                {format(currentMonth, "MMMM yyyy")}
              </span>
            </div>

            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-white/10 rounded-lg transition-all active:scale-90 text-slate-500 dark:text-white/50"
              aria-label="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (!isSyncing) syncData();
            }}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-[#1C1C1E] border border-slate-200/60 dark:border-white/5 hover:bg-slate-200/60 dark:hover:bg-white/10 active:scale-95 transition-all outline-none"
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              isSyncing ? "bg-amber-500 animate-pulse" : 
              hasUnsyncedChanges ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" : 
              "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            )} />
            <span className={cn(
              "text-[10px] font-bold tracking-wider uppercase",
              isSyncing ? "text-amber-500" :
              hasUnsyncedChanges ? "text-orange-500" : 
              "text-emerald-600 dark:text-emerald-400"
            )}>
              {isSyncing ? "Syncing" : hasUnsyncedChanges ? "Unsynced" : "Synced"}
            </span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <FeaturedStatCard
            title="Total Income"
            value={(monthlyStats.totalIncome || 0).toLocaleString()}
            subtitle="Revenue this month"
            isPrivacyMode={isPrivacyMode}
            onTogglePrivacy={() => setPrivacyMode(!isPrivacyMode)}
          />

          <StatCard
            title="Shifts"
            value={monthlyStats.totalShifts}
            subtitle="completed"
            icon={Calendar}
            variant="success"
          />
          <StatCard
            title="Total Hours"
            value={monthlyStats.totalHours.toString()}
            subtitle="worked this month"
            icon={Clock}
            variant="warning"
          />
        </div>

        {/* Income Breakdown */}
        <div>
          <IncomeBreakdown month={currentMonth} isPrivacyMode={isPrivacyMode} />
        </div>

        {/* Recent Shifts */}
        <div className="space-y-3 pt-1">
          {/* Section Header */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-wider">
              Monthly Shifts
            </h2>
            <button
              onClick={() => navigate("/shifts")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 active:scale-95 transition-transform"
            >
              <span>View All Shifts</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {monthlyStats.recentShifts.length === 0 ? (
            <div className="bg-card rounded-2xl p-7 text-center border border-border/80">
              <div className="w-11 h-11 rounded-2xl bg-secondary/80 mx-auto flex items-center justify-center text-muted-foreground mb-2.5">
                <Calendar className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">No shifts this month</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tap "Add Shift" to log your first shift
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {monthlyStats.recentShifts.map((shift) => {
                  const hospital = hospitals.find(h => h.id === shift.hospitalId);
                  return (
                    <TelegramVanishWrapper
                      key={shift.id}
                      hospitalColor={hospital?.color}
                    >
                      <ShiftCard shift={shift} delay={0} />
                    </TelegramVanishWrapper>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
