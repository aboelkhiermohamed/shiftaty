import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Clock,
  Palette,
  PieChart as PieChartIcon,
  LayoutDashboard,
  Globe,
  ChevronRight,
  BarChart3,
  FileText,
  Activity,
  Grid,
  Sun,
  Moon,
  Laptop,
  Check,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/appStore";
import { useTheme } from "next-themes";
import { APP_VERSION } from "@/config/version";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SettingItemProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  iconColorClass?: string;
  iconBgClass?: string;
}

function SettingItem({
  icon: Icon,
  title,
  subtitle,
  onClick,
  trailing,
  iconColorClass = "text-primary",
  iconBgClass = "bg-primary/10",
}: SettingItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-3.5 bg-card rounded-2xl border border-border/70 transition-colors",
        onClick ? "cursor-pointer touch-feedback hover:bg-secondary/50 active:scale-[0.99]" : ""
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgClass}`}
        >
          <Icon className={`h-5 w-5 ${iconColorClass}`} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="shrink-0 ml-3">
        {trailing || <ChevronRight className="h-4 w-4 text-muted-foreground/70" />}
      </div>
    </div>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useAppStore((state) => state.setNotificationsEnabled);
  const reminderInterval = useAppStore((state) => state.reminderInterval);
  const setReminderInterval = useAppStore((state) => state.setReminderInterval);
  const chartType = useAppStore((state) => state.chartType);
  const setChartType = useAppStore((state) => state.setChartType);
  const navIconStyle = useAppStore((state) => state.navIconStyle);
  const setNavIconStyle = useAppStore((state) => state.setNavIconStyle);

  // Dialog States
  const [isIntervalDialogOpen, setIsIntervalDialogOpen] = useState(false);
  const [isAppearanceDialogOpen, setIsAppearanceDialogOpen] = useState(false);
  const [isChartLayoutDialogOpen, setIsChartLayoutDialogOpen] = useState(false);
  const [isNavIconStyleDialogOpen, setIsNavIconStyleDialogOpen] = useState(false);
  const [isLanguageDialogOpen, setIsLanguageDialogOpen] = useState(false);

  // Format theme label
  const getThemeLabel = () => {
    if (theme === "system") return "System default";
    if (theme === "dark") return "Dark theme";
    if (theme === "light") return "Light theme";
    return "Dark theme";
  };

  // Format chart label
  const getChartLabel = () => {
    if (chartType === "donut") return "Donut layout";
    if (chartType === "pie") return "Pie layout";
    if (chartType === "bar") return "Bar chart layout";
    if (chartType === "list") return "List only";
    return "Donut layout";
  };

  // Format nav icon label
  const getNavIconLabel = () => {
    if (navIconStyle === "classic") return "Classic style";
    if (navIconStyle === "medical") return "Medical style";
    if (navIconStyle === "minimal") return "Minimal style";
    return "Classic style";
  };

  return (
    <AppLayout>
      <PageHeader
        title="Settings"
        subtitle="Manage your application preferences"
      />

      <div className="px-4 space-y-5">
        {/* PREFERENCES SECTION */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 px-1 mb-1">
            Preferences
          </p>

          {/* 1. Notifications */}
          <SettingItem
            icon={Bell}
            title="Notifications"
            subtitle="Get shift reminders 1 hour before shift"
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
                      description:
                        "Please allow notifications in your device settings to receive reminders.",
                      variant: "destructive",
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

          {/* 2. Reminder Interval (if notifications enabled) */}
          {notificationsEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SettingItem
                icon={Clock}
                title="Reminder Interval"
                subtitle={`Every ${reminderInterval} hours during shift`}
                iconColorClass="text-purple-500"
                iconBgClass="bg-purple-500/10"
                onClick={() => setIsIntervalDialogOpen(true)}
              />
            </motion.div>
          )}

          {/* 3. Appearance */}
          <SettingItem
            icon={Palette}
            title="Appearance"
            subtitle={getThemeLabel()}
            iconColorClass="text-indigo-500"
            iconBgClass="bg-indigo-500/10"
            onClick={() => setIsAppearanceDialogOpen(true)}
          />

          {/* 4. Income Breakdown */}
          <SettingItem
            icon={chartType === "list" ? FileText : chartType === "bar" ? BarChart3 : PieChartIcon}
            title="Income Breakdown"
            subtitle={getChartLabel()}
            iconColorClass="text-orange-500"
            iconBgClass="bg-orange-500/10"
            onClick={() => setIsChartLayoutDialogOpen(true)}
          />

          {/* 5. Navigation Icons */}
          <SettingItem
            icon={
              navIconStyle === "classic"
                ? LayoutDashboard
                : navIconStyle === "medical"
                ? Activity
                : Grid
            }
            title="Navigation Icons"
            subtitle={getNavIconLabel()}
            iconColorClass="text-emerald-500"
            iconBgClass="bg-emerald-500/10"
            onClick={() => setIsNavIconStyleDialogOpen(true)}
          />

          {/* 6. Language */}
          <SettingItem
            icon={Globe}
            title="Language"
            subtitle="English"
            iconColorClass="text-cyan-500"
            iconBgClass="bg-cyan-500/10"
            onClick={() => setIsLanguageDialogOpen(true)}
          />
        </div>

        {/* ABOUT SECTION */}
        <div className="pt-2">
          <div className="p-4 rounded-2xl bg-secondary/30 border border-border/50 text-center space-y-1">
            <p className="text-xs font-bold text-foreground">Shiftaty v{APP_VERSION}</p>
            <p className="text-xs text-muted-foreground">
              Made with ❤️ by Mohamed Abo Elkhier
            </p>
          </div>
        </div>
      </div>

      {/* 2. Reminder Interval Dialog */}
      <Dialog open={isIntervalDialogOpen} onOpenChange={setIsIntervalDialogOpen}>
        <DialogContent className="sm:max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reminder Interval</DialogTitle>
            <DialogDescription>
              Choose how often you want reminders to log cases during active shifts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-3">
            {[
              { id: 3, label: "Every 3 Hours (كل ٣ ساعات)" },
              { id: 6, label: "Every 6 Hours (كل ٦ ساعات)" },
              { id: 12, label: "Every 12 Hours (كل ١٢ ساعة)" },
            ].map((interval) => (
              <Button
                key={interval.id}
                variant={reminderInterval === interval.id ? "default" : "outline"}
                className="justify-between h-12 text-sm font-semibold rounded-xl"
                onClick={() => {
                  setReminderInterval(interval.id);
                  setIsIntervalDialogOpen(false);
                  toast({
                    title: "Interval Updated",
                    description: `Shift reminder interval set to every ${interval.id} hours.`,
                  });
                }}
              >
                <span>{interval.label}</span>
                {reminderInterval === interval.id && (
                  <Check className="w-4 h-4 text-primary-foreground" />
                )}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Appearance Dialog */}
      <Dialog open={isAppearanceDialogOpen} onOpenChange={setIsAppearanceDialogOpen}>
        <DialogContent className="sm:max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle>Appearance</DialogTitle>
            <DialogDescription>
              Select your preferred application color theme.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-3">
            {[
              { id: "system", label: "System Default", icon: Laptop },
              { id: "dark", label: "Dark Mode", icon: Moon },
              { id: "light", label: "Light Mode", icon: Sun },
            ].map((t) => (
              <Button
                key={t.id}
                variant={theme === t.id ? "default" : "outline"}
                className="justify-between h-12 rounded-xl"
                onClick={() => {
                  setTheme(t.id);
                  setIsAppearanceDialogOpen(false);
                  toast({
                    title: "Theme Changed",
                    description: `Applied ${t.label}.`,
                  });
                }}
              >
                <div className="flex items-center gap-2.5">
                  <t.icon className="h-4 w-4" />
                  <span className="text-sm font-semibold">{t.label}</span>
                </div>
                {theme === t.id && <Check className="w-4 h-4 text-primary-foreground" />}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Income Breakdown Dialog */}
      <Dialog open={isChartLayoutDialogOpen} onOpenChange={setIsChartLayoutDialogOpen}>
        <DialogContent className="sm:max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle>Income Breakdown</DialogTitle>
            <DialogDescription>
              Choose how the dashboard displays your monthly income distribution.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-3">
            {[
              { id: "donut", label: "Donut Chart", icon: PieChartIcon },
              { id: "pie", label: "Pie Chart", icon: PieChartIcon },
              { id: "bar", label: "Bar Chart", icon: BarChart3 },
              { id: "list", label: "List Only", icon: FileText },
            ].map((layout) => (
              <Button
                key={layout.id}
                variant={chartType === layout.id ? "default" : "outline"}
                className="justify-between h-12 rounded-xl"
                onClick={() => {
                  setChartType(layout.id as any);
                  setIsChartLayoutDialogOpen(false);
                  toast({
                    title: "Layout Updated",
                    description: `Income breakdown set to ${layout.label}.`,
                  });
                }}
              >
                <div className="flex items-center gap-2.5">
                  <layout.icon className="h-4 w-4" />
                  <span className="text-sm font-semibold">{layout.label}</span>
                </div>
                {chartType === layout.id && (
                  <Check className="w-4 h-4 text-primary-foreground" />
                )}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Navigation Icons Dialog */}
      <Dialog open={isNavIconStyleDialogOpen} onOpenChange={setIsNavIconStyleDialogOpen}>
        <DialogContent className="sm:max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle>Navigation Icons</DialogTitle>
            <DialogDescription>
              Customize the icon styling of the primary bottom navigation bar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-3">
            {[
              {
                id: "classic",
                label: "Classic Style",
                icon: LayoutDashboard,
                desc: "Standard productivity icons",
              },
              {
                id: "medical",
                label: "Medical Style",
                icon: Activity,
                desc: "Clinical & hospital iconography",
              },
              {
                id: "minimal",
                label: "Minimal Style",
                icon: Grid,
                desc: "Sleek geometric lines",
              },
            ].map((style) => (
              <Button
                key={style.id}
                variant={navIconStyle === style.id ? "default" : "outline"}
                className="justify-between h-13 rounded-xl"
                onClick={() => {
                  setNavIconStyle(style.id as any);
                  setIsNavIconStyleDialogOpen(false);
                  toast({
                    title: "Navigation Icons Updated",
                    description: `Style set to ${style.label}.`,
                  });
                }}
              >
                <div className="flex items-center gap-3 text-left">
                  <style.icon className="h-5 w-5 shrink-0" />
                  <div>
                    <span className="block text-sm font-semibold leading-tight">
                      {style.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {style.desc}
                    </span>
                  </div>
                </div>
                {navIconStyle === style.id && (
                  <Check className="w-4 h-4 text-primary-foreground shrink-0" />
                )}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. Language Dialog */}
      <Dialog open={isLanguageDialogOpen} onOpenChange={setIsLanguageDialogOpen}>
        <DialogContent className="sm:max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle>Language</DialogTitle>
            <DialogDescription>
              Select your preferred display language.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-3">
            <Button
              variant="default"
              className="justify-between h-12 rounded-xl"
              onClick={() => {
                setIsLanguageDialogOpen(false);
              }}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4" />
                <span className="text-sm font-semibold">English (Active)</span>
              </div>
              <Check className="w-4 h-4 text-primary-foreground" />
            </Button>

            <Button
              variant="outline"
              className="justify-between h-12 rounded-xl text-muted-foreground"
              onClick={() => {
                setIsLanguageDialogOpen(false);
                toast({
                  title: "Coming Soon • قريباً",
                  description:
                    "Arabic localization will be supported in the next update.",
                });
              }}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4" />
                <span className="text-sm font-semibold">العربية (Arabic)</span>
              </div>
              <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full">
                Soon
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
