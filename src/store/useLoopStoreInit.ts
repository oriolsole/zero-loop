
import { useEffect, useState } from 'react';
import { useLoopStore } from './useLoopStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

export const useLoopStoreInit = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { 
    initializeFromSupabase, 
    domains, 
    addNewDomain, 
    useRemoteLogging,
    setUseRemoteLogging,
    isInitialized
  } = useLoopStore();
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize the store when auth state changes
  useEffect(() => {
    const initializeStore = async () => {
      if (authLoading) return;
      
      try {
        setIsInitializing(true);
        console.log('Starting store initialization...', { 
          user: !!user, 
          useRemoteLogging, 
          isInitialized,
          domainsCount: domains.length 
        });
        
        if (user) {
          // If user is authenticated, enable remote logging and load from Supabase
          if (!useRemoteLogging) {
            console.log('User is authenticated, enabling remote logging');
            setUseRemoteLogging(true);
          }
          
          // Always try to load from Supabase when user is authenticated
          console.log('Loading domains from Supabase...');
          await initializeFromSupabase();
          
          // Check if we successfully loaded domains
          const updatedState = useLoopStore.getState();
          console.log('Domains after Supabase load:', updatedState.domains.length);
          
          if (updatedState.domains.length === 0) {
            console.log('No domains loaded, this might indicate an issue with Supabase connection');
            toast.error('Failed to load learning domains. Please refresh the page or check your connection.');
          } else {
            console.log(`Successfully loaded ${updatedState.domains.length} domains from Supabase`);
            toast.success(`Loaded ${updatedState.domains.length} learning domains`);
          }
        } else {
          // If no user, try local-only mode
          console.log('No user authenticated, using local storage only');
          setUseRemoteLogging(false);
          
          // For local mode, we can't access the database domains
          if (domains.length === 0) {
            toast.info('Please sign in to access your learning domains');
          }
        }
        
        setHasInitialized(true);
      } catch (error) {
        console.error('Error initializing store:', error);
        toast.error('Failed to initialize application data. Please refresh the page.');
      } finally {
        setIsInitializing(false);
      }
    };
    
    // Only initialize once per auth state change
    if (!hasInitialized || (user && !isInitialized)) {
      initializeStore();
    }
  }, [user, authLoading, useRemoteLogging, hasInitialized, isInitialized]);
  
  return { isInitializing };
};
