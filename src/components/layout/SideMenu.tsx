import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Database,
  Bell,
  Settings as SettingsIcon,
  HelpCircle,
  MessageCircle,
  Code,
  Heart,
  LogOut,
  ChevronRight,
  X,
  Info,
  ShieldCheck,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/stores/appStore";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { HelpDialog } from "@/components/support/HelpDialog";
import { SadaqahDialog } from "@/components/support/SadaqahDialog";
import { APP_VERSION } from "@/config/version";
import { cn } from "@/lib/utils";

export function SideMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const isSideMenuOpen = useAppStore((state) => state.isSideMenuOpen);
  const setSideMenuOpen = useAppStore((state) => state.setSideMenuOpen);
  const userProfile = useAppStore((state) => state.userProfile);
  const shifts = useAppStore((state) => state.shifts);
  const hospitals = useAppStore((state) => state.hospitals);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useAppStore((state) => state.setNotificationsEnabled);

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSadaqahOpen, setIsSadaqahOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const handleNavigate = (path: string) => {
    setSideMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      setIsLogoutDialogOpen(false);
      setSideMenuOpen(false);
      await supabase.auth.signOut();
      localStorage.removeItem("isGuest");
      toast({
        title: "Signed Out",
        description: "You have been logged out safely.",
      });
      navigate("/login", { replace: true });
    } catch (e) {
      console.error("Logout error", e);
      toast({
        title: "Error",
        description: "Failed to sign out.",
        variant: "destructive",
      });
    }
  };

  const initials = (userProfile?.name || "Doctor")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Sheet open={isSideMenuOpen} onOpenChange={setSideMenuOpen}>
        <SheetContent
          side="left"
          className="w-[85vw] max-w-[340px] p-0 flex flex-col bg-background/95 backdrop-blur-xl border-r border-border/60"
        >
          {/* Header */}
          <div className="p-4 pb-3 border-b border-border/40 flex items-center justify-between pr-14">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/25 flex items-center justify-center p-1.5 shadow-sm shrink-0">
                <img
                  src="./logo.png"
                  alt="Shiftaty Logo"
                  className="w-full h-full object-contain drop-shadow-sm"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.display = "none";
                    const fallback = target.parentElement?.querySelector(".logo-fallback") as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
                <div className="logo-fallback hidden w-full h-full rounded-xl bg-primary items-center justify-center text-white font-black text-sm">
                  ش
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-foreground">
                    Shiftaty
                  </span>
                  <span className="text-[11px] font-bold text-primary px-1.5 py-0.5 rounded-md bg-primary/10">
                    شفتاتي
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground block -mt-0.5 font-medium">
                  Medical Shift Manager
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {/* Profile Hero Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleNavigate("/profile")}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 cursor-pointer hover:border-primary/40 transition-all active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {userProfile?.avatar ? (
                    <img
                      src={userProfile.avatar}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-bold text-primary text-sm">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {userProfile?.name || "Doctor"}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {userProfile?.title || "Healthcare Professional"}
                  </p>
                  <p className="text-[11px] text-primary/80 font-medium mt-0.5">
                    {hospitals.length} hospitals • {shifts.length} shifts
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.div>

            {/* SECTION 1: ACCOUNT */}
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 px-2 mb-1.5">
                Account
              </p>
              <button
                onClick={() => handleNavigate("/profile")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors touch-feedback",
                  location.pathname === "/profile"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary/60"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span>Profile</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
              </button>
            </div>

            {/* SECTION 2: APP & DATA */}
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 px-2 mb-1.5">
                App & Data
              </p>

              {/* Backup & Sync */}
              <button
                onClick={() => handleNavigate("/backup-sync")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors touch-feedback",
                  location.pathname === "/backup-sync"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary/60"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                  <span>Backup & Sync</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
              </button>

              {/* Quick Notifications Toggle */}
              <div className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <span>Notifications</span>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={async (checked) => {
                    const success = await setNotificationsEnabled(checked);
                    if (checked && !success) {
                      toast({
                        title: "Permission Required",
                        description: "Enable notifications in your device settings to get reminders.",
                        variant: "destructive",
                      });
                    }
                  }}
                />
              </div>

              {/* Settings */}
              <button
                onClick={() => handleNavigate("/settings")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors touch-feedback",
                  location.pathname === "/settings"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary/60"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <SettingsIcon className="w-4 h-4" />
                  </div>
                  <span>Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
              </button>
            </div>

            {/* SECTION 3: SUPPORT */}
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/70 px-2 mb-1.5">
                Support
              </p>

              {/* Help & FAQ */}
              <button
                onClick={() => setIsHelpOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <span>Help & FAQ</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
              </button>

              {/* Community / Telegram */}
              <button
                onClick={() => window.open("https://t.me/shiftaty", "_blank")}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <span>Community / Telegram</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
              </button>

              {/* Contact Developer */}
              <button
                onClick={() => window.open("https://t.me/M7MED1573", "_blank")}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <Code className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-left">Contact Developer</span>
                    <span className="text-[10px] text-muted-foreground block text-left">
                      Mohamed Abo Elkhier
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
              </button>

              {/* Ongoing Charity */}
              <button
                onClick={() => setIsSadaqahOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-rose-500/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <Heart className="w-4 h-4 fill-rose-500/20" />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-rose-500">Ongoing Charity</span>
                    <span className="text-[10px] text-muted-foreground block">
                      صدقة جارية لوالد المطور
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-500/60" />
              </button>

              {/* About Shiftaty */}
              <button
                onClick={() => setIsAboutOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-500/10 text-slate-500 flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                  <span>About Shiftaty</span>
                </div>
                <span className="text-xs text-muted-foreground">v{APP_VERSION}</span>
              </button>
            </div>

            {/* SECTION 4: ACCOUNT ACTION */}
            <div className="pt-2">
              <button
                onClick={() => setIsLogoutDialogOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors touch-feedback"
              >
                <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Log Out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of Shiftaty? Your local data will remain saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
            >
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* About Dialog */}
      <AlertDialog open={isAboutOpen} onOpenChange={setIsAboutOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm text-center">
          <AlertDialogHeader className="items-center">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-2xl shadow-lg shadow-primary/30 mb-2">
              S
            </div>
            <AlertDialogTitle className="text-xl font-black">Shiftaty</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Version 1.5.0 • Professional Shift & Income Manager
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            Designed specifically for healthcare professionals to effortlessly track shifts, calculate hospital compensation, and export verified financial reports.
            <div className="mt-3 font-medium text-foreground">
              Made with ❤️ by Mohamed Abo Elkhier
            </div>
          </div>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => setIsAboutOpen(false)} className="rounded-xl">
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shared Dialogs */}
      <HelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} />
      <SadaqahDialog open={isSadaqahOpen} onOpenChange={setIsSadaqahOpen} />
    </>
  );
}
