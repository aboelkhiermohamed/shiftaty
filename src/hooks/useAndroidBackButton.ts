import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useAppStore } from "@/stores/appStore";
import { toast } from "@/hooks/use-toast";

/**
 * Handles Android hardware back button and predictive back gestures.
 * - Dismisses open SideMenu or open modal/dialog/sheet first
 * - Navigates back in React Router history if on a sub-screen
 * - Double-tap back within 2s on root screen exits the app
 */
export function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: { remove: () => void } | null = null;

    const setupListener = async () => {
      const listener = await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        // 1. Check if side menu is open
        const store = useAppStore.getState();
        if (store.isSideMenuOpen) {
          store.setSideMenuOpen(false);
          return;
        }

        // 2. Check if a Radix dialog, alert, or sheet is open
        const hasOpenModal = document.querySelector(
          '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]'
        );
        if (hasOpenModal) {
          // Trigger Escape key to cleanly dismiss Radix dialogs/sheets
          window.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Escape",
              code: "Escape",
              keyCode: 27,
              which: 27,
              bubbles: true,
              cancelable: true,
            })
          );
          return;
        }

        // 3. If on home/dashboard, handle double-tap back to exit
        const isRoot = location.pathname === "/" || location.pathname === "";
        if (isRoot) {
          const now = Date.now();
          if (now - lastBackPressRef.current < 2000) {
            CapacitorApp.exitApp();
          } else {
            lastBackPressRef.current = now;
            toast({
              description: "اضغط مرة أخرى للخروج من التطبيق",
              duration: 1800,
            });
          }
          return;
        }

        // 4. Otherwise navigate back in history
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate("/", { replace: true });
        }
      });

      handle = listener;
    };

    setupListener();

    return () => {
      if (handle) {
        handle.remove();
      }
    };
  }, [navigate, location.pathname]);
}

export function AndroidBackButtonHandler() {
  useAndroidBackButton();
  return null;
}
