import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Share2,
  Calendar,
  Building2,
  Wallet,
  Clock,
  Users,
  Printer,
  ChevronDown,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  isWithinInterval,
} from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { HospitalIcon } from "@/components/hospitals/HospitalIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/appStore";
import { generateMonthlyReport } from "@/lib/pdfGenerator";
import { generateCsvReport } from "@/lib/csvGenerator";
import { calculateFixedSalariesForShifts, getHospitalDetails } from "@/lib/hospitalUtils";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

type DatePreset = "this-month" | "last-month" | "last-3-months" | "custom";

export default function Reports() {
  const { toast } = useToast();
  const shifts = useAppStore((state) => state.shifts);
  const hospitals = useAppStore((state) => state.hospitals);
  const userProfile = useAppStore((state) => state.userProfile);

  const [preset, setPreset] = useState<DatePreset>("this-month");
  const [startDateStr, setStartDateStr] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDateStr, setEndDateStr] = useState<string>(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [isExporting, setIsExporting] = useState<"pdf" | "csv" | null>(null);

  // Set date ranges when preset changes
  const handlePresetSelect = (selectedPreset: DatePreset) => {
    setPreset(selectedPreset);
    const now = new Date();

    if (selectedPreset === "this-month") {
      setStartDateStr(format(startOfMonth(now), "yyyy-MM-dd"));
      setEndDateStr(format(endOfMonth(now), "yyyy-MM-dd"));
    } else if (selectedPreset === "last-month") {
      const lastMonth = subMonths(now, 1);
      setStartDateStr(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
      setEndDateStr(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
    } else if (selectedPreset === "last-3-months") {
      const threeMonthsAgo = subMonths(now, 2);
      setStartDateStr(format(startOfMonth(threeMonthsAgo), "yyyy-MM-dd"));
      setEndDateStr(format(endOfMonth(now), "yyyy-MM-dd"));
    }
  };

  // Filtered shifts for the selected range
  const filteredShifts = useMemo(() => {
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    return shifts
      .filter((s) => {
        const d = new Date(s.date);
        return d >= start && d <= end;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [shifts, startDateStr, endDateStr]);

  // Aggregate stats
  const reportStats = useMemo(() => {
    const totalShifts = filteredShifts.length;
    const totalPatients = filteredShifts.reduce(
      (sum, s) => sum + (s.casesCount || 0),
      0
    );

    const totalHours = filteredShifts.reduce((sum, s) => {
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      let mins = eh * 60 + em - (sh * 60 + sm);
      if (mins <= 0) mins += 24 * 60;
      return sum + Math.round((mins / 60) * 100) / 100;
    }, 0);

    const shiftEarnings = filteredShifts.reduce(
      (sum, s) => sum + (s.totalEarnings || 0),
      0
    );
    const fixedSalaries = calculateFixedSalariesForShifts(
      filteredShifts,
      hospitals,
      shifts
    );
    const totalIncome = shiftEarnings + fixedSalaries;

    // Hospital Breakdown
    const hospitalMap = new Map<
      string,
      { name: string; color: string; shiftsCount: number; earnings: number }
    >();

    filteredShifts.forEach((s) => {
      const details = getHospitalDetails(s.hospitalId, hospitals, shifts);
      const existing = hospitalMap.get(s.hospitalId) || {
        name: details.name,
        color: details.color,
        shiftsCount: 0,
        earnings: 0,
      };
      existing.shiftsCount += 1;
      existing.earnings += s.totalEarnings || 0;
      hospitalMap.set(s.hospitalId, existing);
    });

    const hospitalBreakdown = Array.from(hospitalMap.entries()).map(
      ([id, data]) => ({
        id,
        ...data,
        percentage: totalIncome > 0 ? (data.earnings / totalIncome) * 100 : 0,
      })
    );

    return {
      totalShifts,
      totalPatients,
      totalHours,
      totalIncome,
      hospitalBreakdown,
    };
  }, [filteredShifts, hospitals, shifts]);

  // Export handlers
  const handleExport = async (formatType: "pdf" | "csv") => {
    if (filteredShifts.length === 0) {
      toast({
        title: "No Data",
        description: "There are no shifts in the selected date range to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExporting(formatType);
      toast({
        title: `Generating ${formatType.toUpperCase()}...`,
        description: "Please wait while we format your report.",
      });

      const startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);

      let fileData: string;
      const fileExt = formatType === "pdf" ? ".pdf" : ".csv";

      if (formatType === "pdf") {
        fileData = await generateMonthlyReport({
          profile: userProfile,
          startDate,
          endDate,
          shifts: filteredShifts,
          hospitals,
        });
      } else {
        const csvContent = generateCsvReport({
          profile: userProfile,
          startDate,
          endDate,
          shifts: filteredShifts,
          hospitals,
        });
        fileData = btoa(unescape(encodeURIComponent(csvContent)));
      }

      const fileName = `Shiftaty_Report_${format(startDate, "dd_MMM")}_to_${format(
        endDate,
        "dd_MMM_yyyy"
      )}${fileExt}`;

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: fileData,
          directory: Directory.Cache,
        });

        await Share.share({
          title: "Shiftaty Work & Income Report",
          text: `My verified shift report (${format(startDate, "dd MMM")} - ${format(
            endDate,
            "dd MMM yyyy"
          )})`,
          files: [result.uri],
        });
      } else {
        const link = document.createElement("a");
        const mimeType =
          formatType === "pdf" ? "application/pdf" : "text/csv;charset=utf-8;";
        link.href = `data:${mimeType};base64,${fileData}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Report Ready",
        description: `Successfully exported ${fileName}`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Could not generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Reports"
        subtitle="Financial statements, shift summaries & export"
      />

      <div className="px-4 space-y-5">
        {/* Date Range Selection Card */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              Report Period
            </span>
            <span className="text-[11px] text-muted-foreground">
              {format(new Date(startDateStr), "dd MMM")} —{" "}
              {format(new Date(endDateStr), "dd MMM yyyy")}
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: "this-month", label: "This Month" },
              { id: "last-month", label: "Last Month" },
              { id: "last-3-months", label: "3 Months" },
              { id: "custom", label: "Custom" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetSelect(p.id as DatePreset)}
                className={`py-2 px-1 text-center rounded-xl text-xs font-semibold transition-all ${
                  preset === p.id
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "bg-secondary/70 text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {preset === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50"
            >
              <div>
                <Label className="text-[10px] text-muted-foreground block mb-1">
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground block mb-1">
                  End Date
                </Label>
                <Input
                  type="date"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Primary Action Buttons: PDF & CSV */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => handleExport("pdf")}
            disabled={isExporting !== null || filteredShifts.length === 0}
            className="h-13 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            {isExporting === "pdf" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            <div className="text-left">
              <span className="block text-xs font-extrabold leading-none">
                Export PDF
              </span>
              <span className="text-[10px] opacity-80 leading-none">
                Print & Share
              </span>
            </div>
          </Button>

          <Button
            onClick={() => handleExport("csv")}
            disabled={isExporting !== null || filteredShifts.length === 0}
            variant="outline"
            className="h-13 rounded-2xl border-border bg-card hover:bg-secondary/80 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            {isExporting === "csv" ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
            <div className="text-left">
              <span className="block text-xs font-extrabold leading-none text-foreground">
                Export CSV
              </span>
              <span className="text-[10px] text-muted-foreground leading-none">
                Excel Compatible
              </span>
            </div>
          </Button>
        </div>

        {/* Financial & Work Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3.5 bg-card rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] uppercase font-bold tracking-wider">
                Total Income
              </span>
            </div>
            <p className="text-lg font-black text-foreground">
              {reportStats.totalIncome.toLocaleString()}{" "}
              <span className="text-xs font-normal text-muted-foreground">EGP</span>
            </p>
          </div>

          <div className="p-3.5 bg-card rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] uppercase font-bold tracking-wider">
                Shifts
              </span>
            </div>
            <p className="text-lg font-black text-foreground">
              {reportStats.totalShifts}
            </p>
          </div>

          <div className="p-3.5 bg-card rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] uppercase font-bold tracking-wider">
                Total Hours
              </span>
            </div>
            <p className="text-lg font-black text-foreground">
              {reportStats.totalHours}h
            </p>
          </div>

          <div className="p-3.5 bg-card rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-[10px] uppercase font-bold tracking-wider">
                Cases / Pts
              </span>
            </div>
            <p className="text-lg font-black text-foreground">
              {reportStats.totalPatients}
            </p>
          </div>
        </div>

        {/* Hospital Breakdown Section */}
        {reportStats.hospitalBreakdown.length > 0 && (
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Hospital Distribution
              </h3>
              <span className="text-[11px] text-muted-foreground font-medium">
                {reportStats.hospitalBreakdown.length} facilities
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {reportStats.hospitalBreakdown.map((h) => (
                <div key={h.id} className="space-y-2 p-2 rounded-xl bg-secondary/30 border border-border/40">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <HospitalIcon color={h.color} name={h.name} size="sm" />
                      <div className="min-w-0">
                        <span className="font-bold text-foreground block truncate">
                          {h.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {h.shiftsCount} {h.shiftsCount === 1 ? "shift" : "shifts"} logged
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-foreground shrink-0 text-sm">
                      {h.earnings.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">EGP</span>
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: h.color,
                        width: `${Math.max(h.percentage, 4)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when range has no shifts */}
        {filteredShifts.length === 0 && (
          <div className="bg-card rounded-2xl p-8 text-center border border-border space-y-2">
            <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto" />
            <h4 className="font-semibold text-foreground text-sm">
              No shifts in this period
            </h4>
            <p className="text-xs text-muted-foreground">
              Select another month or customize the dates to generate reports.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
