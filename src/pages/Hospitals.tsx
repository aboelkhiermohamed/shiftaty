import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Building2, MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/stores/appStore";
import { PaymentModel } from "@/types";
import { useToast } from "@/hooks/use-toast";

const paymentModelLabels: Record<PaymentModel, string> = {
  fixed: "Fixed Rate per Shift",
  per_patient: "Per Patient/Case",
  mixed: "Mixed (Fixed + Per Patient)",
  detailed: "Detailed (Fixed + Items)",
  government: "Government / Miri (حكومي / ميري)",
};

export default function Hospitals() {
  const [isOpen, setIsOpen] = useState(false);
  const [hospitalToDelete, setHospitalToDelete] = useState<{ id: string, name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [paymentModel, setPaymentModel] = useState<PaymentModel>("fixed");
  const [fixedRate, setFixedRate] = useState("");
  const [perPatientRate, setPerPatientRate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Government model state
  const [governmentSalary, setGovernmentSalary] = useState("");
  const [nabatyaAllowance, setNabatyaAllowance] = useState("");

  // Detailed model state
  const [fixedSalary, setFixedSalary] = useState("");
  const [itemRates, setItemRates] = useState<{ id: string; name: string; rate: number; archived?: boolean }[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemRate, setNewItemRate] = useState("");
  const [editingItem, setEditingItem] = useState<{ id: string, name: string, rate: number } | null>(null);

  const hospitals = useAppStore((state) => state.hospitals);
  const addHospital = useAppStore((state) => state.addHospital);
  const updateHospital = useAppStore((state) => state.updateHospital);
  const deleteHospital = useAppStore((state) => state.deleteHospital);
  const { toast } = useToast();

  const resetForm = () => {
    setName("");
    setPaymentModel("fixed");
    setFixedRate("");
    setPerPatientRate("");
    setFixedSalary("");
    setItemRates([]);
    setNewItemName("");
    setNewItemRate("");
    setEditingId(null);
    setGovernmentSalary("");
    setNabatyaAllowance("");
  };

  const openEditDialog = (hospital: typeof hospitals[0]) => {
    setEditingId(hospital.id);
    setName(hospital.name);
    setPaymentModel(hospital.paymentModel);
    setFixedRate(hospital.fixedRate.toString());
    setPerPatientRate(hospital.perPatientRate.toString());

    // Load detailed model data
    setFixedSalary(hospital.fixedSalary?.toString() || "");
    setItemRates(hospital.itemRates || []);

    // Load government model data
    setGovernmentSalary(hospital.fixedSalary?.toString() || "");
    setNabatyaAllowance(hospital.fixedRate?.toString() || "");

    setIsOpen(true);
  };

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemRate) return;
    setItemRates([
      ...itemRates,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: newItemName.trim(),
        rate: parseFloat(newItemRate),
      },
    ]);
    setNewItemName("");
    setNewItemRate("");
  };

  const handleUpdateItem = () => {
    if (!editingItem || !editingItem.name.trim() || !editingItem.rate) return;

    // Archive the old item and create a new one to preserve history for old shifts
    setItemRates(prev => prev.map(item =>
      item.id === editingItem.id ? { ...item, archived: true } : item
    ).concat([{
      id: Math.random().toString(36).substring(2, 9),
      name: editingItem.name.trim(),
      rate: editingItem.rate,
    }]));

    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    // Soft delete by marking as archived
    setItemRates(prev => prev.map(item =>
      item.id === id ? { ...item, archived: true } : item
    ));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a hospital name",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const hospitalData = {
        name: name.trim(),
        paymentModel,
        fixedRate: paymentModel === "government" ? parseFloat(nabatyaAllowance) || 0 : parseFloat(fixedRate) || 0,
        perPatientRate: parseFloat(perPatientRate) || 0,
        fixedSalary: paymentModel === "government" ? parseFloat(governmentSalary) || 0 : parseFloat(fixedSalary) || 0,
        itemRates,
      };

      if (editingId) {
        await updateHospital(editingId, hospitalData);
        toast({
          title: "Hospital Updated",
          description: `${name} has been updated successfully`,
        });
      } else {
        await addHospital(hospitalData);
        toast({
          title: "Hospital Added",
          description: `${name} has been added successfully`,
        });
      }

      resetForm();
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!hospitalToDelete) return;
    try {
      await deleteHospital(hospitalToDelete.id);
      toast({
        title: "Hospital Deleted",
        description: `${hospitalToDelete.name} has been removed`,
      });
    } catch (e) {
      console.error(e);
      alert("Failed to delete hospital online. Try again later.");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Hospitals"
        subtitle="Manage your hospitals and payment rates"
      />

      <div className="px-4">
        {hospitals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl p-8 text-center border border-border"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ willChange: "transform" }}
            >
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            </motion.div>
            <p className="text-foreground font-medium">No hospitals yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first hospital to start logging shifts
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {hospitals.map((hospital, index) => (
                <motion.div
                  key={hospital.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.025, duration: 0.2 }}
                  className="bg-card rounded-xl p-4 shadow-sm border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: hospital.color + "20" }}
                      >
                        <Building2
                          className="h-5 w-5"
                          style={{ color: hospital.color }}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {hospital.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {paymentModelLabels[hospital.paymentModel]}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2 text-sm">
                          {hospital.paymentModel === "detailed" ? (
                            <>
                              {hospital.fixedSalary && hospital.fixedSalary > 0 && (
                                <span className="text-foreground bg-secondary/50 px-2 py-0.5 rounded text-xs">
                                  Base: {hospital.fixedSalary}
                                </span>
                              )}
                              {hospital.itemRates?.filter(item => !item.archived).map((item) => (
                                <span key={item.id} className="text-foreground bg-secondary/50 px-2 py-0.5 rounded text-xs">
                                  {item.name}: {item.rate}
                                </span>
                              ))}
                            </>
                          ) : hospital.paymentModel === "government" ? (
                            <>
                              {hospital.fixedSalary && hospital.fixedSalary > 0 && (
                                <span className="text-foreground bg-secondary/50 px-2 py-0.5 rounded text-xs">
                                  Monthly Salary (المرتب الحكومي): {hospital.fixedSalary} EGP
                                </span>
                              )}
                              {hospital.fixedRate && hospital.fixedRate > 0 && (
                                <span className="text-foreground bg-secondary/50 px-2 py-0.5 rounded text-xs">
                                  Nabatya Allowance (بدل النوبتجية): {hospital.fixedRate} EGP
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {hospital.fixedRate > 0 && (
                                <span className="text-foreground">
                                  <span className="text-muted-foreground">Fixed: </span>
                                  {hospital.fixedRate} EGP
                                </span>
                              )}
                              {hospital.perPatientRate > 0 && (
                                <span className="text-foreground">
                                  <span className="text-muted-foreground">Per case: </span>
                                  {hospital.perPatientRate} EGP
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(hospital)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setHospitalToDelete({ id: hospital.id, name: hospital.name })}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>


      {/* Floating Action Button for Adding Hospital */}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogTrigger asChild>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="fixed bottom-24 right-6 z-50"
          >
            <Button size="icon" className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="h-6 w-6" />
            </Button>
          </motion.div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Hospital" : "Add Hospital"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Hospital Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., City General Hospital"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Payment Model</Label>
              <Select
                value={paymentModel}
                onValueChange={(v) => setPaymentModel(v as PaymentModel)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Rate per Shift</SelectItem>
                  <SelectItem value="per_patient">Per Patient/Case</SelectItem>
                  <SelectItem value="mixed">Mixed (Fixed + Per Patient)</SelectItem>
                  <SelectItem value="detailed">Detailed (Fixed + Items)</SelectItem>
                  <SelectItem value="government">Government / Miri (حكومي / ميري)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(paymentModel === "fixed" || paymentModel === "mixed") && (
              <div>
                <Label htmlFor="fixedRate">Fixed Rate (EGP)</Label>
                <Input
                  id="fixedRate"
                  type="number"
                  value={fixedRate}
                  onChange={(e) => setFixedRate(e.target.value)}
                  placeholder="e.g., 800"
                  className="mt-1.5"
                />
              </div>
            )}

            {(paymentModel === "per_patient" || paymentModel === "mixed") && (
              <div>
                <Label htmlFor="perPatientRate">Rate per Patient (EGP)</Label>
                <Input
                  id="perPatientRate"
                  type="number"
                  value={perPatientRate}
                  onChange={(e) => setPerPatientRate(e.target.value)}
                  placeholder="e.g., 150"
                  className="mt-1.5"
                />
              </div>
            )}

            {paymentModel === "government" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <Label htmlFor="governmentSalary">Fixed Monthly Salary (المرتب الحكومي الثابت)</Label>
                  <Input
                    id="governmentSalary"
                    type="number"
                    value={governmentSalary}
                    onChange={(e) => setGovernmentSalary(e.target.value)}
                    placeholder="e.g., 5000"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="nabatyaAllowance">Nabatya Shift Allowance (بدل النوبتجية)</Label>
                  <Input
                    id="nabatyaAllowance"
                    type="number"
                    value={nabatyaAllowance}
                    onChange={(e) => setNabatyaAllowance(e.target.value)}
                    placeholder="e.g., 300"
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}

            {paymentModel === "detailed" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fixedSalary">Base Salary per Shift (Optional)</Label>
                  <Input
                    id="fixedSalary"
                    type="number"
                    value={fixedSalary}
                    onChange={(e) => setFixedSalary(e.target.value)}
                    placeholder="e.g., 500"
                    className="mt-1.5"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Billable Items</Label>
                  <div className="space-y-2">
                    {itemRates.filter(i => !i.archived).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 bg-secondary/30 p-2 rounded-lg">
                        <span className="flex-1 text-sm font-medium">{item.name}</span>
                        <span className="text-sm text-muted-foreground">{item.rate} EGP</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => setEditingItem({ id: item.id, name: item.name, rate: item.rate })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Item Name (e.g. Birth)"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="flex-[2]"
                    />
                    <Input
                      type="number"
                      placeholder="Rate"
                      value={newItemRate}
                      onChange={(e) => setNewItemRate(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleAddItem} size="icon" className="shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Button onClick={handleSubmit} disabled={isSaving} className="w-full">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Update Hospital" : "Add Hospital"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Rate Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Edit Item Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="editItemName">Item Name</Label>
              <Input
                id="editItemName"
                value={editingItem?.name || ""}
                onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="editItemRate">Rate (EGP)</Label>
              <Input
                id="editItemRate"
                type="number"
                value={editingItem?.rate || ""}
                onChange={(e) => setEditingItem(prev => prev ? { ...prev, rate: parseFloat(e.target.value) || 0 } : null)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingItem(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpdateItem} className="flex-1">
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!hospitalToDelete} onOpenChange={(open) => !open && setHospitalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {hospitalToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this hospital? This will not automatically delete associated shifts, but you will no longer be able to use this hospital's rates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Hospital
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout >
  );
}
