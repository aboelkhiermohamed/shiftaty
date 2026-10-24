import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Rocket,
  Download,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { APP_VERSION, isVersionOlder } from "@/config/version";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export interface VersionConfig {
  id: string;
  min_version: string;
  latest_version: string;
  is_force_update: boolean;
  title?: string;
  message?: string;
  play_store_url?: string;
  app_store_url?: string;
  apk_download_url?: string;
}

export function ForceUpdateDialog() {
  const [isBlocked, setIsBlocked] = useState(false);
  const [config, setConfig] = useState<VersionConfig | null>(null);
  const [currentAppVersion, setCurrentAppVersion] = useState<string>(APP_VERSION);
  const [isChecking, setIsChecking] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      setIsChecking(true);

      // Detect native app version if running on iOS/Android via Capacitor
      let detectedVersion = APP_VERSION;
      if (Capacitor.isNativePlatform()) {
        try {
          const appInfo = await CapacitorApp.getInfo();
          if (appInfo?.version) {
            detectedVersion = appInfo.version;
          }
        } catch (e) {
          console.warn("Could not get native Capacitor app version, using fallback", e);
        }
      }
      setCurrentAppVersion(detectedVersion);

      // Fetch remote version config from Supabase
      const { data, error } = await supabase
        .from("app_version_config")
        .select("*")
        .eq("id", "current")
        .maybeSingle();

      if (error) {
        console.warn("Could not fetch app_version_config from Supabase:", error.message);
        return;
      }

      if (data) {
        setConfig(data);

        // Rule for Mandatory Force Update:
        // 1. Current version is older than minimum supported version (min_version)
        // 2. OR remote flag is_force_update is true AND current is older than latest_version
        const isBelowMinimum = isVersionOlder(detectedVersion, data.min_version);
        const isForcedLatest =
          data.is_force_update && isVersionOlder(detectedVersion, data.latest_version);

        if (isBelowMinimum || isForcedLatest) {
          setIsBlocked(true);
        } else {
          setIsBlocked(false);
        }
      }
    } catch (err) {
      console.error("Force update check failed:", err);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Initial check on mount
    checkVersion();

    // Check again whenever app comes back from background (e.g. user went to store to update)
    let listenerPromise: Promise<any> | null = null;
    if (Capacitor.isPluginAvailable("App")) {
      listenerPromise = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          checkVersion();
        }
      });
    }

    // Also check on network online event
    window.addEventListener("online", checkVersion);

    return () => {
      window.removeEventListener("online", checkVersion);
      if (listenerPromise) {
        listenerPromise.then((handle) => handle?.remove?.());
      }
    };
  }, [checkVersion]);

  const handleUpdate = () => {
    if (!config) return;

    const platform = Capacitor.getPlatform(); // 'android', 'ios', or 'web'
    let targetUrl = config.play_store_url;

    if (platform === "ios" && config.app_store_url) {
      targetUrl = config.app_store_url;
    } else if (config.play_store_url) {
      targetUrl = config.play_store_url;
    } else if (config.apk_download_url) {
      targetUrl = config.apk_download_url;
    }

    if (targetUrl) {
      if (Capacitor.isNativePlatform()) {
        window.open(targetUrl, "_system");
      } else {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  const handleDirectApk = () => {
    if (config?.apk_download_url) {
      window.open(config.apk_download_url, "_system");
    }
  };

  if (!isBlocked || !config) return null;

  return (
    <Dialog open={isBlocked} onOpenChange={() => {}}>
      <DialogContent
        // Block closing via outside tap, escape key, and hide default X close button
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-md p-6 rounded-3xl bg-card border-border shadow-2xl [&>button:last-child]:hidden select-none"
      >
        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          {/* Pulsing Rocket / Update Icon */}
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              className="w-20 h-20 rounded-3xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary shadow-xl shadow-primary/20"
            >
              <Rocket className="w-10 h-10 animate-bounce" />
            </motion.div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 text-amber-950 flex items-center justify-center font-bold text-xs shadow-md">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Title & Subtitle */}
          <DialogHeader className="space-y-1.5 text-center">
            <DialogTitle className="text-xl font-black text-foreground">
              {config.title || "تحديث إجباري جديد متاح 🚀"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground max-w-sm leading-relaxed" dir="rtl">
              {config.message ||
                "تم إطلاق إصدار جديد ومهم من تطبيق شفتاتي يحتوي على تحسينات وإصلاحات أساسية. لضمان استقرار حساباتك وشفتاتك، يتوجب عليك تحديث التطبيق للمتابعة."}
            </DialogDescription>
          </DialogHeader>

          {/* Version Comparison Badge */}
          <div className="w-full p-3 rounded-2xl bg-secondary/30 border border-border/70 flex items-center justify-center gap-2.5 text-xs">
            <span className="font-semibold text-muted-foreground bg-secondary px-2.5 py-1 rounded-xl">
              إصدارك الحالي: <strong className="text-foreground">v{currentAppVersion}</strong>
            </span>
            <span className="text-muted-foreground">➔</span>
            <span className="font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-xl border border-primary/20">
              أحدث إصدار: <strong className="text-primary font-bold">v{config.latest_version}</strong>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2 pt-2">
            <Button
              onClick={handleUpdate}
              size="lg"
              className="w-full h-12 rounded-2xl text-sm font-bold shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span>تحديث التطبيق الآن (Update Now)</span>
            </Button>

            {/* Direct APK Link for Android users */}
            {config.apk_download_url && (
              <button
                type="button"
                onClick={handleDirectApk}
                className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground py-1.5 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>أو تحميل التحديث برابط مباشر (APK)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Manual Check Again Button */}
            <button
              type="button"
              onClick={checkVersion}
              disabled={isChecking}
              className="text-[11px] text-muted-foreground hover:text-foreground/80 flex items-center justify-center gap-1 mx-auto pt-1"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`} />
              <span>فحص التحديث مجدداً بعد التنزيل</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
