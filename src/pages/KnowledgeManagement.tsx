
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';

// This component is deprecated and redirects to the new Knowledge Manager
const KnowledgeManagement: React.FC = () => {
  useEffect(() => {
    toast.info('Redirecting to the updated Knowledge Manager');
  }, []);

  return <Navigate to="/knowledge" replace />;
};

export default KnowledgeManagement;
