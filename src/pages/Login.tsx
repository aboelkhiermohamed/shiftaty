import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/stores/appStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, LogIn, UserPlus, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [professionalTitle, setProfessionalTitle] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        if (isSignUp && (!name || !professionalTitle)) {
            toast({
                title: "Missing Information",
                description: "Please fill in all fields.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                            professional_title: professionalTitle,
                        },
                    },
                });
                if (error) throw error;
                setShowSuccessDialog(true);
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                // Sync Data Logic
                const { syncData, fetchData, hospitals, shifts } = useAppStore.getState();

                // 1. If we have local data, push it to cloud (Merge/Backup)
                if (hospitals.length > 0 || shifts.length > 0) {
                    await syncData();
                }

                // 2. Always fetch latest from cloud to ensure we have everything
                await fetchData();

                toast({
                    title: "Welcome back!",
                    description: "You successfully logged in and your data is synced.",
                });
                navigate("/");
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-8"
            >
                <div className="text-center space-y-2">
                    <div className="h-24 w-24 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 p-4">
                        <img
                            src="/logo.png"
                            alt="Shiftaty Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {isSignUp ? "Create Account" : "Welcome Back"}
                    </h1>
                    <p className="text-muted-foreground">
                        {isSignUp
                            ? "Sign up to backup your data to the cloud"
                            : "Sign in to access your synced data"}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
                    {isSignUp && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    placeholder="Dr. John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="professionalTitle">Professional Title</Label>
                                <Input
                                    id="professionalTitle"
                                    placeholder="Pediatrician, GP, Nurse..."
                                    value={professionalTitle}
                                    onChange={(e) => setProfessionalTitle(e.target.value)}
                                    required
                                />
                            </div>
                        </>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="doctor@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : isSignUp ? (
                            <UserPlus className="mr-2 h-4 w-4" />
                        ) : (
                            <LogIn className="mr-2 h-4 w-4" />
                        )}
                        {isSignUp ? "Sign Up" : "Sign In"}
                    </Button>
                </form>

                <div className="text-center space-y-4">
                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm text-primary hover:underline hover:text-primary/80 transition-colors"
                    >
                        {isSignUp
                            ? "Already have an account? Sign In"
                            : "Don't have an account? Sign Up"}
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                            localStorage.setItem("isGuest", "true");
                            navigate("/");
                        }}
                    >
                        Continue as Guest
                    </Button>
                    <p className="text-xs text-muted-foreground px-4">
                        Guest data is saved only on this device. Sign in recommended for backup.
                    </p>
                </div>
            </motion.div>

            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Check your email</DialogTitle>
                        <DialogDescription className="pt-2">
                            We've sent a verification link to <span className="font-medium text-foreground">{email}</span>.
                            <br /><br />
                            Please check your inbox and <span className="font-bold text-foreground">spam folder</span> to verify your account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end pt-4">
                        <Button onClick={() => setShowSuccessDialog(false)}>
                            OK, I'll check
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
