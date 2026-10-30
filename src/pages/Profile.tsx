import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Stethoscope,
  Mail,
  Users,
  Save,
  Lock,
  Loader2,
  Camera,
  ShieldCheck,
  Eye,
  EyeOff,
  Target,
  Clock,
  Calendar,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppStore } from "@/stores/appStore";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { calculateFixedSalariesForShifts } from "@/lib/hospitalUtils";
import { sounds } from "@/lib/sound";

const CLINICAL_TITLES = [
  "General Practitioner (ممارس عام)",
  "Resident (طبيب مقيم)",
  "Specialist (أخصائي)",
  "Consultant (استشاري)",
  "House Officer (طبيب امتياز)",
  "Fellow / Lecturer (مدرس / زميل)",
  "Professor (أستاذ دكتور)",
];

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const userProfile = useAppStore((s) => s.userProfile);
  const updateUserProfile = useAppStore((s) => s.updateUserProfile);
  const hospitals = useAppStore((s) => s.hospitals);
  const shifts = useAppStore((s) => s.shifts);
  const isPrivacyMode = useAppStore((s) => s.isPrivacyMode);
  const setPrivacyMode = useAppStore((s) => s.setPrivacyMode);

  // Form states
  const [name, setName] = useState(userProfile.name || "");
  const [title, setTitle] = useState(userProfile.title || "");
  const [gender, setGender] = useState(userProfile.gender || "");
  const [enableMonthlyTargets, setEnableMonthlyTargets] = useState(
    userProfile.enableMonthlyTargets ?? false
  );
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState(
    userProfile.targetMonthlyIncome ? String(userProfile.targetMonthlyIncome) : ""
  );
  const [targetMonthlyShifts, setTargetMonthlyShifts] = useState(
    userProfile.targetMonthlyShifts ? String(userProfile.targetMonthlyShifts) : ""
  );

  const [sessionEmail, setSessionEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Password Update State
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setSessionEmail(session.user.email);
      }
    });
  }, []);

  // Compute doctor's key performance metrics
  const stats = useMemo(() => {
    const totalShifts = shifts.length;
    const totalHospitals = hospitals.length;

    const totalHours = shifts.reduce((sum, s) => {
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      let mins = eh * 60 + em - (sh * 60 + sm);
      if (mins <= 0) mins += 24 * 60;
      return sum + Math.round((mins / 60) * 10) / 10;
    }, 0);

    const lifetimeEarnings =
      shifts.reduce((sum, s) => sum + (s.totalEarnings || 0), 0) +
      calculateFixedSalariesForShifts(shifts, hospitals, shifts);

    const avgShiftEarning =
      totalShifts > 0 ? Math.round(lifetimeEarnings / totalShifts) : 0;

    return {
      totalShifts,
      totalHospitals,
      totalHours: Math.round(totalHours),
      lifetimeEarnings,
      avgShiftEarning,
    };
  }, [shifts, hospitals]);

  const initials = (name || "Doctor")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        updateUserProfile({ avatar: dataUrl });
        sounds.playSuccess();
        toast({
          title: "Photo Updated",
          description: "Your profile photo has been saved.",
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateUserProfile({
        name: name.trim() || "Doctor",
        title: title.trim(),
        gender,
        enableMonthlyTargets,
        targetMonthlyIncome: enableMonthlyTargets && targetMonthlyIncome ? Number(targetMonthlyIncome) : undefined,
        targetMonthlyShifts: enableMonthlyTargets && targetMonthlyShifts ? Number(targetMonthlyShifts) : undefined,
        email: sessionEmail || userProfile.email,
      });

      sounds.playSuccess();
      toast({
        title: "Profile Saved",
        description: "Your profile has been updated.",
      });
      navigate(-1);
    } catch (e) {
      console.error(e);
      toast({
        title: "Save Failed",
        description: "Could not save profile details.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      sounds.playSuccess();
      toast({
        title: "Password Updated",
        description: "Your password has been changed safely.",
      });
      setIsPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <AppLayout>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border/40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 rounded-xl bg-secondary/80 hover:bg-secondary flex items-center justify-center touch-feedback transition-colors border border-border/50 active:scale-95"
          >
            <ArrowLeft className="h-4.5 w-4.5 text-foreground" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
              My Profile
            </h1>
            <p className="text-[11px] text-muted-foreground -mt-0.5">
              Doctor Information & Goals
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-xl px-3.5 h-8.5 font-bold text-xs shadow-md shadow-primary/20 flex items-center gap-1.5"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Save</span>
        </Button>
      </div>

      <div className="px-4 py-4 space-y-4 pb-20">
        {/* Physician Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="relative rounded-3xl overflow-hidden shadow-lg border border-primary/20 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-5"
        >
          <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative mb-3 group">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full border-4 border-white/30 shadow-2xl overflow-hidden bg-white/10 flex items-center justify-center cursor-pointer transition-transform active:scale-95 hover:border-white/50"
              >
                {userProfile.avatar ? (
                  <img
                    src={userProfile.avatar}
                    alt="Profile Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-black text-white tracking-wide">
                    {initials}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload photo"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white text-blue-700 shadow-md flex items-center justify-center border-2 border-blue-700 hover:scale-105 active:scale-90 transition-transform"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {/* Doctor Name & Title */}
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              <span>{name || "Doctor"}</span>
              <ShieldCheck className="w-5 h-5 text-cyan-300 drop-shadow shrink-0" />
            </h2>
            <p className="text-xs font-semibold text-white/80 mt-0.5">
              {title || "Healthcare Professional"}
            </p>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-4 gap-2 w-full mt-5 pt-4 border-t border-white/15 text-center">
              <div>
                <span className="text-lg font-black leading-none block">
                  {stats.totalShifts}
                </span>
                <span className="text-[10px] font-medium text-white/70 tracking-wider uppercase mt-1 block">
                  Shifts
                </span>
              </div>
              <div className="border-l border-white/15">
                <span className="text-lg font-black leading-none block">
                  {stats.totalHours}h
                </span>
                <span className="text-[10px] font-medium text-white/70 tracking-wider uppercase mt-1 block">
                  Hours
                </span>
              </div>
              <div className="border-l border-white/15">
                <span className="text-lg font-black leading-none block truncate">
                  {isPrivacyMode ? "***" : stats.avgShiftEarning.toLocaleString()}
                </span>
                <span className="text-[10px] font-medium text-white/70 tracking-wider uppercase mt-1 block">
                  Avg/Shift
                </span>
              </div>
              <div className="border-l border-white/15 relative">
                <span className="text-base font-black leading-none block truncate">
                  {isPrivacyMode ? "******" : stats.lifetimeEarnings.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => setPrivacyMode(!isPrivacyMode)}
                  className="text-[10px] font-medium text-white/70 tracking-wider uppercase mt-1 inline-flex items-center gap-0.5 hover:text-white"
                >
                  <span>Total</span>
                  {isPrivacyMode ? (
                    <EyeOff className="w-2.5 h-2.5 opacity-80" />
                  ) : (
                    <Eye className="w-2.5 h-2.5 opacity-80" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* SECTION 1: Personal Information */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-1 border-b border-border/50">
            <User className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Doctor Details (البيانات الشخصية)
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-foreground/80 mb-1.5 block">
                Doctor Name (اسم الطبيب)
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Ahmed Mohamed"
                className="h-11 rounded-xl bg-secondary/30 border-border"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-foreground/80 mb-1.5 block">
                  Clinical Title (الدرجة العلمية)
                </Label>
                <Select value={title} onValueChange={setTitle}>
                  <SelectTrigger className="h-11 rounded-xl bg-secondary/30 border-border text-xs sm:text-sm">
                    <SelectValue placeholder="Select title" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-60">
                    {CLINICAL_TITLES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground/80 mb-1.5 block">
                  Gender (النوع)
                </Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="h-11 rounded-xl bg-secondary/30 border-border text-xs sm:text-sm">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="male">Male (ذكر)</SelectItem>
                    <SelectItem value="female">Female (أنثى)</SelectItem>
                    <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Work & Financial Targets */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <Target className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Monthly Goal (الهدف الشهري)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Track progress towards your target income & shifts
                </p>
              </div>
            </div>
            <Switch
              checked={enableMonthlyTargets}
              onCheckedChange={setEnableMonthlyTargets}
              aria-label="Toggle Monthly Goal"
            />
          </div>

          {enableMonthlyTargets ? (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-foreground/80 mb-1.5 block">
                    Target Monthly Income (الدخل المستهدف شهرياً)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={targetMonthlyIncome}
                      onChange={(e) => setTargetMonthlyIncome(e.target.value)}
                      placeholder="e.g. 40000"
                      className="h-11 rounded-xl bg-secondary/30 border-border pr-12 font-semibold"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      EGP
                    </span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground/80 mb-1.5 block">
                    Target Shifts / Month (عدد الشفتات المستهدفة)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={targetMonthlyShifts}
                      onChange={(e) => setTargetMonthlyShifts(e.target.value)}
                      placeholder="e.g. 15"
                      className="h-11 rounded-xl bg-secondary/30 border-border pr-16 font-semibold"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      Shifts
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ سيظهر شريط متابعة الهدف في الصفحة الرئيسية تلقائياً لحساب المتبقي وتحفيزك.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-0.5">
              الميزة معطلة حالياً. يمكنك تشغيل المفتاح أعلاه لتحديد هدف مالي أو عدد شفتات ومتابعة تقدمك.
            </p>
          )}
        </div>

        {/* SECTION 3: Account & Security */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-1 border-b border-border/50">
            <Lock className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Account & Security (الأمان والحساب)
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-semibold text-foreground/80">
                  Registered Cloud Email
                </Label>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Synced
                </span>
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={sessionEmail || userProfile.email || "Guest User (Offline)"}
                  readOnly
                  className="pl-10 h-11 rounded-xl bg-muted/40 border-border text-muted-foreground cursor-not-allowed text-xs sm:text-sm font-medium"
                />
              </div>
            </div>

            <div className="pt-1">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsPasswordDialogOpen(true)}
                disabled={!sessionEmail}
                className="w-full h-11 rounded-xl border-border flex items-center justify-center gap-2 text-xs font-bold touch-feedback active:scale-95"
              >
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>Change Cloud Account Password</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-1">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 rounded-2xl text-sm font-bold shadow-lg shadow-primary/25 flex items-center justify-center gap-2 active:scale-95 transition-all touch-feedback"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Profile</span>
          </Button>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Update Account Password
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your new password below (minimum 6 characters).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                New Password
              </Label>
              <Input
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Confirm Password
              </Label>
              <Input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(false)}
              disabled={isUpdatingPassword}
              className="rounded-xl flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdatePassword}
              disabled={isUpdatingPassword || newPassword.length < 6}
              className="rounded-xl flex-1 text-xs"
            >
              {isUpdatingPassword ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : null}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
