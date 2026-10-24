import { useState, useMemo } from "react";
import { Search, Plus, X, Building2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HospitalListItem } from "./HospitalListItem";
import { HospitalIcon } from "./HospitalIcon";
import { AddHospitalModal } from "./AddHospitalModal";
import { useAppStore } from "@/stores/appStore";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HospitalPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHospitalId?: string;
  onSelectHospital: (hospitalId: string) => void;
}

export function HospitalPickerSheet({
  open,
  onOpenChange,
  selectedHospitalId,
  onSelectHospital,
}: HospitalPickerSheetProps) {
  const navigate = useNavigate();
  const hospitals = useAppStore((state) => state.hospitals);
  const shifts = useAppStore((state) => state.shifts);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Compute recently used hospitals from shifts
  const recentHospitals = useMemo(() => {
    if (!shifts || shifts.length === 0) return [];

    // Sort shifts by date descending
    const sortedShifts = [...shifts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const recentIds = new Set<string>();
    for (const s of sortedShifts) {
      if (s.hospitalId && hospitals.some((h) => h.id === s.hospitalId)) {
        recentIds.add(s.hospitalId);
        if (recentIds.size >= 3) break;
      }
    }

    return Array.from(recentIds)
      .map((id) => hospitals.find((h) => h.id === id)!)
      .filter(Boolean);
  }, [shifts, hospitals]);

  // Filtered hospitals based on search
  const filteredHospitals = useMemo(() => {
    if (!searchQuery.trim()) return hospitals;
    const q = searchQuery.toLowerCase().trim();
    return hospitals.filter((h) => h.name.toLowerCase().includes(q));
  }, [hospitals, searchQuery]);

  const handleSelect = (id: string) => {
    onSelectHospital(id);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] h-[80vh] sm:max-w-lg mx-auto rounded-t-[1.75rem] p-0 flex flex-col bg-background/95 backdrop-blur-2xl border-t border-border shadow-2xl"
      >
        {/* Small Drag Handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/25" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-border/40">
          <div>
            <SheetTitle className="text-base font-extrabold text-foreground tracking-tight">
              Select Hospital
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Choose the facility for this shift
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        {hospitals.length > 0 && (
          <div className="px-5 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search hospitals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-secondary/40 border-border/70 rounded-xl text-sm placeholder:text-muted-foreground/60 focus:bg-card"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {hospitals.length === 0 ? (
            /* Empty State: No Hospitals in DB */
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mx-auto">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">No hospitals yet</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Add your first hospital to configure rates and start logging shifts.
                </p>
              </div>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="rounded-xl mt-2 flex items-center gap-1.5 mx-auto"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Hospital</span>
              </Button>
            </div>
          ) : filteredHospitals.length === 0 ? (
            /* Empty State: Search found nothing */
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-semibold text-foreground">
                No hospitals found
              </p>
              <p className="text-xs text-muted-foreground">
                No hospital matches "{searchQuery}". Try another name.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="rounded-xl text-xs"
                >
                  Clear Search
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsAddModalOpen(true)}
                  className="rounded-xl text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add "{searchQuery}"</span>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* RECENT HOSPITALS (Only shown when not searching and recent items exist) */}
              {!searchQuery.trim() && recentHospitals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 px-1">
                    Recent
                  </p>
                  <div className="space-y-2">
                    {recentHospitals.map((hospital) => (
                      <HospitalListItem
                        key={`recent-${hospital.id}`}
                        hospital={hospital}
                        isSelected={selectedHospitalId === hospital.id}
                        onSelect={() => handleSelect(hospital.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ALL HOSPITALS */}
              <div className="space-y-2">
                {!searchQuery.trim() && recentHospitals.length > 0 && (
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 px-1 pt-1">
                    All Hospitals
                  </p>
                )}
                <div className="space-y-2">
                  {filteredHospitals.map((hospital) => (
                    <HospitalListItem
                      key={hospital.id}
                      hospital={hospital}
                      isSelected={selectedHospitalId === hospital.id}
                      onSelect={() => handleSelect(hospital.id)}
                    />
                  ))}
                </div>

                {/* Inline Add New Facility Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full py-2.5 px-3 rounded-xl border border-dashed border-border/80 hover:border-primary/50 text-xs font-bold text-primary flex items-center justify-center gap-1.5 transition-colors bg-secondary/15 hover:bg-primary/5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Facility</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal to add hospital in-place */}
        <AddHospitalModal
          open={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          onSuccess={(newHospital) => {
            onSelectHospital(newHospital.id);
            onOpenChange(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Trigger component rendered in AddShift / EditShift forms
 */
interface HospitalPickerTriggerProps {
  selectedHospitalId?: string;
  onClick: () => void;
  error?: string;
}

export function HospitalPickerTrigger({
  selectedHospitalId,
  onClick,
  error,
}: HospitalPickerTriggerProps) {
  const hospitals = useAppStore((state) => state.hospitals);
  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={cn(
        "w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer touch-feedback select-none",
        selectedHospital
          ? "bg-card border-border hover:border-primary/50 shadow-sm"
          : "bg-secondary/40 border-dashed border-border hover:bg-secondary/60",
        error ? "border-destructive ring-1 ring-destructive" : ""
      )}
    >
      {selectedHospital ? (
        <div className="flex items-center gap-3.5 min-w-0">
          <HospitalIcon
            color={selectedHospital.color}
            name={selectedHospital.name}
            size="md"
          />
          <div className="min-w-0 text-left">
            <span className="block text-sm font-bold text-foreground truncate">
              {selectedHospital.name}
            </span>
            <span className="text-xs text-muted-foreground truncate block">
              Tap to change hospital
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-muted-foreground/70" />
          </div>
          <div className="text-left">
            <span className="block text-sm font-semibold text-foreground">
              Select Hospital
            </span>
            <span className="text-xs text-muted-foreground">
              Choose facility for this shift
            </span>
          </div>
        </div>
      )}

      <div className="shrink-0 ml-3">
        <span className="text-xs font-bold text-primary px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors">
          {selectedHospital ? "Change" : "Select"}
        </span>
      </div>
    </div>
  );
}
