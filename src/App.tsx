
import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { useLoopStoreInit } from "./store/useLoopStoreInit";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DomainCustomization from "./pages/DomainCustomization";
import Auth from "./pages/Auth";
import { Loader2 } from "lucide-react";

// Loading component
const LoadingScreen = () => (
  <div className="h-screen flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
      <p className="mt-4 text-xl font-medium">Initializing ZeroLoop...</p>
      <p className="text-muted-foreground">Loading your intelligence framework</p>
    </div>
  </div>
);

// App initializer component
const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const { isInitializing } = useLoopStoreInit();
  
  if (isInitializing) {
    return <LoadingScreen />;
  }
  
  return <>{children}</>;
};

// Main App component
const App = () => {
  // Create the client as a component state to ensure it's created only once per component instance
  const queryClient = React.useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30000,
      },
    },
  }), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingScreen />}>
              <AppInitializer>
                <Routes>
                  {/* Auth route - accessible by anyone */}
                  <Route path="/auth" element={<Auth />} />
                  
                  {/* Protected routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } />
                  <Route path="/domain/new" element={
                    <ProtectedRoute>
                      <DomainCustomization />
                    </ProtectedRoute>
                  } />
                  <Route path="/domain/edit/:domainId" element={
                    <ProtectedRoute>
                      <DomainCustomization />
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch-all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppInitializer>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
