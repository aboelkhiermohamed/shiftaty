import React from "react";
import { Hospital, Shift } from "@/types";
import { HospitalIcon } from "./HospitalIcon";
import { getHospitalColor, getPaymentModelSummary } from "@/lib/hospitalUtils";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  Wallet,
  Coins,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HospitalCardProps {
  hospital: Hospital;
  shifts?: Shift[];
  onEdit: (hospital: Hospital) => void;
  onDelete: (hospital: Hospital) => void;
}

export function HospitalCard({
  hospital,
  shifts = [],
  onEdit,
  onDelete,
}: HospitalCardProps) {
  const hospitalColor = getHospitalColor(hospital);
  const hospitalShifts = shifts.filter((s) => s.hospitalId === hospital.id);
  const totalShiftsCount = hospitalShifts.length;
  const totalEarnings = hospitalShifts.reduce(
    (sum, s) => sum + (s.totalEarnings || 0),
    0
  );

  return (
    <div className="bg-card rounded-2xl p-4 border border-border/70 shadow-sm hover:border-border transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        {/* Left Side: Hospital Icon + Info */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <HospitalIcon color={hospitalColor} name={hospital.name} size="md" />

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base text-foreground truncate">
              {hospital.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getPaymentModelSummary(hospital)}
            </p>

            {/* Model Details Pills */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {hospital.paymentModel === "detailed" && (
                <>
                  {hospital.fixedSalary && hospital.fixedSalary > 0 ? (
                    <span className="text-[11px] font-semibold text-foreground bg-secondary px-2 py-0.5 rounded-lg">
                      Base: {hospital.fixedSalary} EGP
                    </span>
                  ) : null}
                  {hospital.itemRates
                    ?.filter((item) => !item.archived)
                    .slice(0, 3)
                    .map((item) => (
                      <span
                        key={item.id}
                        className="text-[11px] font-medium text-foreground bg-secondary px-2 py-0.5 rounded-lg"
                      >
                        {item.name}: {item.rate}
                      </span>
                    ))}
                  {(hospital.itemRates?.filter((item) => !item.archived).length || 0) > 3 && (
                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-lg">
                      +{(hospital.itemRates?.filter((item) => !item.archived).length || 0) - 3} more
                    </span>
                  )}
                </>
              )}

              {hospital.paymentModel === "government" && (
                <>
                  {hospital.fixedSalary && hospital.fixedSalary > 0 ? (
                    <span className="text-[11px] font-semibold text-foreground bg-secondary px-2 py-0.5 rounded-lg">
                      Monthly: {hospital.fixedSalary} EGP
                    </span>
                  ) : null}
                  {hospital.fixedRate && hospital.fixedRate > 0 ? (
                    <span className="text-[11px] font-semibold text-foreground bg-secondary px-2 py-0.5 rounded-lg">
                      Nabatya: {hospital.fixedRate} EGP
                    </span>
                  ) : null}
                </>
              )}

              {/* Shifts Count Metric */}
              <span className="text-[11px] font-medium text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-lg flex items-center gap-1">
                <Calendar className="w-3 h-3 text-primary" />
                {totalShiftsCount} {totalShiftsCount === 1 ? "shift" : "shifts"}
              </span>

              {totalEarnings > 0 && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  {totalEarnings.toLocaleString()} EGP
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg -mr-1"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem
              onClick={() => onEdit(hospital)}
              className="flex items-center gap-2 cursor-pointer text-xs"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Hospital</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(hospital)}
              className="flex items-center gap-2 cursor-pointer text-xs text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Hospital</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
