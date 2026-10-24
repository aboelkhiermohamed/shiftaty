import { createRoot } from "react-dom/client";
import { SplashScreen } from "@capacitor/splash-screen";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

// Hide splash screen the absolute millisecond JS starts executing
SplashScreen.hide().catch(() => {});

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);

// Register service worker for PWA support on web/PWA platforms
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('Service Worker registered successfully with scope:', reg.scope);
      })
      .catch(err => {
        console.error('Service Worker registration failed:', err);
      });
  });
}

