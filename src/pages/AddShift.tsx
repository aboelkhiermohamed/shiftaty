import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { CalendarIcon, Clock, Plus, AlertCircle, Timer } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAppStore } from "@/stores/appStore";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Returns shift duration in hours (handles overnight shifts). */
function calcShiftHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60; // overnight
  return Math.round((mins / 60) * 100) / 100;
}

export default function AddShift() {
  const [hospitalId, setHospitalId] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:00");
  const [casesCount, setCasesCount] = useState("");
  const [proceduresCount, setProceduresCount] = useState("");
  const [includesOutpatient, setIncludesOutpatient] = useState(false);
  const [notes, setNotes] = useState("");
  const [customRate, setCustomRate] = useState("");
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

  // Partial-shift dialog
  const [partialDialogOpen, setPartialDialogOpen] = useState(false);
  const [partialHours, setPartialHours] = useState(0);
  const [pendingCustomRate, setPendingCustomRate] = useState<number | undefined>(undefined);

  const hospitals = useAppStore((state) => state.hospitals);
  const addShift = useAppStore((state) => state.addShift);
  const calculateShiftEarnings = useAppStore((state) => state.calculateShiftEarnings);
  const { toast } = useToast();
  const navigate = useNavigate();

  const selectedHospital = hospitals.find((h) => h.id === hospitalId);

  const estimatedEarnings =
    hospitalId && selectedHospital
      ? calculateShiftEarnings(
        hospitalId,
        parseInt(casesCount) || 0,
        useCustomRate ? parseFloat(customRate) || undefined : undefined,
        selectedHospital.paymentModel === "detailed" ? itemCounts : undefined
      )
      : 0;

  const doAddShift = (overrideRate?: number) => {
    addShift({
      hospitalId,
      date,
      startTime,
      endTime,
      casesCount: parseInt(casesCount) || 0,
      proceduresCount: parseInt(proceduresCount) || 0,
      includesOutpatient,
      notes: notes.trim() || undefined,
      customRate: overrideRate,
      itemCounts: selectedHospital?.paymentModel === "detailed" ? itemCounts : undefined,
    });
    const finalEarnings = overrideRate ?? estimatedEarnings;
    toast({
      title: "Shift Added",
      description: `Shift logged successfully - ${finalEarnings.toLocaleString()} EGP`,
    });
    navigate("/");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hospitalId) {
      toast({ title: "Error", description: "Please select a hospital", variant: "destructive" });
      return;
    }
    if (!date) {
      toast({ title: "Error", description: "Please select a date", variant: "destructive" });
      return;
    }

    const hours = calcShiftHours(startTime, endTime);

    // If shift is less than 24h and NOT using a manual custom rate, intercept
    if (hours < 24 && !useCustomRate) {
      const proRataRate = Math.round((estimatedEarnings / 24) * hours);
      setPartialHours(hours);
      setPendingCustomRate(proRataRate);
      setPartialDialogOpen(true);
      return;
    }

    doAddShift(useCustomRate ? parseFloat(customRate) || undefined : undefined);
  };

  // User confirmed hourly calculation
  const handleConfirmHourly = () => {
    setPartialDialogOpen(false);
    doAddShift(pendingCustomRate);
  };

  // User wants the full fixed rate
  const handleConfirmFixed = () => {
    setPartialDialogOpen(false);
    doAddShift(useCustomRate ? parseFloat(customRate) || undefined : undefined);
  };

  return (
    <AppLayout>
      <PageHeader title="Add Shift" subtitle="Log a new work shift" />

      <form onSubmit={handleSubmit} className="px-4 space-y-5">
        {hospitals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-warning/10 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">No hospitals added</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please add a hospital first before logging shifts
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => navigate("/hospitals")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Hospital
              </Button>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Hospital Selection */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Label>Hospital</Label>
              <Select value={hospitalId} onValueChange={setHospitalId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select hospital" />
                </SelectTrigger>
                <SelectContent>
                  {hospitals.map((hospital) => (
                    <SelectItem key={hospital.id} value={hospital.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: hospital.color }}
                        />
                        {hospital.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* Date Selection */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1.5",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </motion.div>

            {/* Time Selection */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <div className="relative mt-1.5">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <div className="relative mt-1.5">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </motion.div>

            {/* Cases & Procedures OR Dynamic Items */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {selectedHospital?.paymentModel === "detailed" ? (
                <div className="space-y-3">
                  <Label>Service Counts</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedHospital.itemRates?.map((item) => (
                      <div key={item.id}>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">
                          {item.name} ({item.rate} EGP)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={itemCounts[item.id] || ""}
                          onChange={(e) =>
                            setItemCounts({
                              ...itemCounts,
                              [item.id]: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cases">Cases/Patients</Label>
                    <Input
                      id="cases"
                      type="number"
                      min="0"
                      value={casesCount}
                      onChange={(e) => setCasesCount(e.target.value)}
                      placeholder="0"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="procedures">Procedures</Label>
                    <Input
                      id="procedures"
                      type="number"
                      min="0"
                      value={proceduresCount}
                      onChange={(e) => setProceduresCount(e.target.value)}
                      placeholder="0"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              )}
            </motion.div>

            {/* Outpatient Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex items-center justify-between bg-card rounded-xl p-4 border border-border"
            >
              <div>
                <Label className="font-medium">Outpatient Examinations</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Did this shift include outpatient work?
                </p>
              </div>
              <Switch
                checked={includesOutpatient}
                onCheckedChange={setIncludesOutpatient}
              />
            </motion.div>

            {/* Custom Rate */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between bg-card rounded-xl p-4 border border-border">
                <div>
                  <Label className="font-medium">Custom Rate</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Override default hospital rate
                  </p>
                </div>
                <Switch checked={useCustomRate} onCheckedChange={setUseCustomRate} />
              </div>
              {useCustomRate && (
                <Input
                  type="number"
                  min="0"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  placeholder="Enter custom rate (EGP)"
                  className="mt-2"
                />
              )}
            </motion.div>

            {/* Notes */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or diagnoses..."
                className="mt-1.5 min-h-[80px]"
              />
            </motion.div>

            {/* Earnings Preview */}
            {hospitalId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary/10 rounded-xl p-4 text-center"
              >
                <p className="text-sm text-muted-foreground">Estimated Earnings</p>
                <p className="text-3xl font-bold text-primary mt-1">
                  {estimatedEarnings.toLocaleString()} EGP
                </p>
                {selectedHospital && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on {selectedHospital.name}'s payment model
                  </p>
                )}
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button type="submit" className="w-full h-12 text-base font-semibold">
                <Plus className="h-5 w-5 mr-2" />
                Log Shift
              </Button>
            </motion.div>
          </>
        )}
      </form>

      {/* Partial Shift Dialog */}
      <Dialog open={partialDialogOpen} onOpenChange={setPartialDialogOpen}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                <Timer className="h-5 w-5 text-warning" />
              </div>
              <DialogTitle>Partial Shift Detected</DialogTitle>
            </div>
            <DialogDescription className="text-left pt-1">
              Your shift is{" "}
              <span className="font-bold text-foreground">
                {partialHours} hour{partialHours !== 1 ? "s" : ""}
              </span>{" "}
              out of a full 24-hour shift.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Hourly option */}
            <button
              onClick={handleConfirmHourly}
              className="w-full text-left bg-primary/10 border border-primary/30 rounded-xl p-4 hover:bg-primary/20 transition-colors touch-feedback"
            >
              <p className="font-semibold text-foreground text-sm">
                Calculate by Hours
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {partialHours}h ÷ 24h ={" "}
                <span className="font-medium text-primary">
                  {(pendingCustomRate ?? 0).toLocaleString()} EGP
                </span>
              </p>
            </button>

            {/* Fixed option */}
            <button
              onClick={handleConfirmFixed}
              className="w-full text-left bg-muted/50 border border-border rounded-xl p-4 hover:bg-muted transition-colors touch-feedback"
            >
              <p className="font-semibold text-foreground text-sm">
                Use Full Rate
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Keep the hospital's fixed rate —{" "}
                <span className="font-medium text-foreground">
                  {(estimatedEarnings).toLocaleString()} EGP
                </span>
              </p>
            </button>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setPartialDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
