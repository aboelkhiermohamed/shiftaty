import React from "react";
import { Check, ChevronRight } from "lucide-react";
import { Hospital } from "@/types";
import { HospitalIcon } from "./HospitalIcon";
import { getPaymentModelSummary, getHospitalColor } from "@/lib/hospitalUtils";
import { cn } from "@/lib/utils";

interface HospitalListItemProps {
  hospital: Hospital;
  isSelected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  subtitle?: string;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  shiftsCount?: number;
  className?: string;
}

export function HospitalListItem({
  hospital,
  isSelected = false,
  onSelect,
  onClick,
  subtitle,
  trailing,
  showChevron = false,
  shiftsCount,
  className,
}: HospitalListItemProps) {
  const handleClick = onSelect || onClick;
  const secondaryText =
    subtitle ||
    (shiftsCount !== undefined
      ? `${getPaymentModelSummary(hospital)} • ${shiftsCount} ${
          shiftsCount === 1 ? "shift" : "shifts"
        }`
      : getPaymentModelSummary(hospital));

  const hospitalColor = getHospitalColor(hospital);

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      className={cn(
        "group flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer touch-feedback select-none",
        isSelected
          ? "bg-primary/10 border-primary shadow-sm"
          : "bg-card/70 border-border/50 hover:bg-secondary/40 hover:border-border/80 active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Hospital Icon Container */}
        <HospitalIcon color={hospitalColor} name={hospital.name} size="md" />

        {/* Text Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              className={cn(
                "text-sm font-bold truncate transition-colors",
                isSelected ? "text-primary dark:text-[#60a5fa]" : "text-foreground"
              )}
            >
              {hospital.name}
            </h4>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium">
            {secondaryText}
          </p>
        </div>
      </div>

      {/* Trailing / Selection Indicator */}
      <div className="shrink-0 ml-3 flex items-center">
        {trailing ? (
          trailing
        ) : onSelect !== undefined ? (
          <div
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200",
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "border-2 border-slate-500/40 dark:border-slate-400/30 group-hover:border-slate-400"
            )}
          >
            {isSelected && <Check className="w-3 h-3 stroke-[3.5]" />}
          </div>
        ) : showChevron ? (
          <ChevronRight className="w-5 h-5 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        ) : null}
      </div>
    </div>
  );
}
