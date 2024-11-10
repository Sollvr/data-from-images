import { StrictMode, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, useLocation } from "wouter";
import "./index.css";
import { SWRConfig } from "swr";
import { fetcher } from "./lib/fetcher";
import { Toaster } from "@/components/ui/toaster";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";

console.log("Application starting...");

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function RouteChangeLogger() {
  const [location] = useLocation();

  useEffect(() => {
    console.log("Route changed:", location);
  }, [location]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <RouteChangeLogger />
      <Switch>
        <Route path="/">
          <Landing />
        </Route>
        <Route path="/app">
          <Home />
        </Route>
        <Route path="/auth">
          <Auth />
        </Route>
        <Route>
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold">404</h1>
              <p className="text-muted-foreground">Page Not Found</p>
            </div>
          </div>
        </Route>
      </Switch>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-destructive">
              Application Error
            </h2>
            <p className="text-muted-foreground">
              An unexpected error occurred. Please refresh the page.
            </p>
          </div>
        </div>
      }
    >
      <SWRConfig
        value={{
          fetcher,
          onError: (error) => {
            console.error("SWR Global Error:", error);
          },
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <AppRoutes />
        </Suspense>
        <Toaster />
      </SWRConfig>
    </ErrorBoundary>
  </StrictMode>
);

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js");
  });
}
