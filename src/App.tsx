import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom"; // Changed to HashRouter

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Dashboard from "./pages/Dashboard";
import AddShift from "./pages/AddShift";
import EditShift from "./pages/EditShift";
import Hospitals from "./pages/Hospitals";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app"; // Import Capacitor App
import { LocalNotifications } from "@capacitor/local-notifications";
import { useAppStore } from "@/stores/appStore";

const queryClient = new QueryClient();

// Debug logging for Auth Redirect
console.log("Current URL:", window.location.href);
console.log("Current Hash:", window.location.hash);
console.log("Current Search:", window.location.search);


// Deep Link Handler Component
const DeepLinkListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const listener = CapacitorApp.addListener('appUrlOpen', (event) => {
      try {
        const url = new URL(event.url);
        // Handle Supabase Hash (Implicit Flow)
        if (url.hash && url.hash.includes('access_token')) {
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
          }
        }
      } catch (e) {
        console.error('Error handling deep link:', e);
      }
    });

    return () => {
      listener.then(handle => handle.remove());
    };
  }, []);

  useEffect(() => {
    const notifListener = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (action) => {
        try {
          const shiftId = action.notification.extra?.shiftId;
          if (shiftId) {
            navigate(`/edit-shift/${shiftId}`);
          }
        } catch (e) {
          console.error('Error handling notification action:', e);
        }
      }
    );

    return () => {
      notifListener.then(handle => handle.remove());
    };
  }, [navigate]);

  return null;
};

import { SplashScreen } from "@capacitor/splash-screen";

import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isReady, setIsReady] = useState(() => {
    try {
      const keys = Object.keys(localStorage);
      const hasAuthToken = keys.some(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      const isGuest = localStorage.getItem("isGuest") === "true";
      return hasAuthToken || isGuest;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const initApp = async () => {
      if (isReady) {
        // Immediate hide if we have a hint
        SplashScreen.hide().catch(() => { });
      }

      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setIsAuthChecked(true);
      setIsReady(true);

      // Safety hide for all users
      setTimeout(() => {
        SplashScreen.hide().catch(() => { });
      }, 50);

      // Wait for hydration
      await new Promise(resolve => {
        if (useAppStore.getState().isHydrated) {
          resolve(true);
        } else {
          const unsub = useAppStore.subscribe(state => {
            if (state.isHydrated) {
              unsub();
              resolve(true);
            }
          });
        }
      });

      if (initialSession) {
        const store = useAppStore.getState();
        store.initPushNotifications();

        // 1. Sync any local changes first (Push)
        await store.syncData();
        // 2. Then fetch latest data from cloud (Pull)
        await store.fetchData();
      }
    };

    initApp();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsAuthChecked(true);
    });

    const appStateListener = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        const store = useAppStore.getState();
        if (store.hasUnsyncedChanges && !store.isSyncing) {
          await store.syncData();
        }
        await store.fetchData();
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateListener.then(handle => handle.remove());
    };
  }, []);

  if (!isReady || !isAuthChecked) {
    return <DashboardSkeleton />;
  }

  if (!session) {
    const isGuest = localStorage.getItem("isGuest") === "true";
    if (!isGuest) {
      return <Login />;
    }
  }

  return <>{children}</>;
};

import { AnnouncementDialog } from "@/components/AnnouncementDialog"; // Import it

// ... (rest of imports)

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" enableSystem attribute="class" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AnnouncementDialog /> {/* Add the dialog here */}
        <HashRouter>
          <DeepLinkListener /> {/* Listen for deep links globally */}
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<Navigate to="/" replace />} />
            {/* ... routes ... */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-shift"
              element={
                <ProtectedRoute>
                  <AddShift />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hospitals"
              element={
                <ProtectedRoute>
                  <Hospitals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-shift/:id"
              element={
                <ProtectedRoute>
                  <EditShift />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
