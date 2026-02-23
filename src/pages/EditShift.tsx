import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { CalendarIcon, Clock, ArrowLeft, Check, Timer } from "lucide-react";
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
    const [notes, setNotes] = useState(shift?.notes ?? "");
    const [useCustomRate, setUseCustomRate] = useState(!!shift?.customRate);
    const [customRate, setCustomRate] = useState(
        shift?.customRate?.toString() ?? ""
    );
    const [itemCounts, setItemCounts] = useState<Record<string, number>>(
        shift?.itemCounts ?? {}
    );

    // Partial-shift dialog
    const [partialDialogOpen, setPartialDialogOpen] = useState(false);
    const [partialHours, setPartialHours] = useState(0);
    const [pendingCustomRate, setPendingCustomRate] = useState<number | undefined>(undefined);

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

    const estimatedEarnings = hospitalId
        ? calculateShiftEarnings(
            hospitalId,
            parseInt(casesCount) || 0,
            useCustomRate ? parseFloat(customRate) || undefined : undefined,
            selectedHospital?.paymentModel === "detailed" ? itemCounts : undefined
        )
        : 0;

    const doSave = (overrideRate?: number) => {
        updateShift(shift.id, {
            hospitalId,
            date,
            startTime,
            endTime,
            casesCount: parseInt(casesCount) || 0,
            proceduresCount: parseInt(proceduresCount) || 0,
            notes: notes.trim() || undefined,
            customRate: overrideRate,
            itemCounts:
                selectedHospital?.paymentModel === "detailed" ? itemCounts : undefined,
        });
        toast({ title: "Shift Updated", description: "Your shift has been saved successfully." });
        navigate("/");
    };

    const handleSave = () => {
        const hours = calcShiftHours(startTime, endTime);
        if (hours < 24 && !useCustomRate) {
            const proRataRate = Math.round((estimatedEarnings / 24) * hours);
            setPartialHours(hours);
            setPendingCustomRate(proRataRate);
            setPartialDialogOpen(true);
            return;
        }
        doSave(useCustomRate ? parseFloat(customRate) || undefined : undefined);
    };

    const handleConfirmHourly = () => { setPartialDialogOpen(false); doSave(pendingCustomRate); };
    const handleConfirmFixed = () => { setPartialDialogOpen(false); doSave(useCustomRate ? parseFloat(customRate) || undefined : undefined); };

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
                    transition={{ delay: 0.05 }}
                >
                    <Label>Hospital</Label>
                    <Select value={hospitalId} onValueChange={setHospitalId}>
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

                {/* Date */}
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
                                onSelect={(d) => d && setDate(d)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </motion.div>

                {/* Time */}
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

                {/* Cases / Procedures / Detailed */}
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
                            <div>
                                <Label htmlFor="procedures">Procedures</Label>
                                <Input
                                    id="procedures"
                                    type="number"
                                    min="0"
                                    value={proceduresCount}
                                    onChange={(e) => setProceduresCount(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Custom Rate */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
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
                    transition={{ delay: 0.3 }}
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

                {/* Save Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <Button onClick={handleSave} className="w-full h-12 text-base font-semibold">
                        <Check className="h-5 w-5 mr-2" />
                        Save Changes
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
