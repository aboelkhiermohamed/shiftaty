import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Building2, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
import { useAppStore } from "@/stores/appStore";
import { PaymentModel } from "@/types";
import { useToast } from "@/hooks/use-toast";

const paymentModelLabels: Record<PaymentModel, string> = {
  fixed: "Fixed Rate per Shift",
  per_patient: "Per Patient/Case",
  mixed: "Mixed (Fixed + Per Patient)",
  detailed: "Detailed (Fixed + Items)",
};

export default function Hospitals() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [paymentModel, setPaymentModel] = useState<PaymentModel>("fixed");
  const [fixedRate, setFixedRate] = useState("");
  const [perPatientRate, setPerPatientRate] = useState("");

  // Detailed model state
  const [fixedSalary, setFixedSalary] = useState("");
  const [itemRates, setItemRates] = useState<{ id: string; name: string; rate: number }[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemRate, setNewItemRate] = useState("");

  const hospitals = useAppStore((state) => state.hospitals);
  const addHospital = useAppStore((state) => state.addHospital);
  const updateHospital = useAppStore((state) => state.updateHospital);
  const deleteHospital = useAppStore((state) => state.deleteHospital);
  const { toast } = useToast();

  const resetForm = () => {
    setName("");
    setName("");
    setPaymentModel("fixed");
    setFixedRate("");
    setPerPatientRate("");
    setFixedSalary("");
    setItemRates([]);
    setNewItemName("");
    setNewItemRate("");
    setEditingId(null);
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

  const handleDeleteItem = (id: string) => {
    setItemRates(itemRates.filter((item) => item.id !== id));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a hospital name",
        variant: "destructive",
      });
      return;
    }

    const hospitalData = {
      name: name.trim(),
      paymentModel,
      fixedRate: parseFloat(fixedRate) || 0,
      perPatientRate: parseFloat(perPatientRate) || 0,
      fixedSalary: parseFloat(fixedSalary) || 0,
      itemRates,
    };

    if (editingId) {
      updateHospital(editingId, hospitalData);
      toast({
        title: "Hospital Updated",
        description: `${name} has been updated successfully`,
      });
    } else {
      addHospital(hospitalData);
      toast({
        title: "Hospital Added",
        description: `${name} has been added successfully`,
      });
    }

    resetForm();
    setIsOpen(false);
  };

  const handleDelete = (id: string, hospitalName: string) => {
    deleteHospital(id);
    toast({
      title: "Hospital Deleted",
      description: `${hospitalName} has been removed`,
    });
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
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
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
                  transition={{ delay: index * 0.05 }}
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
                              {hospital.itemRates?.map((item) => (
                                <span key={item.id} className="text-foreground bg-secondary/50 px-2 py-0.5 rounded text-xs">
                                  {item.name}: {item.rate}
                                </span>
                              ))}
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
                          onClick={() => handleDelete(hospital.id, hospital.name)}
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
                    {itemRates.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 bg-secondary/30 p-2 rounded-lg">
                        <span className="flex-1 text-sm font-medium">{item.name}</span>
                        <span className="text-sm text-muted-foreground">{item.rate} EGP</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

            <Button onClick={handleSubmit} className="w-full">
              {editingId ? "Update Hospital" : "Add Hospital"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout >
  );
}
