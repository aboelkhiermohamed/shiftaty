import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, User, Stethoscope, Mail, Users, Save } from "lucide-react";
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
import { useAppStore } from "@/stores/appStore";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

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

    const handleSave = () => {
        updateUserProfile({ name, title, gender, email: sessionEmail });
        toast({ title: "Profile Saved", description: "Your profile has been updated." });
        navigate(-1);
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
                    <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center shadow-xl">
                        {initials ? (
                            <span className="text-3xl font-bold text-white">{initials}</span>
                        ) : (
                            <User className="h-12 w-12 text-white/80" />
                        )}
                    </div>
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
                                {shifts.reduce((sum, s) => sum + (s.totalEarnings || 0), 0).toLocaleString()}
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
                    transition={{ delay: 0.1 }}
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
                    transition={{ delay: 0.15 }}
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
                    transition={{ delay: 0.2 }}
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
                    transition={{ delay: 0.25 }}
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

                {/* Save Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Button onClick={handleSave} className="w-full h-12 text-base font-semibold">
                        <Save className="h-5 w-5 mr-2" />
                        Save Profile
                    </Button>
                </motion.div>
            </div>
        </AppLayout>
    );
}
