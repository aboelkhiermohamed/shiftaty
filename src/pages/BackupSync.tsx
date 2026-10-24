import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Database,
  Cloud,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileJson,
  ShieldCheck,
  Server,
  HardDrive,
} from "lucide-react";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/appStore";
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
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { cn } from "@/lib/utils";

export default function BackupSync() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shifts = useAppStore((state) => state.shifts);
  const hospitals = useAppStore((state) => state.hospitals);
  const userProfile = useAppStore((state) => state.userProfile);
  const importData = useAppStore((state) => state.importData);
  const isSyncing = useAppStore((state) => state.isSyncing);
  const hasUnsyncedChanges = useAppStore((state) => state.hasUnsyncedChanges);
  const lastSyncedAt = useAppStore((state) => state.lastSyncedAt);

  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const [isSyncRunning, setIsSyncRunning] = useState(false);

  // Format real timestamp
  const formatLastSync = (isoString?: string | null) => {
    if (!isoString) return "Never synced";
    try {
      const date = new Date(isoString);
      return format(date, "MMM dd, yyyy • hh:mm a");
    } catch {
      return "Recently";
    }
  };

  // Cloud Sync Handler
  const handleCloudSync = async () => {
    setIsSyncRunning(true);
    toast({
      title: "Syncing...",
      description: "Synchronizing data with the cloud server.",
    });

    try {
      const { syncData, fetchData } = useAppStore.getState();
      await syncData();
      await fetchData();
      toast({
        title: "Sync Complete",
        description: "Your shifts and hospitals are now securely in sync.",
      });
    } catch (e) {
      console.error("Cloud sync failed:", e);
      toast({
        title: "Sync Failed",
        description: "Please check your network connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncRunning(false);
    }
  };

  // Local JSON Backup Handler
  const handleExportData = async () => {
    try {
      const data = {
        userProfile,
        hospitals,
        shifts,
        version: "1.0.0",
        exportDate: new Date().toISOString(),
      };

      const fileName = `Shiftaty_Backup_${format(new Date(), "yyyy-MM-dd_HHmm")}.json`;
      const jsonString = JSON.stringify(data, null, 2);

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: "Shiftaty Data Backup",
          url: result.uri,
          dialogTitle: "Save Backup JSON File",
        });
      } else {
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Backup Created",
        description: `Successfully exported ${fileName}`,
      });
    } catch (error) {
      console.error("Backup failed", error);
      toast({
        title: "Backup Failed",
        description: "Could not export local backup file.",
        variant: "destructive",
      });
    }
  };

  // Restore Handlers
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (
          data.userProfile &&
          Array.isArray(data.hospitals) &&
          Array.isArray(data.shifts)
        ) {
          setPendingImportData(data);
          setIsRestoreDialogOpen(true);
        } else {
          toast({
            title: "Invalid Backup File",
            description: "The selected file is not a valid Shiftaty backup.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Parsing Error",
          description: "Could not read the JSON content.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const confirmImport = () => {
    if (pendingImportData) {
      importData(pendingImportData);
      setPendingImportData(null);
      setIsRestoreDialogOpen(false);
      toast({
        title: "Data Restored",
        description: "Your application data has been successfully restored.",
      });
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Backup & Sync"
        subtitle="Manage cloud sync and local data backups"
      />

      <div className="px-4 space-y-5">
        {/* SECTION 1: CLOUD SYNC */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Cloud Sync</h3>
                <p className="text-xs text-muted-foreground">
                  Synchronize securely with your account
                </p>
              </div>
            </div>

            {/* Sync Status Badge */}
            <div
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5",
                isSyncing || isSyncRunning
                  ? "bg-amber-500/10 text-amber-500 animate-pulse"
                  : hasUnsyncedChanges
                  ? "bg-orange-500/10 text-orange-500"
                  : "bg-emerald-500/10 text-emerald-500"
              )}
            >
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isSyncing || isSyncRunning
                    ? "bg-amber-500"
                    : hasUnsyncedChanges
                    ? "bg-orange-500"
                    : "bg-emerald-500"
                )}
              />
              <span>
                {isSyncing || isSyncRunning
                  ? "Syncing"
                  : hasUnsyncedChanges
                  ? "Unsynced"
                  : "Synced"}
              </span>
            </div>
          </div>

          <div className="p-3 bg-secondary/50 rounded-xl text-xs space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Last synced:</span>
              <span className="font-semibold text-foreground">
                {formatLastSync(lastSyncedAt)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Cloud Storage:</span>
              <span className="font-semibold text-foreground">Supabase Encrypted</span>
            </div>
          </div>

          <Button
            onClick={handleCloudSync}
            disabled={isSyncing || isSyncRunning}
            className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold flex items-center justify-center gap-2 shadow-md shadow-violet-500/20 active:scale-98 transition-all"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4",
                (isSyncing || isSyncRunning) && "animate-spin"
              )}
            />
            <span>{isSyncing || isSyncRunning ? "Syncing..." : "Sync Now"}</span>
          </Button>
        </div>

        {/* SECTION 2: LOCAL BACKUP */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Local Backup</h3>
              <p className="text-xs text-muted-foreground">
                Save or import raw JSON backup files
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Create an offline copy of all your shifts, hospital rates, and profile
            settings. You can restore this file on any device at any time.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              onClick={handleExportData}
              variant="outline"
              className="h-11 rounded-xl border-border bg-card hover:bg-secondary flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold">Backup Data</span>
            </Button>

            <Button
              onClick={handleImportClick}
              variant="outline"
              className="h-11 rounded-xl border-border bg-card hover:bg-secondary flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <Upload className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold">Restore Data</span>
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* SECTION 3: DATA STATS */}
        <div className="p-4 rounded-2xl bg-secondary/40 border border-border/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Local Database Storage</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
            <div className="p-2 rounded-lg bg-card/60 border border-border/40">
              <span className="block text-[10px] uppercase font-bold">
                Shifts Stored
              </span>
              <span className="text-sm font-black text-foreground">
                {shifts.length}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-card/60 border border-border/40">
              <span className="block text-[10px] uppercase font-bold">
                Hospitals Stored
              </span>
              <span className="text-sm font-black text-foreground">
                {hospitals.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Dialog */}
      <AlertDialog
        open={isRestoreDialogOpen}
        onOpenChange={setIsRestoreDialogOpen}
      >
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite your current shifts and hospital settings with
              the contents of the backup file. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmImport}
              className="bg-primary hover:bg-primary/90 rounded-xl"
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
