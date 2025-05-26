
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from '@/contexts/AuthContext';
import { ModelSettingsProvider } from '@/contexts/ModelSettingsContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import KnowledgeManagement from "./pages/KnowledgeManagement";
import DomainCustomization from "./pages/DomainCustomization";
import Settings from "./pages/Settings";
import AIAgent from "./pages/AIAgent";
import CreateWebSearchMCP from "./pages/CreateWebSearchMCP";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AuthProvider>
              <ModelSettingsProvider>
                <Suspense fallback={<div>Loading...</div>}>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    } />
                    <Route path="/knowledge" element={
                      <ProtectedRoute>
                        <KnowledgeManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/domains" element={
                      <ProtectedRoute>
                        <DomainCustomization />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    } />
                    <Route path="/ai-agent" element={
                      <ProtectedRoute>
                        <AIAgent />
                      </ProtectedRoute>
                    } />
                    <Route path="/create-web-search-mcp" element={
                      <ProtectedRoute>
                        <CreateWebSearchMCP />
                      </ProtectedRoute>
                    } />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ModelSettingsProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
