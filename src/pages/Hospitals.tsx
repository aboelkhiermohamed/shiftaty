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
};

export default function Hospitals() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [paymentModel, setPaymentModel] = useState<PaymentModel>("fixed");
  const [fixedRate, setFixedRate] = useState("");
  const [perPatientRate, setPerPatientRate] = useState("");

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
    setEditingId(null);
  };

  const openEditDialog = (hospital: typeof hospitals[0]) => {
    setEditingId(hospital.id);
    setName(hospital.name);
    setPaymentModel(hospital.paymentModel);
    setFixedRate(hospital.fixedRate.toString());
    setPerPatientRate(hospital.perPatientRate.toString());
    setIsOpen(true);
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
        action={
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="icon" className="h-9 w-9 rounded-xl">
                <Plus className="h-5 w-5" />
              </Button>
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

                <Button onClick={handleSubmit} className="w-full">
                  {editingId ? "Update Hospital" : "Add Hospital"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
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
                        <div className="flex gap-3 mt-2 text-sm">
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
    </AppLayout>
  );
}
