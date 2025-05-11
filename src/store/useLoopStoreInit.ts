
import { useEffect, useState } from 'react';
import { useLoopStore } from './useLoopStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { extraDomains } from '@/data/mockData';

export const useLoopStoreInit = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { 
    initializeFromSupabase, 
    domains, 
    addNewDomain, 
    useRemoteLogging,
    setUseRemoteLogging
  } = useLoopStore();
  
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize the store when auth state changes
  useEffect(() => {
    const initializeStore = async () => {
      if (authLoading) return;
      
      try {
        setIsInitializing(true);
        
        if (user) {
          // If user is authenticated, enable remote logging and load from Supabase
          if (!useRemoteLogging) {
            console.log('User is authenticated, enabling remote logging');
            setUseRemoteLogging(true);
          }
          
          await initializeFromSupabase();
          
          // Add AI Reasoning domain if it doesn't exist yet
          const aiReasoningDomain = domains.find(d => 
            d.id === 'ai-reasoning' || 
            d.name.toLowerCase().includes('ai reasoning')
          );
          
          if (!aiReasoningDomain) {
            console.log('Adding AI Reasoning domain');
            const aiDomain = extraDomains.find(d => d.id === 'ai-reasoning');
            if (aiDomain) {
              addNewDomain({
                ...aiDomain,
                id: 'ai-reasoning'
              });
            }
          }
          
          console.log('Store initialization complete');
        } else {
          // If no user, default to local storage only
          console.log('No user authenticated, using local storage only');
          setUseRemoteLogging(false);
        }
      } catch (error) {
        console.error('Error initializing store:', error);
        toast.error('Failed to initialize application data');
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeStore();
  }, [user, authLoading, initializeFromSupabase, setUseRemoteLogging]);
  
  return { isInitializing };
};
