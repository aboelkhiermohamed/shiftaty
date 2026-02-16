import { motion } from "framer-motion";
import { User, FileText, Bell, Moon, Globe, HelpCircle, LogOut, ChevronRight, MessageCircle, Facebook, Database, Download, Upload, Code, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Switch } from "@/components/ui/switch";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/appStore";
import { supabase } from "@/lib/supabase";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateMonthlyReport } from "@/lib/pdfGenerator";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { startOfMonth, endOfMonth, format } from "date-fns";

interface SettingItemProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  delay?: number;
}

function SettingItem({ icon: Icon, title, subtitle, onClick, trailing, delay = 0 }: SettingItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-card rounded-xl border border-border cursor-pointer touch-feedback hover:bg-secondary/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {trailing || <ChevronRight className="h-5 w-5 text-muted-foreground" />}
    </motion.div>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();

  // Profile Edit State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");

  // Report State
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportMonth, setReportMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  // Help State
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Data Management State
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const shifts = useAppStore((state) => state.shifts);
  const hospitals = useAppStore((state) => state.hospitals);
  const userProfile = useAppStore((state) => state.userProfile);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);
  const importData = useAppStore((state) => state.importData);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useAppStore((state) => state.setNotificationsEnabled);

  const handleEditProfile = () => {
    setEditName(userProfile.name);
    setEditTitle(userProfile.title);
    setIsProfileOpen(true);
  };

  const handleSaveProfile = () => {
    updateUserProfile({ name: editName, title: editTitle });
    setIsProfileOpen(false);
    toast({
      title: "Profile Updated",
      description: "Your profile details have been saved.",
    });
  };


  const handleExportPDF = async () => {
    try {
      setIsReportDialogOpen(false);
      toast({
        title: "Generating Report...",
        description: "Please wait while we create your PDF.",
      });

      const selectedDate = new Date(reportMonth);
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);

      const monthlyShifts = shifts.filter((s) => {
        const d = new Date(s.date);
        return d >= monthStart && d <= monthEnd;
      });

      const base64Data = await generateMonthlyReport({
        profile: userProfile,
        month: selectedDate,
        shifts: monthlyShifts,
        hospitals: hospitals,
      });

      const fileName = `Report_${format(selectedDate, "MMM_yyyy")}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        await Share.share({
          title: "Monthly Shift Report",
          text: `Here is my shift report for ${format(selectedDate, "MMMM yyyy")}`,
          files: [result.uri],
        });
      } else {
        const link = document.createElement("a");
        link.href = `data:application/pdf;base64,${base64Data}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Success",
        description: "Report generated successfully",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Could not generate the report.",
        variant: "destructive",
      });
    }
  };

  const handleExportData = async () => {
    try {
      const data = {
        userProfile,
        hospitals,
        shifts,
        version: "1.0.0",
        exportDate: new Date().toISOString(),
      };

      const fileName = `Shiftaty_Backup_${format(new Date(), "yyyy-MM-dd")}.json`;
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
          dialogTitle: "Save Backup",
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
        description: "Your data has been exported successfully.",
      });
    } catch (error) {
      console.error("Backup failed", error);
      toast({
        title: "Backup Failed",
        description: "Could not export data.",
        variant: "destructive",
      });
    }
  };

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

        // Simple validation
        if (data.userProfile && Array.isArray(data.hospitals) && Array.isArray(data.shifts)) {
          setPendingImportData(data);
          setIsRestoreDialogOpen(true);
        } else {
          toast({
            title: "Invalid File",
            description: "The selected file is not a valid backup.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to parse the backup file.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    // Reset input
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
      <PageHeader title="Settings" subtitle="Manage your preferences" />

      <div className="px-4 space-y-3">
        {/* Profile Section */}
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 border border-border mb-6 cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={handleEditProfile}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{userProfile.name}</h2>
              <p className="text-sm text-muted-foreground">
                {userProfile.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hospitals.length} hospitals • {shifts.length} shifts logged
              </p>
            </div>
          </div>
        </motion.div>

        {/* Settings Groups */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Data & Export
          </p>

          <SettingItem
            icon={FileText}
            title="Export Monthly Report"
            subtitle="Download as PDF"
            onClick={() => setIsReportDialogOpen(true)}
            delay={0.1}
          />
          <SettingItem
            icon={Download}
            title="Backup Data"
            subtitle="Export settings & shifts"
            onClick={handleExportData}
            delay={0.11}
          />
          <SettingItem
            icon={RefreshCw}
            title="Sync Now"
            subtitle="Force sync with cloud"
            onClick={async () => {
              const loadingToast = toast({
                title: "Syncing...",
                description: "Synchronizing data with the cloud.",
              });
              try {
                const { syncData, fetchData } = useAppStore.getState();
                await syncData();
                await fetchData();
                toast({
                  title: "Sync Complete",
                  description: "Your data is up to date.",
                });
              } catch (e) {
                toast({
                  title: "Sync Failed",
                  description: "Check your internet connection.",
                  variant: "destructive",
                });
              }
            }}
            delay={0.13}
          />
          <SettingItem
            icon={Upload}
            title="Restore Data"
            subtitle="Import from backup file"
            onClick={handleImportClick}
            delay={0.12}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>

        <div className="space-y-2 mt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Preferences
          </p>
          <SettingItem
            icon={Bell}
            title="Notifications"
            subtitle="Get shift reminders"
            delay={0.15}
            trailing={
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={async (checked) => {
                  const success = await setNotificationsEnabled(checked);
                  if (checked && !success) {
                    toast({
                      title: "Permission Denied",
                      description: "Please enable notifications in your device settings to receive reminders.",
                      variant: "destructive"
                    });
                  } else if (checked && success) {
                    toast({
                      title: "Notifications Enabled",
                      description: "You will receive reminders 1 hour before your shifts.",
                    });
                  }
                }}
              />
            }
          />
          <SettingItem
            icon={Moon}
            title="Dark Mode"
            subtitle="Toggle dark theme"
            delay={0.2}
            trailing={
              <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
            }
          />
          <SettingItem
            icon={Globe}
            title="Language"
            subtitle="English"
            delay={0.25}
            onClick={() =>
              toast({
                title: "Coming Soon",
                description: "Arabic language support will be added soon",
              })
            }
          />
        </div>

        <div className="space-y-2 mt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Support
          </p>
          <SettingItem
            icon={HelpCircle}
            title="Help & FAQ"
            subtitle="Get assistance"
            delay={0.3}
            onClick={() => setIsHelpOpen(true)}
          />
        </div>

        <div className="space-y-2 mt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Community
          </p>
          <SettingItem
            icon={MessageCircle}
            title="Telegram Channel"
            subtitle="Join our community"
            delay={0.3}
            onClick={() => window.open("https://t.me/shiftaty", "_blank")}
          />
          <SettingItem
            icon={Code}
            title="Contact Developer"
            subtitle="Mohamed Abo Elkhier"
            delay={0.35}
            onClick={() => window.open("https://t.me/M7MED1573", "_blank")}
          />
        </div>

        <div className="space-y-2 mt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Account
          </p>
          <SettingItem
            icon={LogOut}
            title="Log Out"
            subtitle="Sign out of your account"
            delay={0.4}
            onClick={async () => {
              await supabase.auth.signOut();
              localStorage.removeItem("isGuest");
              window.location.href = "/login";
            }}
          />
        </div>

        {/* Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-muted/50 rounded-xl p-4 mt-6"
        >
          <p className="text-xs text-muted-foreground text-center">
            Shiftaty v1.3.0
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Made with ❤️ by Mohamed Abo Elkhier
          </p>
        </motion.div>
      </div>
      {/* Profile Edit Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Dr. Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Professional Title</Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. General Practitioner"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Report Month Selection Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Report Month</DialogTitle>
            <DialogDescription>
              Choose the month you want to generate the report for.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="month" className="mb-2 block">Month</Label>
            <Input
              id="month"
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleExportPDF}>Generate Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite your current data with the data from the backup file. This action cannot be undone.
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Help Dialog */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Help & FAQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="font-medium">How to add shifts?</h3>
              <p className="text-sm text-muted-foreground">
                Go to the calendar view, click on a date, and select the shift type you want to add.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">How to clear/delete shifts?</h3>
              <p className="text-sm text-muted-foreground">
                In the calendar view, tap on a shift to see details and find the delete option.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">How to generate PDF reports?</h3>
              <p className="text-sm text-muted-foreground">
                Go to Settings &gt; Export Monthly Report, select the month, and click Generate.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">How to backup my data?</h3>
              <p className="text-sm text-muted-foreground">
                Go to Settings &gt; Backup Data. This will create a JSON file with all your shifts and settings.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">How to restore data from a backup?</h3>
              <p className="text-sm text-muted-foreground">
                Go to Settings &gt; Restore Data, and select the backup JSON file you previously saved.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">How to edit my profile information?</h3>
              <p className="text-sm text-muted-foreground">
                In Settings, tap on your profile card at the top to edit your name and title.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">How to switch between Dark and Light mode?</h3>
              <p className="text-sm text-muted-foreground">
                In Settings, toggle the "Dark Mode" switch.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsHelpOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
