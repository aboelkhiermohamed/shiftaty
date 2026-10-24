import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Coins,
  Users,
  Layers,
  Stethoscope,
  Landmark,
  Check,
  Plus,
  Trash2,
  Pencil,
  Info,
  Loader2,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HospitalIcon } from "./HospitalIcon";
import { useAppStore } from "@/stores/appStore";
import { Hospital, PaymentModel } from "@/types";
import { HOSPITAL_COLORS, getHospitalColor } from "@/lib/hospitalUtils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface AddHospitalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitalToEdit?: Hospital | null;
  onSuccess?: (hospital: Hospital) => void;
}

interface PaymentModelConfig {
  id: PaymentModel;
  title: string;
  englishLabel: string;
  summary: string;
  description: string;
  exampleBadge: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

export const PAYMENT_MODELS: PaymentModelConfig[] = [
  {
    id: "fixed",
    title: "مبلغ ثابت للشفت",
    englishLabel: "Fixed Rate",
    summary: "أجر مقطوع ومحدد للشفت كامل",
    description: "بتاخد مبلغ محدد للشفت كامل، بغض النظر عن عدد الحالات أو الكشوفات.",
    exampleBadge: "شفت 12 ساعة = 1,000 ج.م",
    icon: Coins,
    accentColor: "text-blue-400",
  },
  {
    id: "per_patient",
    title: "بالحالة أو الكشف",
    englishLabel: "Per Patient / Case",
    summary: "أجر محسوب بعدد المرضى",
    description: "حسابك بيعتمد على عدد الحالات؛ كل كشف أو مريض بتناظره ليه سعر ثابت.",
    exampleBadge: "10 حالات × 150 ج = 1,500 ج.م",
    icon: Users,
    accentColor: "text-emerald-400",
  },
  {
    id: "mixed",
    title: "أساسي + نسبة بالعيان",
    englishLabel: "Mixed (Base + Case)",
    summary: "أساسي مضمون + عمولة لكل حالة",
    description: "مبلغ أساسي مضمون لحضور الشفت، بالإضافة لنسبة أو حافز إضافي عن كل حالة كشف.",
    exampleBadge: "500 ج أساسي + (8 حالات × 50 ج) = 900 ج.م",
    icon: Layers,
    accentColor: "text-purple-400",
  },
  {
    id: "detailed",
    title: "تفصيلي (عمليات وإجراءات)",
    englishLabel: "Detailed Procedures",
    summary: "أساسي + تسعير لكل إجراء",
    description: "أجر أساسي للشفت مع قائمة خدمات بأسعار محددة (مثل: ولادة، سونار، غرز، رعاية).",
    exampleBadge: "500 ج أساسي + ولادة (300 ج) + سونار (100 ج)",
    icon: Stethoscope,
    accentColor: "text-amber-400",
  },
  {
    id: "government",
    title: "حكومي / ميري",
    englishLabel: "Government / Miri",
    summary: "مرتب شهري + بدل نبطشيات",
    description: "مرتب شهري حكومي ثابت ينزل في تقريرك الشهري + بدل مالي عن كل نوبتجية تسجلها.",
    exampleBadge: "مرتب 5,000 ج/شهر + 300 ج للنوبتجية",
    icon: Landmark,
    accentColor: "text-rose-400",
  },
];

export function AddHospitalModal({
  open,
  onOpenChange,
  hospitalToEdit,
  onSuccess,
}: AddHospitalModalProps) {
  const { toast } = useToast();
  const addHospital = useAppStore((state) => state.addHospital);
  const updateHospital = useAppStore((state) => state.updateHospital);

  // View state: "form" for compact inputs, "model-picker" for dedicated full explanation sheet
  const [currentView, setCurrentView] = useState<"form" | "model-picker">("form");

  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [paymentModel, setPaymentModel] = useState<PaymentModel>("fixed");
  const [fixedRate, setFixedRate] = useState("");
  const [perPatientRate, setPerPatientRate] = useState("");
  const [fixedSalary, setFixedSalary] = useState("");
  const [governmentSalary, setGovernmentSalary] = useState("");
  const [nabatyaAllowance, setNabatyaAllowance] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Detailed items state
  const [itemRates, setItemRates] = useState<
    { id: string; name: string; rate: number; archived?: boolean }[]
  >([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemRate, setNewItemRate] = useState("");
  const [editingItem, setEditingItem] = useState<{
    id: string;
    name: string;
    rate: number;
  } | null>(null);

  // Initialize or reset on open / hospitalToEdit changes
  useEffect(() => {
    if (open) {
      setCurrentView("form");
      if (hospitalToEdit) {
        setName(hospitalToEdit.name || "");
        setColor(hospitalToEdit.color || getHospitalColor(hospitalToEdit));
        setPaymentModel(hospitalToEdit.paymentModel || "fixed");
        setFixedRate(hospitalToEdit.fixedRate ? String(hospitalToEdit.fixedRate) : "");
        setPerPatientRate(
          hospitalToEdit.perPatientRate ? String(hospitalToEdit.perPatientRate) : ""
        );
        setFixedSalary(
          hospitalToEdit.fixedSalary ? String(hospitalToEdit.fixedSalary) : ""
        );
        setItemRates(hospitalToEdit.itemRates || []);

        if (hospitalToEdit.paymentModel === "government") {
          setGovernmentSalary(
            hospitalToEdit.fixedSalary ? String(hospitalToEdit.fixedSalary) : ""
          );
          setNabatyaAllowance(
            hospitalToEdit.fixedRate ? String(hospitalToEdit.fixedRate) : ""
          );
        } else {
          setGovernmentSalary("");
          setNabatyaAllowance("");
        }
      } else {
        setName("");
        setColor(HOSPITAL_COLORS[Math.floor(Math.random() * HOSPITAL_COLORS.length)]);
        setPaymentModel("fixed");
        setFixedRate("");
        setPerPatientRate("");
        setFixedSalary("");
        setGovernmentSalary("");
        setNabatyaAllowance("");
        setItemRates([]);
        setNewItemName("");
        setNewItemRate("");
      }
      setEditingItem(null);
    }
  }, [open, hospitalToEdit]);

  const activeModelConfig =
    PAYMENT_MODELS.find((m) => m.id === paymentModel) || PAYMENT_MODELS[0];
  const ActiveModelIcon = activeModelConfig.icon;

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemRate) return;
    setItemRates((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: newItemName.trim(),
        rate: parseFloat(newItemRate) || 0,
      },
    ]);
    setNewItemName("");
    setNewItemRate("");
  };

  const handleUpdateItem = () => {
    if (!editingItem || !editingItem.name.trim() || !editingItem.rate) return;
    setItemRates((prev) =>
      prev
        .map((item) =>
          item.id === editingItem.id ? { ...item, archived: true } : item
        )
        .concat([
          {
            id: Math.random().toString(36).substring(2, 9),
            name: editingItem.name.trim(),
            rate: editingItem.rate,
          },
        ])
    );
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    setItemRates((prev) =>
      prev.map((item) => (item.id === id ? { ...item, archived: true } : item))
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter the facility or hospital name",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const resolvedColor = color || getHospitalColor({ name });
      const hospitalPayload = {
        name: name.trim(),
        color: resolvedColor,
        paymentModel,
        fixedRate:
          paymentModel === "government"
            ? parseFloat(nabatyaAllowance) || 0
            : parseFloat(fixedRate) || 0,
        perPatientRate: parseFloat(perPatientRate) || 0,
        fixedSalary:
          paymentModel === "government"
            ? parseFloat(governmentSalary) || 0
            : parseFloat(fixedSalary) || 0,
        itemRates,
      };

      if (hospitalToEdit) {
        await updateHospital(hospitalToEdit.id, hospitalPayload);
        toast({
          title: "Facility Updated",
          description: `${name} has been updated successfully`,
        });
        if (onSuccess) {
          onSuccess({
            ...hospitalToEdit,
            ...hospitalPayload,
            updatedAt: new Date(),
          });
        }
      } else {
        await addHospital(hospitalPayload);
        toast({
          title: "Facility Added",
          description: `${name} has been configured successfully`,
        });
      }

      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to save hospital details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-3xl bg-card border-border shadow-2xl">
        <AnimatePresence mode="wait" initial={false}>
          {currentView === "form" ? (
            /* ================= VIEW 1: COMPACT FORM ================= */
            <motion.div
              key="form-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col h-full max-h-[92vh]"
            >
              {/* Header with Visual Preview */}
              <div className="p-5 pb-4 border-b border-border/60 bg-secondary/15">
                <DialogHeader className="text-left space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded-md bg-primary/10">
                      {hospitalToEdit ? "Edit Facility" : "New Facility"}
                    </span>
                  </div>
                  <DialogTitle className="text-xl font-black tracking-tight text-foreground">
                    {hospitalToEdit ? "Update Hospital Rates" : "Add New Hospital"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Configure facility details and default compensation rates.
                  </DialogDescription>
                </DialogHeader>

                {/* Live Hospital Identity Preview Card */}
                <div className="mt-3.5 p-3 rounded-2xl bg-card border border-border/70 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <HospitalIcon
                      name={name || "Hospital"}
                      color={color || getHospitalColor({ name: name || "Preview" })}
                      size="md"
                    />
                    <div className="min-w-0">
                      <span className="block text-sm font-bold text-foreground truncate">
                        {name.trim() ? name : "Hospital Name Preview"}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                        {activeModelConfig.title}
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-secondary/40 px-2.5 py-1 rounded-xl">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Live Identity
                  </div>
                </div>
              </div>

              {/* Form Content - Compact & Clean */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* 1. Facility Name & Color Accent */}
                <div className="space-y-2.5">
                  <Label htmlFor="hospital-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Facility Name / اسم المستشفى <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="hospital-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. City General Hospital, مستشفى السلام الدولي"
                      className="pl-10 h-11 rounded-xl bg-card border-border text-sm font-medium focus-visible:ring-primary"
                    />
                  </div>

                  {/* Accent Color Palette */}
                  <div className="pt-1 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                      Color:
                    </span>
                    {HOSPITAL_COLORS.map((c) => {
                      const isSelected = (color || getHospitalColor({ name })) === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-sm",
                            isSelected
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                              : "hover:scale-105 opacity-80 hover:opacity-100"
                          )}
                          style={{ backgroundColor: c }}
                          title={c}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Payment Model Trigger Card */}
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      نظام الحساب / Payment Model <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      اضغط لتغيير النظام
                    </span>
                  </div>

                  {/* Clean Human-Friendly Card */}
                  <div
                    onClick={() => setCurrentView("model-picker")}
                    role="button"
                    tabIndex={0}
                    className="p-3.5 rounded-2xl bg-secondary/30 hover:bg-secondary/50 border border-border/70 hover:border-primary/50 flex items-center justify-between cursor-pointer transition-all duration-200 group active:scale-[0.99] shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm">
                        <ActiveModelIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="text-sm font-bold text-foreground truncate">
                          {activeModelConfig.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {activeModelConfig.summary}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-primary px-3 py-1.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 shrink-0 transition-colors ml-2">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>تغيير</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* 3. Dynamic Rate Inputs Based on Active Model */}
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Compensation Rates / تفاصيل الأجر والأسعار
                  </Label>

                  {/* Case: Fixed Rate */}
                  {paymentModel === "fixed" && (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <Label htmlFor="fixedRate" className="text-xs font-semibold text-foreground">
                        Fixed Rate per Shift (أجر الشفت الثابت)
                      </Label>
                      <div className="relative">
                        <Input
                          id="fixedRate"
                          type="number"
                          value={fixedRate}
                          onChange={(e) => setFixedRate(e.target.value)}
                          placeholder="e.g. 1000"
                          className="h-11 rounded-xl bg-card border-border pr-14 text-sm font-semibold"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                          EGP
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Credited as full shift earnings regardless of cases seen.
                      </p>
                    </div>
                  )}

                  {/* Case: Per Patient */}
                  {paymentModel === "per_patient" && (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <Label htmlFor="perPatientRate" className="text-xs font-semibold text-foreground">
                        Rate per Patient / Case (سعر الحالة أو الكشف)
                      </Label>
                      <div className="relative">
                        <Input
                          id="perPatientRate"
                          type="number"
                          value={perPatientRate}
                          onChange={(e) => setPerPatientRate(e.target.value)}
                          placeholder="e.g. 150"
                          className="h-11 rounded-xl bg-card border-border pr-20 text-sm font-semibold"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                          EGP / case
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Earnings = (Examined patients × rate).
                      </p>
                    </div>
                  )}

                  {/* Case: Mixed (Fixed Base + Per Patient) */}
                  {paymentModel === "mixed" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <Label htmlFor="mixedFixedRate" className="text-xs font-semibold text-foreground">
                          Base Shift Pay (الأساسي)
                        </Label>
                        <div className="relative">
                          <Input
                            id="mixedFixedRate"
                            type="number"
                            value={fixedRate}
                            onChange={(e) => setFixedRate(e.target.value)}
                            placeholder="e.g. 500"
                            className="h-11 rounded-xl bg-card border-border pr-14 text-sm font-semibold"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                            EGP
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="mixedPerPatient" className="text-xs font-semibold text-foreground">
                          Per Patient Rate (لكل حالة)
                        </Label>
                        <div className="relative">
                          <Input
                            id="mixedPerPatient"
                            type="number"
                            value={perPatientRate}
                            onChange={(e) => setPerPatientRate(e.target.value)}
                            placeholder="e.g. 50"
                            className="h-11 rounded-xl bg-card border-border pr-20 text-sm font-semibold"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                            EGP / case
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Case: Government / Miri */}
                  {paymentModel === "government" && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <Label htmlFor="governmentSalary" className="text-xs font-semibold text-foreground">
                          Monthly Salary (المرتب الشهري الثابت)
                        </Label>
                        <div className="relative">
                          <Input
                            id="governmentSalary"
                            type="number"
                            value={governmentSalary}
                            onChange={(e) => setGovernmentSalary(e.target.value)}
                            placeholder="e.g. 5000"
                            className="h-11 rounded-xl bg-card border-border pr-16 text-sm font-semibold"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                            EGP / mo
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="nabatyaAllowance" className="text-xs font-semibold text-foreground">
                          Nabatya Allowance (بدل النوبتجية الواحدة)
                        </Label>
                        <div className="relative">
                          <Input
                            id="nabatyaAllowance"
                            type="number"
                            value={nabatyaAllowance}
                            onChange={(e) => setNabatyaAllowance(e.target.value)}
                            placeholder="e.g. 300"
                            className="h-11 rounded-xl bg-card border-border pr-16 text-sm font-semibold"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                            EGP / shift
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Case: Detailed (Base + Billable Items) */}
                  {paymentModel === "detailed" && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <Label htmlFor="detailedBaseSalary" className="text-xs font-semibold text-foreground">
                          Base Shift Salary (الأجر الأساسي - اختياري)
                        </Label>
                        <div className="relative">
                          <Input
                            id="detailedBaseSalary"
                            type="number"
                            value={fixedSalary}
                            onChange={(e) => setFixedSalary(e.target.value)}
                            placeholder="e.g. 500 (Leave 0 if none)"
                            className="h-11 rounded-xl bg-card border-border pr-14 text-sm font-semibold"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                            EGP
                          </div>
                        </div>
                      </div>

                      {/* Billable Items List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground">
                            Billable Services (الخدمات والعمليات)
                          </Label>
                          <span className="text-[11px] text-muted-foreground">
                            {itemRates.filter((i) => !i.archived).length} Services
                          </span>
                        </div>

                        {itemRates.filter((i) => !i.archived).length > 0 && (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {itemRates
                              .filter((i) => !i.archived)
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/70"
                                >
                                  <span className="text-xs font-bold text-foreground truncate pr-2">
                                    {item.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-lg bg-primary/10">
                                      {item.rate} EGP
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-primary rounded-lg"
                                      onClick={() =>
                                        setEditingItem({
                                          id: item.id,
                                          name: item.name,
                                          rate: item.rate,
                                        })
                                      }
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg"
                                      onClick={() => handleDeleteItem(item.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Add New Item Row */}
                        <div className="flex gap-2 pt-1">
                          <Input
                            placeholder="Service (e.g. Normal Delivery, سونار)"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="flex-[2] h-9 text-xs bg-card rounded-xl"
                          />
                          <div className="relative flex-1">
                            <Input
                              type="number"
                              placeholder="Rate"
                              value={newItemRate}
                              onChange={(e) => setNewItemRate(e.target.value)}
                              className="h-9 text-xs bg-card rounded-xl pr-9"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
                              EGP
                            </span>
                          </div>
                          <Button
                            type="button"
                            onClick={handleAddItem}
                            disabled={!newItemName.trim() || !newItemRate}
                            size="icon"
                            className="h-9 w-9 shrink-0 rounded-xl"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="p-4 border-t border-border/60 bg-card/95 backdrop-blur-md flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                  className="rounded-xl px-4 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSaving || !name.trim()}
                  className="rounded-xl px-5 text-xs font-bold shadow-md shadow-primary/20 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {hospitalToEdit ? "Update Facility" : "Add Facility"}
                </Button>
              </div>
            </motion.div>
          ) : (
            /* ================= VIEW 2: DEDICATED PAYMENT MODEL GUIDE & SELECTION PAGE ================= */
            <motion.div
              key="model-picker-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col h-full max-h-[92vh]"
            >
              {/* Header with Back button */}
              <div className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-secondary/15">
                <button
                  type="button"
                  onClick={() => setCurrentView("form")}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mb-2 py-1 px-1.5 -ml-1 rounded-lg w-fit"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Facility Details</span>
                </button>
                <DialogTitle className="text-lg font-black tracking-tight text-foreground">
                  Select Payment Model / طريقة الحساب
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Choose how your earnings and shifts are calculated at this hospital.
                </DialogDescription>
              </div>

              {/* Scrollable Model Guide List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                {PAYMENT_MODELS.map((model) => {
                  const isSelected = paymentModel === model.id;
                  const IconComp = model.icon;
                  return (
                    <div
                      key={model.id}
                      onClick={() => {
                        setPaymentModel(model.id);
                      }}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 text-left relative group",
                        isSelected
                          ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/40"
                          : "bg-secondary/20 border-border/70 hover:bg-secondary/35 hover:border-border"
                      )}
                    >
                      {/* Header: Icon + Titles + Radio */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0",
                              isSelected
                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                                : "bg-secondary text-muted-foreground group-hover:text-foreground"
                            )}
                          >
                            <IconComp className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-foreground leading-tight">
                              {model.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {model.englishLabel}
                            </div>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Natural Doctor Explanation */}
                      <p className="text-xs text-muted-foreground leading-relaxed pr-0.5" dir="rtl">
                        {model.description}
                      </p>

                      {/* Example Badge */}
                      <div className="pt-0.5 flex items-center gap-2">
                        <span className="text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                          💡 {model.exampleBadge}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Confirm Button */}
              <div className="p-4 border-t border-border/60 bg-card/95 backdrop-blur-md flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-muted-foreground truncate">
                  المحدد: <strong className="text-foreground">{activeModelConfig.title}</strong>
                </span>
                <Button
                  type="button"
                  onClick={() => setCurrentView("form")}
                  className="rounded-xl px-5 text-xs font-bold shadow-md shadow-primary/20 flex items-center gap-1.5 shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد الاختيار</span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>

      {/* Edit Item Rate Sub-Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-xs rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Service Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Service Name</Label>
              <Input
                value={editingItem?.name || ""}
                onChange={(e) =>
                  setEditingItem((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
                className="mt-1 h-10 text-xs rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs">Rate (EGP)</Label>
              <Input
                type="number"
                value={editingItem?.rate || ""}
                onChange={(e) =>
                  setEditingItem((prev) =>
                    prev ? { ...prev, rate: parseFloat(e.target.value) || 0 } : null
                  )
                }
                className="mt-1 h-10 text-xs rounded-xl"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingItem(null)}
                className="flex-1 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateItem}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
