import { motion } from "framer-motion";
import { format } from "date-fns";
import { Clock, Building2, Users, ChevronRight, Stethoscope, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Shift } from "@/types";
import { useAppStore } from "@/stores/appStore";

interface ShiftCardProps {
  shift: Shift;
  onClick?: () => void;
  delay?: number;
}

export function ShiftCard({ shift, onClick, delay = 0 }: ShiftCardProps) {
  const hospitals = useAppStore((state) => state.hospitals);
  const deleteShift = useAppStore((state) => state.deleteShift);
  const hospital = hospitals.find((h) => h.id === shift.hospitalId);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this shift?")) {
      deleteShift(shift.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl p-4 shadow-sm border border-border",
        "card-hover touch-feedback cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: hospital?.color || "#3b82f6" }}
            />
            <h3 className="font-semibold text-foreground">
              {hospital?.name || "Unknown Hospital"}
            </h3>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {shift.startTime} - {shift.endTime}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {shift.casesCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{shift.casesCount} cases</span>
                </div>
              )}
              {shift.proceduresCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Stethoscope className="h-4 w-4" />
                  <span>{shift.proceduresCount} procedures</span>
                </div>
              )}
            </div>

            <button
              onClick={handleDelete}
              className="mt-2 text-xs flex items-center gap-1 text-destructive hover:text-destructive/80 transition-colors bg-destructive/10 px-2 py-1 rounded-md w-fit"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <p className="text-xs text-muted-foreground">
            {format(new Date(shift.date), "MMM d")}
          </p>
          <p className="text-lg font-bold text-success mt-1">
            {shift.totalEarnings.toLocaleString()} EGP
          </p>
          <ChevronRight className="h-4 w-4 text-muted-foreground mt-2" />
        </div>
      </div>

      {shift.notes && (
        <p className="mt-3 text-xs text-muted-foreground line-clamp-1 border-t border-border pt-2">
          {shift.notes}
        </p>
      )}
    </motion.div>
  );
}
