
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EnhancedAuthForm from '@/components/EnhancedAuthForm';
import { useAuth } from '@/contexts/AuthContext';
import { Brain } from 'lucide-react';

const AuthPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user && !isLoading) {
      // Redirect authenticated users to home
      navigate('/');
    }
  }, [user, isLoading, navigate]);
  
  // Don't render the form if we're already authenticated and going to redirect
  if (user && !isLoading) return null;
  
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-secondary/10 p-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-3 mb-2">
          <Brain className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold">ZeroLoop</h1>
        </div>
        <p className="text-muted-foreground">A self-evolving intelligence framework</p>
      </div>
      
      <div className="w-full max-w-md">
        <EnhancedAuthForm />
      </div>
    </div>
  );
};

export default AuthPage;
