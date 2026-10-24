import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Wallet, TrendingUp, Eye, EyeOff } from "lucide-react";

interface FeaturedStatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    className?: string;
    delay?: number;
    isPrivacyMode?: boolean;
    onTogglePrivacy?: () => void;
}

export function FeaturedStatCard({
    title,
    value,
    subtitle,
    className,
    delay = 0,
    isPrivacyMode = false,
    onTogglePrivacy,
}: FeaturedStatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ willChange: "transform, opacity" }}
            className={cn(
                "relative col-span-2 overflow-hidden rounded-2xl p-5 text-white shadow-md",
                "bg-gradient-to-br from-blue-500 via-blue-400 to-emerald-400",
                className
            )}
        >
            {/* Background Icon */}
            <div className="absolute -right-4 -top-4 bg-white/10 w-24 h-24 rounded-full blur-xl" />
            <Wallet className="absolute right-4 top-4 h-12 w-12 text-white/20 -rotate-12" />

            <div className="relative z-10 flex flex-col justify-between h-full min-h-[90px]">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-90">
                        {title}
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                        <h3 className="text-3xl font-bold tracking-tight">
                            {isPrivacyMode ? "******" : value}
                        </h3>
                        <span className="text-base font-semibold opacity-80 uppercase tracking-wide">
                            EGP
                        </span>
                    </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs font-medium opacity-80">{subtitle}</p>
                    {onTogglePrivacy && (
                        <button
                            onClick={onTogglePrivacy}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors touch-feedback"
                            title={isPrivacyMode ? "Show Amounts" : "Hide Amounts"}
                        >
                            {isPrivacyMode ? (
                                <EyeOff className="h-4 w-4 text-white" />
                            ) : (
                                <Eye className="h-4 w-4 text-white" />
                            )}
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
