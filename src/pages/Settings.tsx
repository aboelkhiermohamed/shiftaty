import { motion } from "framer-motion";
import { User, FileText, Bell, Moon, Globe, HelpCircle, LogOut, ChevronRight, MessageCircle, Facebook, Database, Download, Upload, Code, RefreshCw, BarChart3, PieChart as PieChartIcon, LayoutDashboard, Activity, Grid, Heart } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Switch } from "@/components/ui/switch";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/appStore";
import { supabase } from "@/lib/supabase";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
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
import { generateCsvReport } from "@/lib/csvGenerator";
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
  iconColorClass?: string;
  iconBgClass?: string;
}

function SettingItem({ icon: Icon, title, subtitle, onClick, trailing, delay = 0, iconColorClass = "text-primary", iconBgClass = "bg-primary/10" }: SettingItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-card rounded-xl border border-border cursor-pointer touch-feedback hover:bg-secondary/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBgClass}`}>
          <Icon className={`h-5 w-5 ${iconColorClass}`} />
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
  const navigate = useNavigate();

  // Report State
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [reportEndDate, setReportEndDate] = useState<string>(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  // Help State
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Data Management State
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isChartLayoutDialogOpen, setIsChartLayoutDialogOpen] = useState(false);
  const [isNavIconStyleDialogOpen, setIsNavIconStyleDialogOpen] = useState(false);
  const [isIntervalDialogOpen, setIsIntervalDialogOpen] = useState(false);
  const [isSadaqahOpen, setIsSadaqahOpen] = useState(false);
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
  const reminderInterval = useAppStore((state) => state.reminderInterval);
  const setReminderInterval = useAppStore((state) => state.setReminderInterval);
  const chartType = useAppStore((state) => state.chartType);
  const setChartType = useAppStore((state) => state.setChartType);
  const navIconStyle = useAppStore((state) => state.navIconStyle);
  const setNavIconStyle = useAppStore((state) => state.setNavIconStyle);


  const handleExportReport = async (exportFormat: 'pdf' | 'csv') => {
    try {
      setIsReportDialogOpen(false);
      toast({
        title: `Generating ${exportFormat.toUpperCase()}...`,
        description: `Please wait while we create your report.`,
      });

      const startDate = new Date(reportStartDate);
      const endDate = new Date(reportEndDate);
      // Include the full end date
      endDate.setHours(23, 59, 59, 999);

      const filteredShifts = shifts.filter((s) => {
        const d = new Date(s.date);
        return d >= startDate && d <= endDate;
      });

      let fileData: string;
      const fileExt = exportFormat === 'pdf' ? '.pdf' : '.csv';

      if (exportFormat === 'pdf') {
        fileData = await generateMonthlyReport({
          profile: userProfile,
          startDate,
          endDate,
          shifts: filteredShifts,
          hospitals,
        });
      } else {
        const csvContent = generateCsvReport({
          profile: userProfile,
          startDate,
          endDate,
          shifts: filteredShifts,
          hospitals,
        });
        // Convert string to base64 for Capacitor & Browser download
        fileData = btoa(unescape(encodeURIComponent(csvContent)));
      }

      const fileName = `Report_${format(startDate, "dd_MMM")}_to_${format(endDate, "dd_MMM_yyyy")}${fileExt}`;

      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: fileData,
          directory: Directory.Cache,
        });

        await Share.share({
          title: "Shift Report",
          text: `Here is my shift report for ${format(startDate, "dd MMM")} to ${format(endDate, "dd MMM yyyy")}`,
          files: [result.uri],
        });
      } else {
        const link = document.createElement("a");
        const mimeType = exportFormat === 'pdf' ? 'application/pdf' : 'text/csv';
        link.href = `data:${mimeType};base64,${fileData}`;
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
          onClick={() => navigate("/profile")}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden border-2 border-primary/20">
              {userProfile.avatar ? (
                <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-primary-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">{userProfile.name}</h2>
              <p className="text-sm text-muted-foreground">
                {userProfile.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hospitals.length} hospitals • {shifts.length} shifts logged
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </motion.div>

        {/* Settings Groups */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Data & Export
          </p>

          <SettingItem
            icon={FileText}
            title="Export Report"
            subtitle="Download as PDF or CSV"
            onClick={() => setIsReportDialogOpen(true)}
            delay={0.1}
            iconColorClass="text-blue-500"
            iconBgClass="bg-blue-500/10"
          />
          <SettingItem
            icon={Download}
            title="Backup Data"
            subtitle="Export settings & shifts"
            onClick={handleExportData}
            delay={0.11}
            iconColorClass="text-emerald-500"
            iconBgClass="bg-emerald-500/10"
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
            iconColorClass="text-violet-500"
            iconBgClass="bg-violet-500/10"
          />
          <SettingItem
            icon={Upload}
            title="Restore Data"
            subtitle="Import from backup file"
            onClick={handleImportClick}
            delay={0.12}
            iconColorClass="text-amber-500"
            iconBgClass="bg-amber-500/10"
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
            iconColorClass="text-pink-500"
            iconBgClass="bg-pink-500/10"
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
          {notificationsEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SettingItem
                icon={Bell}
                title="Reminder Interval (تكرار التذكير)"
                subtitle={`Every ${reminderInterval} hours during shift (كل ${reminderInterval === 3 ? "٣" : reminderInterval === 6 ? "٦" : "١٢"} ساعات)`}
                delay={0.17}
                iconColorClass="text-purple-500"
                iconBgClass="bg-purple-500/10"
                onClick={() => setIsIntervalDialogOpen(true)}
              />
            </motion.div>
          )}
          <SettingItem
            icon={Moon}
            title="Dark Mode"
            subtitle="Toggle dark theme"
            delay={0.2}
            iconColorClass="text-indigo-500"
            iconBgClass="bg-indigo-500/10"
            trailing={
              <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
            }
          />
          <SettingItem
            icon={chartType === "list" ? FileText : (chartType === "bar" ? BarChart3 : PieChartIcon)}
            title="Breakdown Layout"
            subtitle={chartType.charAt(0).toUpperCase() + chartType.slice(1) + " Layout"}
            delay={0.22}
            iconColorClass="text-orange-500"
            iconBgClass="bg-orange-500/10"
            onClick={() => setIsChartLayoutDialogOpen(true)}
          />
          <SettingItem
            icon={navIconStyle === "classic" ? LayoutDashboard : (navIconStyle === "medical" ? Activity : Grid)}
            title="Navigation Icons"
            subtitle={navIconStyle.charAt(0).toUpperCase() + navIconStyle.slice(1) + " Style"}
            delay={0.23}
            iconColorClass="text-emerald-500"
            iconBgClass="bg-emerald-500/10"
            onClick={() => setIsNavIconStyleDialogOpen(true)}
          />
          <SettingItem
            icon={Globe}
            title="Language"
            subtitle="English"
            delay={0.25}
            iconColorClass="text-cyan-500"
            iconBgClass="bg-cyan-500/10"
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
            Ongoing Charity • صدقة جارية
          </p>
          <SettingItem
            icon={Heart}
            title="Ongoing Charity (صدقة جارية)"
            subtitle="Duaa for the developer's father • دعاء لوالد المطور"
            delay={0.28}
            iconColorClass="text-rose-500"
            iconBgClass="bg-rose-500/10"
            onClick={() => setIsSadaqahOpen(true)}
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
            iconColorClass="text-teal-500"
            iconBgClass="bg-teal-500/10"
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
            iconColorClass="text-[#0088cc]"
            iconBgClass="bg-[#0088cc]/10"
            onClick={() => window.open("https://t.me/shiftaty", "_blank")}
          />
          <SettingItem
            icon={Code}
            title="Contact Developer"
            subtitle="Mohamed Abo Elkhier"
            delay={0.35}
            iconColorClass="text-orange-500"
            iconBgClass="bg-orange-500/10"
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
            iconColorClass="text-destructive"
            iconBgClass="bg-destructive/10"
            onClick={async () => {
              await supabase.auth.signOut();
              localStorage.removeItem("isGuest");
              navigate("/login", { replace: true });
            }}
          />
        </div>

        {/* Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.175, duration: 0.2 }}
          className="bg-muted/50 rounded-xl p-4 mt-6"
        >
          <p className="text-xs text-muted-foreground text-center">
            Shiftaty v1.5.0
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Made with ❤️ by Mohamed Abo Elkhier
          </p>
        </motion.div>
      </div>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
            <DialogDescription>
              Choose the date range for your report.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="startDate" className="mb-2 block">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="mb-2 block">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleExportReport('csv')}>Export CSV</Button>
            <Button onClick={() => handleExportReport('pdf')}>Export PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isChartLayoutDialogOpen} onOpenChange={setIsChartLayoutDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Chart Layout</DialogTitle>
            <DialogDescription>
              Choose how you want to see your monthly income.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-4">
            {[
              { id: "pie", label: "Pie Chart", icon: PieChartIcon },
              { id: "donut", label: "Donut Chart", icon: PieChartIcon },
              { id: "bar", label: "Bar Chart", icon: BarChart3 },
              { id: "list", label: "List Only", icon: FileText },
            ].map((layout) => (
              <Button
                key={layout.id}
                variant={chartType === layout.id ? "default" : "outline"}
                className="justify-start gap-3 h-12"
                onClick={() => {
                  setChartType(layout.id as any);
                  setIsChartLayoutDialogOpen(false);
                }}
              >
                <layout.icon className="h-4 w-4" />
                {layout.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isNavIconStyleDialogOpen} onOpenChange={setIsNavIconStyleDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Navigation Icons</DialogTitle>
            <DialogDescription>
              Choose your preferred icon set for the bottom bar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-4">
            {[
              { id: "classic", label: "Classic", icon: LayoutDashboard },
              { id: "medical", label: "Medical", icon: Activity },
              { id: "minimal", label: "Modern Minimal", icon: Grid },
            ].map((style) => (
              <Button
                key={style.id}
                variant={navIconStyle === style.id ? "default" : "outline"}
                className="justify-start gap-3 h-12"
                onClick={() => {
                  setNavIconStyle(style.id as any);
                  setIsNavIconStyleDialogOpen(false);
                }}
              >
                <style.icon className="h-4 w-4" />
                {style.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isIntervalDialogOpen} onOpenChange={setIsIntervalDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Reminder Interval</DialogTitle>
            <DialogDescription>
              Choose how often you want to be reminded to log your cases during your shifts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-4">
            {[
              { id: 3, label: "Every 3 Hours (كل ٣ ساعات)" },
              { id: 6, label: "Every 6 Hours (كل ٦ ساعات)" },
              { id: 12, label: "Every 12 Hours (كل ١٢ ساعة)" },
            ].map((interval) => (
              <Button
                key={interval.id}
                variant={reminderInterval === interval.id ? "default" : "outline"}
                className="justify-start h-12 text-sm font-semibold"
                onClick={() => {
                  setReminderInterval(interval.id);
                  setIsIntervalDialogOpen(false);
                  toast({
                    title: "Interval Updated",
                    description: `You will be reminded every ${interval.id} hours during shifts.`,
                  });
                }}
              >
                {interval.label}
              </Button>
            ))}
          </div>
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

      {/* Sadaqah Jariyah Dialog */}
      <Dialog open={isSadaqahOpen} onOpenChange={setIsSadaqahOpen}>
        <DialogContent className="max-w-md mx-4 rounded-3xl border border-rose-500/20 bg-gradient-to-b from-card to-rose-500/5 dark:from-[#1C1C1E] dark:to-rose-950/10 shadow-2xl p-6 overflow-hidden">
          <DialogHeader className="flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-full bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
            >
              <Heart className="h-8 w-8 text-rose-500 fill-rose-500/30 animate-pulse" />
            </motion.div>
            <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              صدقة جارية 🤍
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              نسألكم الدعاء لوالد المطور بالرحمة والمغفرة
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-5 rounded-2xl bg-white/60 dark:bg-black/20 border border-slate-100 dark:border-white/[0.03] shadow-inner"
            >
              <p className="text-base font-bold text-slate-800 dark:text-slate-100 leading-relaxed text-center select-all">
                « اللهم اغفر له وارحمه، وعافه واعف عنه، وأكرم نزله، ووسع مدخله، واغسله بالماء والثلج والبرد، ونقه من الخطايا كما ينقى الثوب الأبيض من الدنس. اللهم أبدله داراً خيراً من داره، وأهلاً خيراً من أهله، وأدخله الجنة، وأعذه من عذاب القبر ومن عذاب النار »
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xs text-slate-400 dark:text-white/30 font-medium leading-relaxed"
            >
              اللهم اجعل هذا التطبيق صدقة جارية في ميزان حسناته ونوراً لقبره، وتغمده بواسع رحمتك يا أرحم الراحمين.
            </motion.div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setIsSadaqahOpen(false)}
              className="w-full sm:w-36 h-11 text-sm font-semibold rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 active:scale-95 transition-all duration-150"
            >
              آمين يا رب العالمين
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
