
import { useEffect, useState } from 'react';
import { useLoopStore } from './useLoopStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { getTemplateDomains } from '@/utils/templateData';
import { saveDomainToSupabase } from '@/utils/supabase';

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
          
          // If no domains were loaded from Supabase, create default template domains
          if (domains.length === 0) {
            console.log('No domains found, creating template domains');
            const templateDomains = getTemplateDomains();
            
            // Create each template domain in Supabase and add it to the store
            for (const domain of templateDomains) {
              await saveDomainToSupabase(domain);
              addNewDomain(domain);
            }
            
            // If template domains were created, re-initialize from Supabase
            if (templateDomains.length > 0) {
              await initializeFromSupabase();
            }
          }
          
          console.log('Store initialization complete');
        } else {
          // If no user, default to local storage only
          console.log('No user authenticated, using local storage only');
          setUseRemoteLogging(false);
          
          // If no domains exist at all, create template domains locally
          if (domains.length === 0) {
            console.log('No domains found locally, creating template domains');
            const templateDomains = getTemplateDomains();
            
            for (const domain of templateDomains) {
              addNewDomain(domain);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing store:', error);
        toast.error('Failed to initialize application data');
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeStore();
  }, [user, authLoading, initializeFromSupabase, setUseRemoteLogging, domains]);
  
  return { isInitializing };
};
