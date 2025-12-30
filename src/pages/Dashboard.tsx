import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Wallet, Calendar, Users, TrendingUp } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { ShiftCard } from "@/components/shifts/ShiftCard";
import { IncomeBreakdown } from "@/components/dashboard/IncomeBreakdown";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/appStore";

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const shifts = useAppStore((state) => state.shifts);
  const hospitals = useAppStore((state) => state.hospitals);

  const monthlyStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const monthShifts = shifts.filter((s) => {
      const shiftDate = new Date(s.date);
      return shiftDate >= monthStart && shiftDate <= monthEnd;
    });

    const totalShifts = monthShifts.length;
    const totalPatients = monthShifts.reduce((sum, s) => sum + s.casesCount, 0);
    const totalIncome = monthShifts.reduce((sum, s) => sum + s.totalEarnings, 0);

    return {
      totalShifts,
      totalPatients,
      totalIncome,
      recentShifts: monthShifts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  }, [shifts, currentMonth]);

  const prevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const nextMonth = () => setCurrentMonth((m) => addMonths(m, 1));

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, Doctor`}
      />

      {/* Month Selector */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between bg-card rounded-xl p-3 shadow-sm border border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 grid grid-cols-2 gap-3">
        <StatCard
          title="Total Income"
          value={`${monthlyStats.totalIncome.toLocaleString()}`}
          subtitle="EGP this month"
          icon={Wallet}
          variant="primary"
          delay={0}
        />
        <StatCard
          title="Shifts"
          value={monthlyStats.totalShifts}
          subtitle="completed"
          icon={Calendar}
          variant="success"
          delay={0.1}
        />
        <StatCard
          title="Patients"
          value={monthlyStats.totalPatients}
          subtitle="examined"
          icon={Users}
          variant="accent"
          delay={0.2}
        />
        <StatCard
          title="Avg/Shift"
          value={
            monthlyStats.totalShifts > 0
              ? Math.round(monthlyStats.totalIncome / monthlyStats.totalShifts).toLocaleString()
              : 0
          }
          subtitle="EGP"
          icon={TrendingUp}
          variant="warning"
          delay={0.3}
        />
      </div>

      {/* Income Breakdown */}
      <div className="px-4 mt-6">
        <IncomeBreakdown month={currentMonth} />
      </div>

      {/* Recent Shifts */}
      <div className="px-4 mt-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="font-semibold text-foreground mb-3">Monthly Shifts</h3>

          {monthlyStats.recentShifts.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center border border-border">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No shifts this month</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tap "Add Shift" to log your first shift
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthlyStats.recentShifts.map((shift, index) => (
                <ShiftCard key={shift.id} shift={shift} delay={0.5 + index * 0.05} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
