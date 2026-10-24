import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Building2, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { HospitalCard } from "@/components/hospitals/HospitalCard";
import { AddHospitalModal } from "@/components/hospitals/AddHospitalModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Hospital } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function Hospitals() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [hospitalToEdit, setHospitalToEdit] = useState<Hospital | null>(null);
  const [hospitalToDelete, setHospitalToDelete] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const hospitals = useAppStore((state) => state.hospitals);
  const shifts = useAppStore((state) => state.shifts);
  const deleteHospital = useAppStore((state) => state.deleteHospital);
  const { toast } = useToast();

  const filteredHospitals = hospitals.filter((h) =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const confirmDelete = async () => {
    if (!hospitalToDelete) return;
    try {
      await deleteHospital(hospitalToDelete.id);
      toast({
        title: "Hospital Deleted",
        description: `${hospitalToDelete.name} has been removed`,
      });
      setHospitalToDelete(null);
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to delete hospital. Try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Hospitals"
        subtitle="Manage your facilities, payment models and rates"
        action={
          <Button
            size="sm"
            onClick={() => {
              setHospitalToEdit(null);
              setIsAddModalOpen(true);
            }}
            className="rounded-xl flex items-center gap-1.5 px-3 text-xs font-bold shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Hospital</span>
          </Button>
        }
      />

      <div className="px-4 space-y-3.5">
        {hospitals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-8 text-center border border-border space-y-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-muted-foreground">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-foreground font-bold text-sm">No hospitals yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Add your first hospital to start tracking your shifts and compensation.
              </p>
            </div>
            <Button
              onClick={() => {
                setHospitalToEdit(null);
                setIsAddModalOpen(true);
              }}
              size="sm"
              className="rounded-xl mt-2"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Hospital
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Search and Count Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {hospitals.length} {hospitals.length === 1 ? "Facility" : "Facilities"} Configured
                </span>
              </div>

              {hospitals.length > 2 && (
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search hospitals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-card rounded-xl border-border text-sm"
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
              )}
            </div>

            {/* Hospitals Cards List */}
            {filteredHospitals.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 text-center border border-border space-y-2">
                <p className="font-semibold text-foreground text-sm">No hospitals found</p>
                <p className="text-xs text-muted-foreground">
                  No hospital matches "{searchQuery}".
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="rounded-xl mt-2 text-xs"
                >
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredHospitals.map((hospital, index) => (
                    <motion.div
                      key={hospital.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.03, duration: 0.2 }}
                    >
                      <HospitalCard
                        hospital={hospital}
                        shifts={shifts}
                        onEdit={(h) => {
                          setHospitalToEdit(h);
                          setIsAddModalOpen(true);
                        }}
                        onDelete={(h) => setHospitalToDelete({ id: h.id, name: h.name })}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      {/* Redesigned Rich Add / Edit Hospital Modal */}
      <AddHospitalModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        hospitalToEdit={hospitalToEdit}
      />

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
