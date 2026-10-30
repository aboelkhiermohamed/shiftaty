import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
} from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Clock,
  Wallet,
  Building2,
  Users,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShiftCard } from "@/components/shifts/ShiftCard";
import { TelegramVanishWrapper } from "@/components/shifts/TelegramVanishWrapper";
import { useAppStore } from "@/stores/appStore";
import { calculateFixedSalariesForShifts } from "@/lib/hospitalUtils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Shifts() {
  const navigate = useNavigate();
  const shifts = useAppStore((state) => state.shifts);
  const hospitals = useAppStore((state) => state.hospitals);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterMode, setFilterMode] = useState<"month" | "all">("month");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayLimit, setDisplayLimit] = useState(40);

  const prevMonth = () => {
    setCurrentMonth((m) => subMonths(m, 1));
    setDisplayLimit(40);
  };
  const nextMonth = () => {
    setCurrentMonth((m) => addMonths(m, 1));
    setDisplayLimit(40);
  };

  // Filter shifts based on mode (month vs all) and search query
  const filteredShifts = useMemo(() => {
    let result = [...shifts];

    if (filterMode === "month") {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      result = result.filter((s) => {
        const d = new Date(s.date);
        return d >= monthStart && d <= monthEnd;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((s) => {
        const hospital = hospitals.find((h) => h.id === s.hospitalId);
        const hospitalName = hospital?.name.toLowerCase() || "";
        const notes = (s.notes || "").toLowerCase();
        return hospitalName.includes(q) || notes.includes(q);
      });
    }

    // Sort newest to oldest
    return result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [shifts, currentMonth, filterMode, searchQuery, hospitals]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalShifts = filteredShifts.length;
    const totalCases = filteredShifts.reduce((acc, s) => acc + (s.casesCount || 0), 0);

    const totalHours = filteredShifts.reduce((sum, s) => {
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      let mins = eh * 60 + em - (sh * 60 + sm);
      if (mins <= 0) mins += 24 * 60;
      return sum + Math.round((mins / 60) * 100) / 100;
    }, 0);

    const baseEarnings = filteredShifts.reduce(
      (sum, s) => sum + (s.totalEarnings || 0),
      0
    );
    const fixedSalaries =
      filterMode === "month"
        ? calculateFixedSalariesForShifts(filteredShifts, hospitals, shifts)
        : 0;
    const totalEarnings = baseEarnings + fixedSalaries;

    return {
      totalShifts,
      totalCases,
      totalHours,
      totalEarnings,
    };
  }, [filteredShifts, hospitals, shifts, filterMode]);

  return (
    <AppLayout>
      <PageHeader
        title="Shifts"
        subtitle="Manage and view your shift records"
        action={
          <Button
            size="sm"
            onClick={() => navigate("/add-shift")}
            className="rounded-xl flex items-center gap-1.5 shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Shift</span>
          </Button>
        }
      />

      <div className="px-4 space-y-4">
        {/* Controls: Mode Switch & Month Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Mode Switch Tabs */}
          <div className="flex items-center bg-secondary/80 p-1 rounded-xl self-start">
            <button
              onClick={() => {
                setFilterMode("month");
                setDisplayLimit(40);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterMode === "month"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              By Month
            </button>
            <button
              onClick={() => {
                setFilterMode("all");
                setDisplayLimit(40);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterMode === "all"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Shifts ({shifts.length})
            </button>
          </div>

          {/* Month Selector (if in month mode) */}
          {filterMode === "month" && (
            <div className="flex items-center bg-card rounded-xl p-1 border border-border shadow-sm self-stretch sm:self-auto justify-between">
              <button
                onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center hover:bg-secondary rounded-lg transition-colors text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-foreground px-3">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <button
                onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center hover:bg-secondary rounded-lg transition-colors text-muted-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search shifts by hospital or notes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setDisplayLimit(40);
            }}
            className="pl-10 h-11 bg-card rounded-xl border-border"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-secondary/40 rounded-2xl border border-border/60">
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Shifts
            </span>
            <span className="text-base font-extrabold text-foreground">
              {stats.totalShifts}
            </span>
          </div>
          <div className="text-center border-x border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Hours
            </span>
            <span className="text-base font-extrabold text-foreground">
              {stats.totalHours}h
            </span>
          </div>
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Earnings
            </span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 truncate block">
              {stats.totalEarnings.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Shifts List */}
        <div className="space-y-3 pt-1">
          {filteredShifts.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center border border-border space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-muted-foreground">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No shifts found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "No shifts recorded for this period"}
                </p>
              </div>
              <Button
                onClick={() => navigate("/add-shift")}
                size="sm"
                className="rounded-xl mt-2"
              >
                Log a Shift
              </Button>
            </div>
          ) : (
            <>
              <AnimatePresence mode="popLayout" initial={false}>
                {filteredShifts.slice(0, displayLimit).map((shift) => {
                  const hospital = hospitals.find((h) => h.id === shift.hospitalId);
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

              {filteredShifts.length > displayLimit && (
                <div className="pt-2 pb-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => setDisplayLimit((prev) => prev + 40)}
                    className="rounded-xl px-5 text-xs font-semibold touch-feedback bg-card shadow-sm border-border"
                  >
                    Show More ({filteredShifts.length - displayLimit} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
