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

const queryClient = new QueryClient();

// Debug logging for Auth Redirect
console.log("Current URL:", window.location.href);
console.log("Current Hash:", window.location.hash);
console.log("Current Search:", window.location.search);


// Deep Link Handler Component
const DeepLinkListener = () => {
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

  return null;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
