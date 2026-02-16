import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { BellRing } from "lucide-react";

export function AnnouncementDialog() {
    const [open, setOpen] = useState(false);
    // Using explicit type any for now as the table is dynamic
    const [announcement, setAnnouncement] = useState<any>(null);

    useEffect(() => {
        checkForAnnouncements();
    }, []);

    const checkForAnnouncements = async () => {
        try {
            // Fetch the latest active announcement
            // IMPORTANT: Since the table might not exist yet, verify this query works after creating the table
            const { data, error } = await supabase
                .from('app_announcements')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(); // Use maybeSingle to avoid 406 error if 0 rows

            if (error) {
                // Table likely doesn't exist or RLS issues, silent fail to not disrupt user
                console.log("No announcements found or error:", error.message);
                return;
            }

            if (data) {
                // Check if user has already seen this specific announcement
                const lastSeenId = localStorage.getItem('last_seen_announcement');
                if (lastSeenId !== data.id) {
                    setAnnouncement(data);
                    setOpen(true);
                }
            }
        } catch (e) {
            console.error("Failed to check announcements", e);
        }
    };

    const handleClose = () => {
        if (announcement) {
            localStorage.setItem('last_seen_announcement', announcement.id);
        }
        setOpen(false);
    };

    const handleAction = () => {
        if (announcement?.action_url) {
            window.open(announcement.action_url, '_system'); // Open in system browser
        }
        handleClose();
    };

    if (!announcement) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-full">
                            <BellRing className="h-5 w-5 text-primary" />
                        </div>
                        <DialogTitle>{announcement.title}</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2 text-base">
                        {announcement.message}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleClose}>
                        Dismiss
                    </Button>
                    {announcement.action_url && (
                        <Button onClick={handleAction}>
                            {announcement.action_text || "Check it out"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
