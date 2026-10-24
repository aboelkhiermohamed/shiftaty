import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { CalendarIcon, Clock, ArrowLeft, Check, Timer, Loader2, Sparkles } from "lucide-react";
import { sounds } from "@/lib/sound";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { cn } from "@/lib/utils";

function calcShiftHours(start: string, end: string): number {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60;
    return Math.round((mins / 60) * 100) / 100;
}

export default function EditShift() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const hospitals = useAppStore((s) => s.hospitals);
    const shifts = useAppStore((s) => s.shifts);
    const updateShift = useAppStore((s) => s.updateShift);
    const calculateShiftEarnings = useAppStore((s) => s.calculateShiftEarnings);

    const shift = shifts.find((s) => s.id === id);

    // Pre-fill all fields from the existing shift
    const [hospitalId, setHospitalId] = useState(shift?.hospitalId ?? "");
    const [date, setDate] = useState<Date>(new Date(shift?.date ?? new Date()));
    const [startTime, setStartTime] = useState(shift?.startTime ?? "09:00");
    const [endTime, setEndTime] = useState(shift?.endTime ?? "09:00");
    const [casesCount, setCasesCount] = useState(
        shift?.casesCount?.toString() ?? "0"
    );
    const [proceduresCount, setProceduresCount] = useState(
        shift?.proceduresCount?.toString() ?? "0"
    );
    const [includesOutpatient, setIncludesOutpatient] = useState(
        shift?.includesOutpatient ?? false
    );
    // Parse multiplier and custom fixed metadata from notes
    let initialMultiplier = 1;
    let initialMultiplierType: 'total' | 'base' = 'total';
    let initialCustomFixed = "";
    let cleanNotes = shift?.notes ?? "";

    let initialIsNabatya = false;
    if (shift?.notes) {
      // Strip out snapshot hospital name and color tags
      cleanNotes = cleanNotes.replace(/\s*\[HospitalName:\s*[^\]]+\s*\]/gi, "").trim();
      cleanNotes = cleanNotes.replace(/\s*\[HospitalColor:\s*[^\]]+\s*\]/gi, "").trim();
      cleanNotes = cleanNotes.replace(/\s*\[StoredFixedSalary:\s*[^\]]+\s*\]/gi, "").trim();
      cleanNotes = cleanNotes.replace(/\s*\[StoredFixedRate:\s*[^\]]+\s*\]/gi, "").trim();
      cleanNotes = cleanNotes.replace(/\s*\[StoredPaymentModel:\s*[^\]]+\s*\]/gi, "").trim();

      if (shift.notes.includes("[Nabatya: true]")) {
        initialIsNabatya = true;
        cleanNotes = cleanNotes.replace(/\s*\[Nabatya:\s*true\s*\]/gi, "").trim();
      }

      const matchMult = shift.notes.match(/\[Multiplier:\s*([0-9.]+)\s*x\s*\((Total|Base)\)\]/i);
      const matchFixed = shift.notes.match(/\[CustomFixed:\s*([0-9.]+)\s*\]/i);
      
      if (matchMult) {
        initialMultiplier = parseFloat(matchMult[1]);
        initialMultiplierType = matchMult[2].toLowerCase() as 'total' | 'base';
        cleanNotes = cleanNotes.replace(/\s*\[Multiplier:\s*[0-9.]+\s*x\s*\((Total|Base)\)\]/gi, "").trim();
      } else if (matchFixed) {
        initialCustomFixed = matchFixed[1];
        cleanNotes = cleanNotes.replace(/\s*\[CustomFixed:\s*[0-9.]+\s*\]/gi, "").trim();
      }
    }

    let initialRateMode: 'normal' | 'holiday' | 'double' | 'custom_fixed' | 'flat' = 'normal';
    if (shift?.customRate) {
      initialRateMode = 'flat';
    } else if (initialCustomFixed) {
      initialRateMode = 'custom_fixed';
    } else if (initialMultiplier === 1.5) {
      initialRateMode = 'holiday';
    } else if (initialMultiplier === 2) {
      initialRateMode = 'double';
    }

    const [notes, setNotes] = useState(cleanNotes);
    const [rateMode, setRateMode] = useState<'normal' | 'holiday' | 'double' | 'custom_fixed' | 'flat'>(initialRateMode);
    const [customFixed, setCustomFixed] = useState(initialCustomFixed);
    const [multiplierType, setMultiplierType] = useState<'total' | 'base'>(initialMultiplierType);
    const [customRate, setCustomRate] = useState(
        shift?.customRate?.toString() ?? ""
    );
    const [itemCounts, setItemCounts] = useState<Record<string, number>>(
        shift?.itemCounts ?? {}
    );
    const [isNabatya, setIsNabatya] = useState(initialIsNabatya);

    const [partialDialogOpen, setPartialDialogOpen] = useState(false);
    const [partialHours, setPartialHours] = useState(0);
    const [pendingCustomRate, setPendingCustomRate] = useState<number | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    if (!shift) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
                    <p className="text-muted-foreground text-center">Shift not found.</p>
                    <Button onClick={() => navigate("/")}>Back to Dashboard</Button>
                </div>
            </AppLayout>
        );
    }

    const selectedHospital = hospitals.find((h) => h.id === hospitalId);

    // Determine final active multiplier and multiplierType
    let activeMultiplier = 1;
    if (rateMode === 'holiday') activeMultiplier = 1.5;
    else if (rateMode === 'double') activeMultiplier = 2;

    const activeMultiplierType = multiplierType; // 'total' or 'base'
    const isFlatRate = rateMode === 'flat';
    const isCustomFixed = rateMode === 'custom_fixed';

    // Override stored values if custom fixed is active
    let customStoredFixedSalary: number | undefined = undefined;
    let customStoredFixedRate: number | undefined = undefined;
    
    if (isCustomFixed && selectedHospital) {
        const val = parseFloat(customFixed) || 0;
        if (selectedHospital.paymentModel === 'detailed') {
            customStoredFixedSalary = val;
        } else {
            customStoredFixedRate = val;
        }
    }

    const estimatedEarnings = hospitalId && selectedHospital
        ? calculateShiftEarnings(
            hospitalId,
            parseInt(casesCount) || 0,
            isFlatRate ? parseFloat(customRate) || undefined : undefined,
            selectedHospital?.paymentModel === "detailed" ? itemCounts : undefined,
            customStoredFixedRate, // storedFixedRate override
            undefined, // storedPerPatientRate
            customStoredFixedSalary, // storedFixedSalary override
            activeMultiplier,
            activeMultiplierType,
            isNabatya
        )
        : 0;

    const doSave = async (overrideRate?: number) => {
        setIsSaving(true);
        try {
            // Append multiplier metadata tag to notes if multiplier is not 1 and not flat rate
            let finalNotes = notes.trim();
            if (selectedHospital?.paymentModel === "government" && isNabatya) {
                const tag = `[Nabatya: true]`;
                finalNotes = finalNotes ? `${finalNotes}\n${tag}` : tag;
            }
            if (isCustomFixed) {
                const tag = `[CustomFixed: ${customFixed}]`;
                finalNotes = finalNotes ? `${finalNotes}\n${tag}` : tag;
            } else if (!isFlatRate && activeMultiplier !== 1) {
                const tag = `[Multiplier: ${activeMultiplier}x (${activeMultiplierType === 'base' ? 'Base' : 'Total'})]`;
                finalNotes = finalNotes ? `${finalNotes}\n${tag}` : tag;
            }

            await updateShift(shift.id, {
                hospitalId,
                date,
                startTime,
                endTime,
                casesCount: parseInt(casesCount) || 0,
                proceduresCount: parseInt(proceduresCount) || 0,
                includesOutpatient,
                notes: finalNotes || undefined,
                customRate: overrideRate,
                storedFixedRate: customStoredFixedRate,
                storedFixedSalary: customStoredFixedSalary,
                itemCounts:
                    selectedHospital?.paymentModel === "detailed" ? itemCounts : undefined,
            });
            toast({ title: "Shift Updated", description: "Your shift has been saved successfully." });
            sounds.playSuccess();
            navigate("/");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = () => {
        const hours = calcShiftHours(startTime, endTime);
        if (hours < 24 && !isFlatRate) {
            const proRataRate = Math.round((estimatedEarnings / 24) * hours);
            setPartialHours(hours);
            setPendingCustomRate(proRataRate);
            setPartialDialogOpen(true);
            return;
        }
        doSave(isFlatRate ? parseFloat(customRate) || undefined : undefined);
    };

    const handleConfirmHourly = () => { setPartialDialogOpen(false); doSave(pendingCustomRate); };
    const handleConfirmFixed = () => { setPartialDialogOpen(false); doSave(isFlatRate ? parseFloat(customRate) || undefined : undefined); };

    return (
        <AppLayout>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-6 pb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center touch-feedback"
                >
                    <ArrowLeft className="h-5 w-5 text-foreground" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-foreground">Edit Shift</h1>
                    <p className="text-xs text-muted-foreground">
                        {format(new Date(shift.date), "MMMM d, yyyy")}
                    </p>
                </div>
            </div>

            <div className="px-4 space-y-5 pb-6">
                {/* Hospital */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.025, duration: 0.2 }}
                >
                    <Label>Hospital</Label>
                    <Select value={hospitalId} onValueChange={(id) => {
                        setHospitalId(id);
                        setIsNabatya(false);
                    }}>
                        <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select hospital" />
                        </SelectTrigger>
                        <SelectContent>
                            {hospitals.map((h) => (
                                <SelectItem key={h.id} value={h.id}>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: h.color }}
                                        />
                                        {h.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </motion.div>

                {/* Payment Model Summary */}
                {hospitalId && selectedHospital && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mx-0.5 p-3.5 bg-muted/40 rounded-2xl border border-border/50 shadow-sm"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
                                Payment Model Parameters
                            </span>
                            
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className={cn(
                                            "flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[10px] font-extrabold uppercase transition-all active:scale-95 shadow-sm",
                                            activeMultiplier !== 1 || isFlatRate || isCustomFixed
                                                ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                                                : "bg-secondary/80 border-border text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <Sparkles className="h-3 w-3 text-indigo-500 animate-pulse" />
                                        {activeMultiplier !== 1 ? `${activeMultiplier}x` : isFlatRate ? 'Custom' : isCustomFixed ? 'Fixed' : 'Rate Mods'}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4 rounded-2xl bg-card border border-border shadow-xl space-y-4" align="end">
                                    <div className="space-y-3.5">
                                        <div>
                                            <Label className="text-xs font-bold text-foreground">Rate Modification</Label>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                                                Apply multiplier for holidays or override with a custom rate
                                            </p>
                                        </div>

                                        {/* Mode Selector Buttons */}
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {[
                                                { id: 'normal', label: 'Normal (1x)' },
                                                { id: 'holiday', label: 'Holiday (1.5x)' },
                                                { id: 'double', label: 'Double (2x)' },
                                                { id: 'custom_fixed', label: 'Custom Fixed' },
                                                { id: 'flat', label: 'Custom Rate' }
                                            ].map((mode) => (
                                                <button
                                                    key={mode.id}
                                                    type="button"
                                                    onClick={() => setRateMode(mode.id as any)}
                                                    className={cn(
                                                        "py-1.5 px-2 text-[10px] font-semibold rounded-lg border transition-all text-center flex items-center justify-center min-h-[32px]",
                                                        rateMode === mode.id
                                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                            : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary/80 hover:text-foreground"
                                                    )}
                                                >
                                                    {mode.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Sub-inputs based on mode */}
                                        {rateMode === 'custom_fixed' && (
                                            <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <Label htmlFor="customFixed" className="text-[10px]">Custom Base Salary / Rate (EGP)</Label>
                                                <Input
                                                    id="customFixed"
                                                    type="number"
                                                    min="0"
                                                    value={customFixed}
                                                    onChange={(e) => setCustomFixed(e.target.value)}
                                                    placeholder="Enter custom base (EGP)"
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        )}

                                        {rateMode === 'flat' && (
                                            <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <Label htmlFor="customRate" className="text-[10px]">Custom Rate (EGP)</Label>
                                                <Input
                                                    id="customRate"
                                                    type="number"
                                                    min="0"
                                                    value={customRate}
                                                    onChange={(e) => setCustomRate(e.target.value)}
                                                    placeholder="Enter custom rate (EGP)"
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        )}

                                        {/* Multiplier target selection (Total vs Base) */}
                                        {selectedHospital.paymentModel !== 'per_patient' && 
                                         ['holiday', 'double'].includes(rateMode) && (
                                            <div className="space-y-1.5 pt-2 border-t border-border/40 animate-in fade-in duration-300">
                                                <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Apply Multiplier To</Label>
                                                <div className="flex gap-2">
                                                    {[
                                                        { id: 'total', label: 'Total Earnings', desc: 'Multiply entire total' },
                                                        { id: 'base', label: 'Base Salary Only', desc: `Multiply base only (${selectedHospital.paymentModel === 'detailed' ? 'fixed salary' : 'fixed rate'})` }
                                                    ].map((target) => (
                                                        <button
                                                            key={target.id}
                                                            type="button"
                                                            onClick={() => setMultiplierType(target.id as any)}
                                                            className={cn(
                                                                "flex-1 p-2 text-left rounded-lg border transition-all space-y-0.5",
                                                                multiplierType === target.id
                                                                    ? "bg-primary/5 border-primary text-primary"
                                                                    : "bg-transparent border-border hover:bg-secondary/20"
                                                            )}
                                                        >
                                                            <div className="text-[10px] font-bold text-foreground leading-none">{target.label}</div>
                                                            <div className="text-[8px] text-muted-foreground leading-normal mt-0.5">{target.desc}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        
                        <div className="space-y-1.5">
                            {(selectedHospital.paymentModel === 'fixed' || selectedHospital.paymentModel === 'mixed') && (
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Fixed Rate</span>
                                    {isCustomFixed ? (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs line-through text-muted-foreground/60">{selectedHospital.fixedRate} EGP</span>
                                            <span className="text-sm font-bold text-primary">{customFixed} EGP</span>
                                        </div>
                                    ) : (
                                        <span className="text-sm font-bold text-foreground">{selectedHospital.fixedRate} EGP</span>
                                    )}
                                </div>
                            )}
                            {(selectedHospital.paymentModel === 'per_patient' || selectedHospital.paymentModel === 'mixed') && (
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Per Patient Rate</span>
                                    <span className="text-sm font-bold text-foreground">{selectedHospital.perPatientRate} EGP</span>
                                </div>
                            )}
                            {selectedHospital.paymentModel === 'detailed' && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center pb-1.5 border-b border-border/30">
                                        <span className="text-xs text-muted-foreground">Base Salary</span>
                                        {isCustomFixed ? (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs line-through text-muted-foreground/60">{selectedHospital.fixedSalary || 0} EGP</span>
                                                <span className="text-sm font-bold text-primary">{customFixed} EGP</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm font-bold text-foreground">{selectedHospital.fixedSalary || 0} EGP</span>
                                        )}
                                    </div>
                                    <div className="pt-0.5">
                                        <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter block mb-1.5">Item Rates</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedHospital.itemRates?.filter(i => !i.archived).map(item => (
                                                <div key={item.id} className="bg-primary/5 border border-primary/10 rounded-md px-2 py-1 flex items-center gap-1.5">
                                                    <span className="text-[11px] font-medium text-foreground/80">{item.name}</span>
                                                    <span className="w-1 h-1 rounded-full bg-primary/20" />
                                                    <span className="text-[11px] font-bold text-primary">{item.rate}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Date */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.2 }}
                >
                    <Label>Date</Label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                                onSelect={(d) => {
                                    if (d) {
                                        setDate(d);
                                        setIsCalendarOpen(false);
                                    }
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </motion.div>

                {/* Time */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.075, duration: 0.2 }}
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

                {/* Cases / Procedures / Detailed */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                >
                    {selectedHospital?.paymentModel === "detailed" && (
                        <div className="space-y-3">
                            <Label>Service Counts</Label>
                            <div className="grid grid-cols-2 gap-4">
                                {selectedHospital.itemRates?.filter(item => !item.archived || (itemCounts && itemCounts[item.id] > 0)).map((item) => (
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
                    )}

                    {(selectedHospital?.paymentModel === "per_patient" || selectedHospital?.paymentModel === "mixed") && (
                        <div className="grid grid-cols-1">
                            <div>
                                <Label htmlFor="cases">Cases / Patients</Label>
                                <Input
                                    id="cases"
                                    type="number"
                                    min="0"
                                    value={casesCount}
                                    onChange={(e) => setCasesCount(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                        </div>
                    )}

                    {selectedHospital?.paymentModel === "government" && (
                        <div className="flex items-center justify-between p-3.5 bg-muted/30 rounded-2xl border border-border/50 animate-in fade-in duration-200">
                            <div className="space-y-0.5">
                                <Label htmlFor="isNabatya">Nabatya Shift (نباطشية / نوبتجية)</Label>
                                <p className="text-[11px] text-muted-foreground">
                                    Adds the Nabatya shift allowance to this shift
                                </p>
                            </div>
                            <Switch
                                id="isNabatya"
                                checked={isNabatya}
                                	onCheckedChange={setIsNabatya}
                            />
                        </div>
                    )}
                </motion.div>

<div />



                {/* Notes */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.2 }}
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

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.175, duration: 0.2 }}
                >
                    <Button onClick={handleSave} disabled={isSaving} className="w-full h-12 text-base font-semibold">
                        {isSaving ? (
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        ) : (
                            <Check className="h-5 w-5 mr-2" />
                        )}
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </motion.div>
            </div>

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
                        <button
                            onClick={handleConfirmHourly}
                            className="w-full text-left bg-primary/10 border border-primary/30 rounded-xl p-4 hover:bg-primary/20 transition-colors touch-feedback"
                        >
                            <p className="font-semibold text-foreground text-sm">Calculate by Hours</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {partialHours}h ÷ 24h ={" "}
                                <span className="font-medium text-primary">
                                    {(pendingCustomRate ?? 0).toLocaleString()} EGP
                                </span>
                            </p>
                        </button>
                        <button
                            onClick={handleConfirmFixed}
                            className="w-full text-left bg-muted/50 border border-border rounded-xl p-4 hover:bg-muted transition-colors touch-feedback"
                        >
                            <p className="font-semibold text-foreground text-sm">Use Full Rate</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Keep the hospital's fixed rate —{" "}
                                <span className="font-medium text-foreground">
                                    {estimatedEarnings.toLocaleString()} EGP
                                </span>
                            </p>
                        </button>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" size="sm" onClick={() => setPartialDialogOpen(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
