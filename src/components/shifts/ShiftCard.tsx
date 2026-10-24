import { memo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Clock, Calendar, MoreHorizontal, ChevronRight, Stethoscope, Trash2, Building2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Shift } from "@/types";
import { useAppStore } from "@/stores/appStore";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { sounds } from "@/lib/sound";
import { getHospitalColor } from "@/lib/hospitalUtils";



interface ShiftCardProps {
  shift: Shift;
  onClick?: () => void;
  delay?: number;
}

export const ShiftCard = memo(({ shift, onClick, delay = 0 }: ShiftCardProps) => {
  const hospitals = useAppStore((state) => state.hospitals);
  const deleteShift = useAppStore((state) => state.deleteShift);
  const hospital = hospitals.find((h) => h.id === shift.hospitalId);
  const navigate = useNavigate();
  const { toast } = useToast();
  const addShift = useAppStore((state) => state.addShift);
  const isPrivacyMode = useAppStore((state) => state.isPrivacyMode);
  
  let cleanNotes = shift.notes ?? "";
  let multiplier: number | null = null;
  let multiplierType: 'total' | 'base' = 'total';
  let isCustomFixed = false;
  let customFixedAmount = "";
  let snapshotHospitalName = "";
  let snapshotHospitalColor = "";
  let isNabatya = false;

  if (shift.notes) {
    // Parse snapshot hospital name
    const matchName = shift.notes.match(/\[HospitalName:\s*([^\]]+)\s*\]/i);
    if (matchName) {
      snapshotHospitalName = matchName[1].trim();
      cleanNotes = cleanNotes.replace(/\s*\[HospitalName:\s*[^\]]+\s*\]/gi, "").trim();
    }
    // Parse snapshot hospital color
    const matchColor = shift.notes.match(/\[HospitalColor:\s*([^\]]+)\s*\]/i);
    if (matchColor) {
      snapshotHospitalColor = matchColor[1].trim();
      cleanNotes = cleanNotes.replace(/\s*\[HospitalColor:\s*[^\]]+\s*\]/gi, "").trim();
    }

    cleanNotes = cleanNotes.replace(/\s*\[StoredFixedSalary:\s*[^\]]+\s*\]/gi, "").trim();
    cleanNotes = cleanNotes.replace(/\s*\[StoredFixedRate:\s*[^\]]+\s*\]/gi, "").trim();
    cleanNotes = cleanNotes.replace(/\s*\[StoredPaymentModel:\s*[^\]]+\s*\]/gi, "").trim();

    if (shift.notes.includes("[Nabatya: true]")) {
      isNabatya = true;
      cleanNotes = cleanNotes.replace(/\s*\[Nabatya:\s*true\s*\]/gi, "").trim();
    }

    const matchMult = shift.notes.match(/\[Multiplier:\s*([0-9.]+)\s*x\s*\((Total|Base)\)\]/i);
    const matchFixed = shift.notes.match(/\[CustomFixed:\s*([0-9.]+)\s*\]/i);
    
    if (matchMult) {
      multiplier = parseFloat(matchMult[1]);
      multiplierType = matchMult[2].toLowerCase() as 'total' | 'base';
      cleanNotes = cleanNotes.replace(/\s*\[Multiplier:\s*[0-9.]+\s*x\s*\((Total|Base)\)\]/gi, "").trim();
    } else if (matchFixed) {
      isCustomFixed = true;
      customFixedAmount = matchFixed[1];
      cleanNotes = cleanNotes.replace(/\s*\[CustomFixed:\s*[0-9.]+\s*\]/gi, "").trim();
    }
  }

  const handleDelete = async () => {
    try {
      await deleteShift(shift.id);
      sounds.playDelete();
    } catch (e) {
      console.error(e);
      alert("Failed to delete shift online. Try again later.");
    }
  };

  const handleEditNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/edit-shift/${shift.id}`);
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await addShift({
        hospitalId: shift.hospitalId,
        date: new Date(), // duplicate creates a shift for today
        startTime: shift.startTime,
        endTime: shift.endTime,
        casesCount: shift.casesCount,
        proceduresCount: shift.proceduresCount,
        includesOutpatient: shift.includesOutpatient,
        notes: shift.notes,
        customRate: shift.customRate,
        itemCounts: shift.itemCounts,
      });
      sounds.playSuccess();
      toast({
        title: "Shift Duplicated",
        description: "A copy of this shift has been logged for today.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to duplicate shift.",
        variant: "destructive",
      });
    }
  };

  // Calculate duration in hours
  const calculateDuration = () => {
    const [sh, sm] = shift.startTime.split(":").map(Number);
    const [eh, em] = shift.endTime.split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60;
    return Math.round((mins / 60) * 10) / 10;
  };

  const duration = calculateDuration();
  const hospitalColor = getHospitalColor({
    color: hospital?.color || snapshotHospitalColor,
    name: hospital?.name || snapshotHospitalName,
    id: shift.hospitalId,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick || handleEditNavigate}
      style={{ willChange: "transform, opacity" }}
      className={cn(
        "group relative overflow-hidden rounded-[1.25rem] p-3.5 cursor-pointer transition-[border-color,background-color] duration-200",
        "bg-white border-slate-200 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]", // Light
        "dark:bg-[#1C1C1E] dark:border-white/[0.04] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.25)]", // Dark
        "hover:shadow-lg hover:border-primary/20 dark:hover:border-white/10",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/5 before:to-transparent before:opacity-0 before:transition-opacity group-hover:before:opacity-100"
      )}
    >

      <div className="flex flex-col gap-4 relative z-10">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-1.5 h-8 rounded-full shadow-[0_0_12px_-2px_rgba(0,0,0,0.1)]"
              style={{
                backgroundColor: hospitalColor,
                boxShadow: `0 0 16px ${hospitalColor}40`
              }}
            />
            <div className="flex flex-col">
              <h3 className="font-bold text-[14.5px] text-slate-900 dark:text-white leading-tight tracking-tight truncate max-w-[180px]">
                {hospital?.name || snapshotHospitalName || "Unknown Hospital"}
              </h3>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                <span className="text-[9.5px] uppercase font-bold tracking-widest text-slate-400 dark:text-white/20 whitespace-nowrap">
                  {duration}H SHIFT
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-white/70 whitespace-nowrap">
                  {format(new Date(shift.date), "EEE, MMM d")}
                </span>
                {hospital?.paymentModel === "government" && (
                  <span className={cn(
                    "text-[9px] px-2 py-0.5 font-bold rounded-full whitespace-nowrap",
                    isNabatya 
                      ? "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                      : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                  )}>
                    {isNabatya ? "نباطشية (Nabatya)" : "عادي (Normal)"}
                  </span>
                )}
                {multiplier && multiplier !== 1 && (
                  <span className="text-[9px] px-2 py-0.5 font-bold rounded-full whitespace-nowrap bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    {multiplier}x {multiplierType === 'base' ? 'Base' : 'Rate'}
                  </span>
                )}
                {isCustomFixed && (
                  <span className="text-[9px] px-2 py-0.5 font-bold rounded-full whitespace-nowrap bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    Custom Base
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDuplicate}
              className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all active:scale-90 border border-slate-100 dark:border-white/[0.03]"
              title="Duplicate Shift for Today"
            >
              <Copy className="h-4 w-4" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-destructive/10 text-slate-400 dark:text-white/30 hover:text-destructive dark:hover:text-destructive transition-all active:scale-90 border border-slate-100 dark:border-white/[0.03]"
                  title="Delete Shift"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Shift?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this shift and remove its earnings from your local and cloud records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
                  Delete Shift
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50/50 dark:bg-white/[0.03] w-fit border border-slate-100/50 dark:border-white/[0.02]">
              <Clock className="h-3.5 w-3.5 text-primary/60 dark:text-primary/40" />
              <span className="text-[12.5px] font-semibold text-slate-600 dark:text-white/70 tracking-tight">
                {shift.startTime} <span className="mx-1 text-slate-300 dark:text-white/10">—</span> {shift.endTime}
              </span>
            </div>

            {(shift.casesCount > 0 || shift.proceduresCount > 0) && (
              <div className="flex items-center gap-3 px-1 text-[11px] font-medium text-slate-400 dark:text-white/30">
                {shift.casesCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" />
                    <span>{shift.casesCount} cases</span>
                  </div>
                )}
                {shift.proceduresCount > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10" />
                    <span>{shift.proceduresCount} procedures</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end">
            <div className="bg-emerald-500/10 dark:bg-emerald-500/5 px-2.5 py-1.5 rounded-xl border border-emerald-500/20 dark:border-emerald-500/10">
              <div className="flex items-baseline gap-1">
                <span className="text-[20px] font-black text-emerald-600 dark:text-emerald-400 leading-none tracking-tighter">
                  {isPrivacyMode ? "***" : (shift.totalEarnings || 0).toLocaleString()}
                </span>
                <span className="text-[9px] font-bold text-emerald-600/60 dark:text-emerald-400/50 uppercase tracking-tighter">
                  EGP
                </span>
              </div>
            </div>
          </div>
        </div>

        {cleanNotes && (
          <div className="relative px-2.5 py-1.5 rounded-lg bg-slate-50/30 dark:bg-white/[0.02] border border-slate-100/30 dark:border-white/[0.01]">
            <p className="text-[10.5px] text-slate-500 dark:text-white/40 font-medium line-clamp-1 italic leading-relaxed">
              &ldquo;{cleanNotes}&rdquo;
            </p>
          </div>
        )}
      </div>

      <div className="absolute right-4 bottom-8 opacity-0 group-hover:opacity-5 dark:group-hover:opacity-2 transition-opacity pointer-events-none">
        <Building2 className="h-12 w-12 -rotate-12" style={{ color: hospitalColor }} />
      </div>
    </motion.div>
  );
});

ShiftCard.displayName = "ShiftCard";
