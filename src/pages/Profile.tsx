import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, User, Stethoscope, Mail, Users, Save, Lock, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { useAppStore } from "@/stores/appStore";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { calculateFixedSalariesForShifts } from "@/lib/hospitalUtils";

export default function Profile() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const userProfile = useAppStore((s) => s.userProfile);
    const updateUserProfile = useAppStore((s) => s.updateUserProfile);
    const hospitals = useAppStore((s) => s.hospitals);
    const shifts = useAppStore((s) => s.shifts);

    const [name, setName] = useState(userProfile.name);
    const [title, setTitle] = useState(userProfile.title);
    const [gender, setGender] = useState(userProfile.gender ?? "");
    const [sessionEmail, setSessionEmail] = useState("");

    // Password Update State
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.email) {
                setSessionEmail(session.user.email);
            }
        });
    }, []);

    const initials = name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            toast({ title: "Invalid File", description: "Please select an image file.", variant: "destructive" });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Compress and resize using canvas
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 256;
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
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Deep compress to WebP (runs universally in modern browsers) or JPEG
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

                updateUserProfile({ avatar: dataUrl });
                toast({ title: "Photo Updated", description: "Your profile photo has been saved." });
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        updateUserProfile({ name, title, gender, email: sessionEmail });
        toast({ title: "Profile Saved", description: "Your profile has been updated." });
        navigate(-1);
    };

    const handleUpdatePassword = async () => {
        if (newPassword.length < 6) {
            toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
            return;
        }
        setIsUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast({ title: "Success", description: "Password updated successfully." });
            setIsPasswordDialogOpen(false);
            setNewPassword("");
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <AppLayout>
            {/* Header bar */}
            <div className="flex items-center gap-3 px-4 pt-6 pb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center touch-feedback"
                >
                    <ArrowLeft className="h-5 w-5 text-foreground" />
                </button>
                <h1 className="text-xl font-bold text-foreground">My Profile</h1>
            </div>

            {/* Avatar hero section */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-4 mb-6 rounded-2xl overflow-hidden"
            >
                <div className="bg-gradient-to-br from-primary via-primary/80 to-accent p-6 flex flex-col items-center gap-3">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-24 h-24 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center shadow-xl cursor-pointer overflow-hidden group"
                    >
                        {userProfile.avatar ? (
                            <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : initials ? (
                            <span className="text-3xl font-bold text-white">{initials}</span>
                        ) : (
                            <User className="h-12 w-12 text-white/80" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-medium">Change</span>
                        </div>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                    />
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-white">
                            {name || "Your Name"}
                        </h2>
                        <p className="text-sm text-white/80 mt-0.5">
                            {title || "Professional Title"}
                        </p>
                    </div>
                    {/* Stats row */}
                    <div className="flex gap-6 mt-2">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">{shifts.length}</p>
                            <p className="text-xs text-white/70">Shifts</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">{hospitals.length}</p>
                            <p className="text-xs text-white/70">Hospitals</p>
                        </div>
                        <div className="w-px bg-white/20" />
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">
                                {(
                                    shifts.reduce((sum, s) => sum + (s.totalEarnings || 0), 0) +
                                    calculateFixedSalariesForShifts(shifts, hospitals, shifts)
                                ).toLocaleString()}
                            </p>
                            <p className="text-xs text-white/70">EGP Total</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Form fields */}
            <div className="px-4 space-y-4 pb-6">
                {/* Display Name */}
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05, duration: 0.2 }}
                    className="bg-card rounded-xl border border-border p-4 space-y-2"
                >
                    <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium">Display Name</Label>
                    </div>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Dr. Your Name"
                    />
                </motion.div>

                {/* Professional Title */}
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.075, duration: 0.2 }}
                    className="bg-card rounded-xl border border-border p-4 space-y-2"
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium">Professional Title</Label>
                    </div>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. General Practitioner"
                    />
                </motion.div>

                {/* Gender */}
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                    className="bg-card rounded-xl border border-border p-4 space-y-2"
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium">Gender</Label>
                    </div>
                    <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                        </SelectContent>
                    </Select>
                </motion.div>

                {/* Email (read-only) */}
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.125, duration: 0.2 }}
                    className="bg-card rounded-xl border border-border p-4 space-y-2"
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Mail className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium">Email</Label>
                    </div>
                    <Input
                        value={sessionEmail || userProfile.email || "Not signed in"}
                        readOnly
                        className="text-muted-foreground bg-muted/50 cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">
                        Email is linked to your account and cannot be changed here.
                    </p>
                </motion.div>

                {/* Change Password */}
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.13, duration: 0.2 }}
                    className="bg-card rounded-xl border border-border p-4 space-y-2"
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium">Security</Label>
                    </div>
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setIsPasswordDialogOpen(true)}
                        disabled={!sessionEmail}
                    >
                        Change Account Password
                    </Button>
                </motion.div>

                {/* Save Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.2 }}
                >
                    <Button onClick={handleSave} className="w-full h-12 text-base font-semibold">
                        <Save className="h-5 w-5 mr-2" />
                        Save Profile
                    </Button>
                </motion.div>
            </div>

            {/* Change Password Dialog */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} disabled={isUpdatingPassword}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdatePassword} disabled={isUpdatingPassword || newPassword.length < 6}>
                            {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Password
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
