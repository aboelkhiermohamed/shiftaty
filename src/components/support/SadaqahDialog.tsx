import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

interface SadaqahDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SadaqahDialog({ open, onOpenChange }: SadaqahDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-36 h-11 text-sm font-semibold rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 active:scale-95 transition-all duration-150"
          >
            آمين يا رب العالمين
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
