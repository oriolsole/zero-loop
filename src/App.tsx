
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';

import Index from './pages/Index';
import KnowledgeManagement from './pages/KnowledgeManagement';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';
import DomainCustomization from './pages/DomainCustomization';
import ProtectedRoute from './components/ProtectedRoute';

import { AuthProvider } from './contexts/AuthContext';
import { useLoopStoreInit } from './store/useLoopStoreInit';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/theme-provider';

function AppInitializer() {
  const { isInitializing } = useLoopStoreInit();
  
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Initializing...</p>
        </div>
      </div>
    );
  }
  
  return null;
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="zeroloop-theme">
      <AuthProvider>
        <Router>
          <AppInitializer />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/domain/new" element={
              <ProtectedRoute>
                <DomainCustomization />
              </ProtectedRoute>
            } />
            <Route path="/domain/:id" element={
              <ProtectedRoute>
                <DomainCustomization />
              </ProtectedRoute>
            } />
            <Route path="/knowledge" element={
              <ProtectedRoute>
                <KnowledgeManagement />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
          <Toaster />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
