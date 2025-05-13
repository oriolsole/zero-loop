
import { useEffect, useState } from 'react';
import { useLoopStore } from './useLoopStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { getTemplateDomains } from '@/utils/templateData';
import { saveDomainToSupabase } from '@/utils/supabase';
import { filterValidDomains, ensureValidDomainId } from '@/utils/domainUtils';

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
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize the store when auth state changes
  useEffect(() => {
    // Skip if already initialized to prevent repeated initialization
    if (hasInitialized && !authLoading) {
      return;
    }
    
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
          
          // Filter domains to ensure all have valid IDs 
          const validDomains = filterValidDomains(domains);
          
          // If no valid domains were loaded from Supabase, create default template domains
          if (validDomains.length === 0) {
            console.log('No valid domains found, creating template domains');
            const templateDomains = getTemplateDomains();
            
            // Create only the first two template domains to avoid overloading
            const limitedDomains = templateDomains.slice(0, 2);
            
            // Ensure all template domains have valid IDs
            const validLimitedDomains = limitedDomains.map(ensureValidDomainId);
            
            // Create each template domain in Supabase and add it to the store
            for (const domain of validLimitedDomains) {
              try {
                await saveDomainToSupabase(domain);
                addNewDomain(domain);
              } catch (err) {
                console.error('Error saving domain template:', err);
              }
            }
            
            // If we created domains, note that but don't re-initialize
            // to avoid creating an initialization loop
            if (validLimitedDomains.length > 0) {
              console.log(`Created ${validLimitedDomains.length} template domains`);
            }
          }
          
          console.log('Store initialization complete');
        } else {
          // If no user, default to local storage only
          console.log('No user authenticated, using local storage only');
          setUseRemoteLogging(false);
          
          // Filter domains to ensure all have valid IDs
          const validDomains = filterValidDomains(domains);
          
          // If no valid domains exist at all, create template domains locally
          if (validDomains.length === 0) {
            console.log('No valid domains found locally, creating template domains');
            // Only create two domains to avoid overloading storage
            const templateDomains = getTemplateDomains().slice(0, 2);
            
            // Ensure all template domains have valid IDs
            const validTemplateDomains = templateDomains.map(ensureValidDomainId);
            
            for (const domain of validTemplateDomains) {
              addNewDomain(domain);
            }
          }
        }
        
        setHasInitialized(true);
      } catch (error) {
        console.error('Error initializing store:', error);
        toast.error('Failed to initialize application data');
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeStore();
  }, [user, authLoading, initializeFromSupabase, setUseRemoteLogging, domains, hasInitialized]);
  
  return { isInitializing };
};
