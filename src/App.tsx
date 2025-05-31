
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import GoogleSettings from "./pages/GoogleSettings";
import AIAgent from "./pages/AIAgent";
import AgentManagement from "./pages/AgentManagement";
import KnowledgeManagement from "./pages/KnowledgeManagement";
import Tools from "./pages/Tools";
import DomainCustomization from "./pages/DomainCustomization";
import CreateWebSearchMCP from "./pages/CreateWebSearchMCP";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { ConversationProvider } from "./contexts/ConversationContext";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <ConversationProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/google-settings" element={
                  <ProtectedRoute>
                    <GoogleSettings />
                  </ProtectedRoute>
                } />
                <Route path="/ai-agent" element={
                  <ProtectedRoute>
                    <AIAgent />
                  </ProtectedRoute>
                } />
                <Route path="/agent-management" element={
                  <ProtectedRoute>
                    <AgentManagement />
                  </ProtectedRoute>
                } />
                <Route path="/knowledge" element={
                  <ProtectedRoute>
                    <KnowledgeManagement />
                  </ProtectedRoute>
                } />
                <Route path="/tools" element={
                  <ProtectedRoute>
                    <Tools />
                  </ProtectedRoute>
                } />
                <Route path="/domain-customization" element={
                  <ProtectedRoute>
                    <DomainCustomization />
                  </ProtectedRoute>
                } />
                <Route path="/create-web-search-mcp" element={
                  <ProtectedRoute>
                    <CreateWebSearchMCP />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ConversationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
