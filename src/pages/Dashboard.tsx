import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Wallet, Calendar, Users, Clock, Cloud, User } from "lucide-react";
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
      <div className="px-2 pt-6 pb-6 space-y-5">
        {/* Greeting and Profile */}
        <div className="flex items-start justify-between px-2 mt-6 gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {greeting}, <span className="inline-flex items-center gap-2 whitespace-nowrap">
                {displayName}
                <motion.span
                  animate={{ rotate: [0, 15, -10, 15, 0] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    repeatDelay: 1,
                    ease: "easeInOut",
                  }}
                  className="inline-block"
                  style={{ transformOrigin: "bottom right" }}
                >
                  👋
                </motion.span>
              </span>
            </h1>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="flex-shrink-0 relative group active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-white/10 overflow-hidden shadow-md">
              {userProfile?.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Month Selector & Sync Status */}
        <div className="flex items-center justify-between px-2 mt-6 h-12">
          <div className="flex items-center bg-slate-100 dark:bg-[#1C1C1E]/80 rounded-2xl p-1.5 border border-slate-200 dark:border-white/5 shadow-sm transition-colors duration-300">
            <button
              onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all active:scale-90 text-slate-400 dark:text-white/40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="px-4 min-w-[120px] flex items-center justify-center">
              <span className="text-[13px] font-bold text-slate-700 dark:text-white/90 text-center tracking-tight translate-y-[0.5px]">
                {format(currentMonth, "MMMM yyyy")}
              </span>
            </div>

            <button
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all active:scale-90 text-slate-400 dark:text-white/40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pr-1 h-full pt-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (!isSyncing) syncData();
              }}
              disabled={isSyncing}
              className="flex items-center gap-2 translate-y-[-1px] hover:opacity-80 active:scale-95 transition-all outline-none"
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                isSyncing ? "bg-amber-500 animate-pulse" : 
                hasUnsyncedChanges ? "bg-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.4)]" : 
                "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              )} />
              <span className={cn(
                "text-[10px] font-black tracking-[0.1em] uppercase",
                isSyncing ? "text-amber-500" :
                hasUnsyncedChanges ? "text-orange-500/80" : 
                "text-slate-400 dark:text-emerald-500/60"
              )}>
                {isSyncing ? "Syncing" : hasUnsyncedChanges ? "Unsynced" : "Synced"}
              </span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          className="px-2 grid grid-cols-2 gap-3"
          style={{ willChange: "transform, opacity" }}
        >
          <FeaturedStatCard
            title="Total Income"
            value={(monthlyStats.totalIncome || 0).toLocaleString()}
            subtitle="Revenue this month"
            delay={0.1}
            isPrivacyMode={isPrivacyMode}
            onTogglePrivacy={() => setPrivacyMode(!isPrivacyMode)}
          />

          <StatCard
            title="Shifts"
            value={monthlyStats.totalShifts}
            subtitle="completed"
            icon={Calendar}
            variant="success"
            delay={0.2}
          />
          <StatCard
            title="Total Hours"
            value={monthlyStats.totalHours.toString()}
            subtitle="worked this month"
            icon={Clock}
            variant="warning"
            delay={0.3}
          />
        </div>

        {/* Income Breakdown */}
        <div className="px-2 mt-6" style={{ willChange: "transform, opacity" }}>
          <IncomeBreakdown month={currentMonth} isPrivacyMode={isPrivacyMode} />
        </div>

        {/* Recent Shifts */}
        <div className="px-2 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            style={{ willChange: "transform, opacity" }}
          >
            {/* Sections Header */}
            <h2 className="px-3 text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] mb-4">
              Monthly Shifts
            </h2>

            {monthlyStats.recentShifts.length === 0 ? (
              <div className="bg-card rounded-xl p-8 text-center border border-border">
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ willChange: "transform" }}
                >
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                </motion.div>
                <p className="text-muted-foreground">No shifts this month</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tap "Add Shift" to log your first shift
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout" key={format(currentMonth, "yyyy-MM")}>
                  {monthlyStats.recentShifts.map((shift, index) => {
                    const hospital = hospitals.find(h => h.id === shift.hospitalId);
                    return (
                      <TelegramVanishWrapper
                        key={shift.id}
                        hospitalColor={hospital?.color}
                      >
                        <ShiftCard shift={shift} delay={0.1 + index * 0.03} />
                      </TelegramVanishWrapper>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
