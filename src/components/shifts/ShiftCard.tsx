import { motion } from "framer-motion";
import { useState } from "react";
import { format } from "date-fns";
import { Clock, Users, ChevronRight, Stethoscope, Trash2, Pencil, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Shift } from "@/types";
import { useAppStore } from "@/stores/appStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ShiftCardProps {
  shift: Shift;
  onClick?: () => void;
  delay?: number;
}

export function ShiftCard({ shift, onClick, delay = 0 }: ShiftCardProps) {
  const hospitals = useAppStore((state) => state.hospitals);
  const deleteShift = useAppStore((state) => state.deleteShift);
  const updateShift = useAppStore((state) => state.updateShift);
  const calculateShiftEarnings = useAppStore((state) => state.calculateShiftEarnings);
  const hospital = hospitals.find((h) => h.id === shift.hospitalId);
  const { toast } = useToast();

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDate, setEditDate] = useState<Date>(new Date(shift.date));
  const [editHospitalId, setEditHospitalId] = useState(shift.hospitalId);
  const [editStartTime, setEditStartTime] = useState(shift.startTime);
  const [editEndTime, setEditEndTime] = useState(shift.endTime);
  const [editCases, setEditCases] = useState(shift.casesCount.toString());
  const [editProcedures, setEditProcedures] = useState(shift.proceduresCount.toString());
  const [editNotes, setEditNotes] = useState(shift.notes || "");
  const [editCustomRate, setEditCustomRate] = useState(
    shift.customRate ? shift.customRate.toString() : ""
  );
  const [useEditCustomRate, setUseEditCustomRate] = useState(!!shift.customRate);
  const [editItemCounts, setEditItemCounts] = useState<Record<string, number>>(
    shift.itemCounts || {}
  );

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditOpen(true);
  };

  const handleUpdate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    updateShift(shift.id, {
      hospitalId: editHospitalId,
      date: editDate,
      startTime: editStartTime,
      endTime: editEndTime,
      casesCount: parseInt(editCases) || 0,
      proceduresCount: parseInt(editProcedures) || 0,
      notes: editNotes,
      customRate: useEditCustomRate ? parseFloat(editCustomRate) || undefined : undefined,
      itemCounts: editItemCounts,
    });

    setIsEditOpen(false);
    toast({
      title: "Shift Updated",
      description: "Shift details have been updated successfully.",
    });
  };

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

            <div className="flex gap-2">
              <button
                onClick={handleEditClick}
                className="mt-2 text-xs flex items-center gap-1 text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2 py-1 rounded-md w-fit"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="mt-2 text-xs flex items-center gap-1 text-destructive hover:text-destructive/80 transition-colors bg-destructive/10 px-2 py-1 rounded-md w-fit"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <p className="text-xs text-muted-foreground">
            {format(new Date(shift.date), "MMM d")}
          </p>
          <p className="text-lg font-bold text-success mt-1">
            {(shift.totalEarnings || 0).toLocaleString()} EGP
          </p>
          <ChevronRight className="h-4 w-4 text-muted-foreground mt-2" />
        </div>
      </div>

      {shift.notes && (
        <p className="mt-3 text-xs text-muted-foreground line-clamp-1 border-t border-border pt-2">
          {shift.notes}
        </p>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditOpen(false);
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2" onClick={(e) => e.stopPropagation()}>
            {/* Hospital Selection */}
            <div>
              <Label>Hospital</Label>
              <Select value={editHospitalId} onValueChange={setEditHospitalId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select hospital" />
                </SelectTrigger>
                <SelectContent>
                  {hospitals.map((hospital) => (
                    <SelectItem key={hospital.id} value={hospital.id}>
                      {hospital.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1.5",
                      !editDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editDate ? format(editDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={editDate}
                    onSelect={(d) => d && setEditDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Cases & Procedures */}
            {/* Cases & Procedures OR Dynamic Items */}
            {hospitals.find(h => h.id === editHospitalId)?.paymentModel === "detailed" ? (
              <div className="space-y-3">
                <Label>Service Counts</Label>
                <div className="grid grid-cols-2 gap-4">
                  {hospitals
                    .find((h) => h.id === editHospitalId)
                    ?.itemRates?.map((item) => (
                      <div key={item.id}>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">
                          {item.name} ({item.rate} EGP)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={editItemCounts[item.id] || ""}
                          onChange={(e) =>
                            setEditItemCounts({
                              ...editItemCounts,
                              [item.id]: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              (hospitals.find(h => h.id === editHospitalId)?.paymentModel === "per_patient" ||
                hospitals.find(h => h.id === editHospitalId)?.paymentModel === "mixed") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cases</Label>
                    <Input
                      type="number"
                      value={editCases}
                      onChange={(e) => setEditCases(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Procedures</Label>
                    <Input
                      type="number"
                      value={editProcedures}
                      onChange={(e) => setEditProcedures(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              )
            )}

            {/* Custom Rate */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <Label>Custom Rate</Label>
              <Switch checked={useEditCustomRate} onCheckedChange={setUseEditCustomRate} />
            </div>
            {useEditCustomRate && (
              <Input
                type="number"
                value={editCustomRate}
                onChange={(e) => setEditCustomRate(e.target.value)}
                placeholder="Custom rate"
              />
            )}

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={(e) => {
                e.stopPropagation();
                setIsEditOpen(false);
              }}>Cancel</Button>
              <Button onClick={handleUpdate}>Save Changes</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
