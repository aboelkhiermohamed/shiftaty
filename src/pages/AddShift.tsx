import { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { CalendarIcon, Clock, Plus, AlertCircle } from "lucide-react";
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
import { useAppStore } from "@/stores/appStore";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hospitalId) {
      toast({
        title: "Error",
        description: "Please select a hospital",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    addShift({
      hospitalId,
      date,
      startTime,
      endTime,
      casesCount: parseInt(casesCount) || 0,
      proceduresCount: parseInt(proceduresCount) || 0,
      includesOutpatient,
      notes: notes.trim() || undefined,
      customRate: useCustomRate ? parseFloat(customRate) || undefined : undefined,
      itemCounts: selectedHospital?.paymentModel === "detailed" ? itemCounts : undefined,
    });

    toast({
      title: "Shift Added",
      description: `Shift logged successfully - ${estimatedEarnings.toLocaleString()} EGP`,
    });

    navigate("/");
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
    </AppLayout>
  );
}
