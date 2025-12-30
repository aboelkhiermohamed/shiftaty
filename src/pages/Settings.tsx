import { motion } from "framer-motion";
import { User, FileText, Bell, Moon, Globe, HelpCircle, LogOut, ChevronRight, MessageCircle, Facebook } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/appStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateMonthlyReport } from "@/lib/pdfGenerator";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
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
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // Profile Edit State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");

  const { toast } = useToast();
  const shifts = useAppStore((state) => state.shifts);
  const hospitals = useAppStore((state) => state.hospitals);
  const userProfile = useAppStore((state) => state.userProfile);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);

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
      toast({
        title: "Generating Report...",
        description: "Please wait while we create your PDF.",
      });

      const today = new Date();
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);

      const monthlyShifts = shifts.filter((s) => {
        const d = new Date(s.date);
        return d >= monthStart && d <= monthEnd;
      });

      const base64Data = await generateMonthlyReport({
        profile: userProfile,
        month: today,
        shifts: monthlyShifts,
        hospitals: hospitals,
      });

      const fileName = `Report_${format(today, "MMM_yyyy")}.pdf`;

      if (Capacitor.isNativePlatform()) {
        // --- Android/iOS Logic ---
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        await Share.share({
          title: "Monthly Shift Report",
          text: `Here is my shift report for ${format(today, "MMMM yyyy")}`,
          files: [result.uri],
        });
      } else {
        // --- Web Logic ---
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
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
            onClick={handleExportPDF}
            delay={0.1}
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
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            }
          />
          <SettingItem
            icon={Moon}
            title="Dark Mode"
            subtitle="Toggle dark theme"
            delay={0.2}
            trailing={
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
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
            onClick={() =>
              toast({
                title: "Help Center",
                description: "Help documentation coming soon",
              })
            }
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
            onClick={() => window.open("https://t.me/M7MED1573", "_blank")}
          />
          <SettingItem
            icon={Facebook}
            title="Facebook Page"
            subtitle="Follow us"
            delay={0.35}
            onClick={() => window.open("https://www.facebook.com/M7MED1573/", "_blank")}
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
            Doctor Shift Manager v1.0.0
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Made with ❤️ for healthcare professionals
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
    </AppLayout>
  );
}
