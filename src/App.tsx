import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";

import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/lib/supabase";
// Critical path pages — eagerly loaded
import Dashboard from "./pages/Dashboard";
import Shifts from "./pages/Shifts";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
// Heavy pages — lazy loaded (reduces initial bundle)
const AddShift = lazy(() => import("./pages/AddShift"));
const EditShift = lazy(() => import("./pages/EditShift"));
const Hospitals = lazy(() => import("./pages/Hospitals"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const BackupSync = lazy(() => import("./pages/BackupSync"));
const Profile = lazy(() => import("./pages/Profile"));

import { Loader2 } from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useAppStore } from "@/stores/appStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch on window focus for an offline-first app
      refetchOnWindowFocus: false,
      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      retry: 1,
    },
  },
});

// Lightweight page loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Debug logging for Auth Redirect — production only shows in dev


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

        // 1. Sync pending local changes to cloud first if any
        if (store.hasUnsyncedChanges && !store.isSyncing) {
          await store.syncData();
        }
        // 2. Fetch latest data from cloud
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
import { ForceUpdateDialog } from "@/components/ForceUpdateDialog";

import { AndroidBackButtonHandler } from "@/hooks/useAndroidBackButton";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" enableSystem attribute="class" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ForceUpdateDialog /> {/* Mandatory Force Update Blocker */}
        <AnnouncementDialog /> {/* Add the dialog here */}
        <HashRouter>
          <DeepLinkListener /> {/* Listen for deep links globally */}
          <AndroidBackButtonHandler /> {/* Android hardware back button handler */}
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
              path="/shifts"
              element={
                <ProtectedRoute>
                  <Shifts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-shift"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <AddShift />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/hospitals"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <Hospitals />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <Reports />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <Settings />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/backup-sync"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <BackupSync />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-shift/:id"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <EditShift />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <Profile />
                  </Suspense>
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
