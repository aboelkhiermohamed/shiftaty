import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Sparkles } from "lucide-react";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const faqs = [
    {
      q: "How to add shifts?",
      a: "Tap the central '+' button in the bottom navigation bar, pick a hospital, date, and time, and save.",
    },
    {
      q: "How to edit or delete shifts?",
      a: "Go to the Shifts tab, tap on any shift card to open the editor, or swipe left/right to manage.",
    },
    {
      q: "Where can I generate PDF & CSV reports?",
      a: "Go to the Reports tab in the bottom bar. Select your date range, preview your stats, and tap Export PDF or CSV.",
    },
    {
      q: "How to backup and restore data?",
      a: "Open the Side Menu, tap 'Backup & Sync'. You can force sync to the cloud or create an offline JSON backup file.",
    },
    {
      q: "How to change appearance and themes?",
      a: "Open the Side Menu > Settings > Appearance. You can choose System, Dark, or Light mode.",
    },
    {
      q: "How does fixed salary calculate for shifts?",
      a: "If a hospital has a fixed monthly salary or per-shift rate, Shiftaty automatically accounts for it in your monthly income overview.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-md rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-lg font-bold">Help & FAQ</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Frequently asked questions and guides for Shiftaty.
          </p>
        </DialogHeader>

        <div className="space-y-3 py-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-secondary/40 border border-border/60 space-y-1.5"
            >
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                {faq.q}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                {faq.a}
              </p>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full rounded-xl"
          >
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
