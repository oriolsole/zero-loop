import { Domain } from '../../types/intelligence';
import { LoopState } from '../useLoopStore';
import { EngineDetectionModel } from '../../models/engineDetection';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/components/ui/sonner';
import { 
  saveDomainToSupabase, 
  deleteDomainFromSupabase, 
  updateDomainInSupabase 
} from '../../utils/supabase/domainOperations';

type SetFunction = (
  partial: LoopState | Partial<LoopState> | ((state: LoopState) => LoopState | Partial<LoopState>),
  replace?: boolean,
) => void;

type GetFunction = () => LoopState;

export const createDomainActions = (
  set: SetFunction,
  get: GetFunction
) => ({
  addNewDomain: (domain: Domain) => {
    // Clone the current domains
    const currentDomains = [...get().domains];
    
    // Ensure the domain has an engine type assigned
    const domainWithEngine = EngineDetectionModel.assignEngineType(domain);
    
    // Add the new domain
    currentDomains.push(domainWithEngine);
    
    // Update state with new domains and set the added domain as active
    set({
      domains: currentDomains,
      activeDomainId: domain.id,
      isInitialized: true
    });
    
    // Sync to Supabase if remote logging is enabled
    if (get().useRemoteLogging) {
      saveDomainToSupabase(domainWithEngine)
        .then(success => {
          if (!success) {
            console.error('Failed to save domain to Supabase');
          }
        })
        .catch(err => {
          console.error('Error saving domain to Supabase:', err);
        });
    }
    
    console.log(`New domain added: ${domain.name} with ID: ${domain.id} and engine type: ${domainWithEngine.engineType}`);
    toast.success(`Domain "${domain.name}" created`);
  },
  
  updateDomain: (domain: Domain) => {
    const { domains, activeDomainId, useRemoteLogging } = get();
    
    // Find the domain to update
    const index = domains.findIndex(d => d.id === domain.id);
    
    if (index === -1) {
      console.error(`Domain with ID: ${domain.id} not found`);
      toast.error('Failed to update domain: Domain not found');
      return;
    }
    
    // Ensure the domain has an engine type assigned if it doesn't have one
    const domainWithEngine = EngineDetectionModel.assignEngineType(domain);
    
    // Create a new domains array with the updated domain
    const updatedDomains = [...domains];
    updatedDomains[index] = domainWithEngine;
    
    // Update state with modified domains
    set({
      domains: updatedDomains,
      // If the active domain was updated, update it
      activeDomainId: activeDomainId === domain.id ? domain.id : activeDomainId
    });
    
    // Sync to Supabase if remote logging is enabled
    if (useRemoteLogging) {
      updateDomainInSupabase(domainWithEngine)
        .then(success => {
          if (!success) {
            console.error('Failed to update domain in Supabase');
          }
        })
        .catch(err => {
          console.error('Error updating domain in Supabase:', err);
        });
    }
    
    console.log(`Domain updated: ${domain.name} with ID: ${domain.id} and engine type: ${domainWithEngine.engineType}`);
    toast.success(`Domain "${domain.name}" updated`);
  },
  
  deleteDomain: (domainId: string) => {
    const { domains, activeDomainId } = get();
    
    // Don't delete if it's the only domain
    if (domains.length <= 1) {
      toast.error('Cannot delete the only domain');
      return;
    }
    
    // Create a new domains array without the deleted domain
    const newDomains = domains.filter(d => d.id !== domainId);
    
    // If deleting the active domain, switch to the first remaining one
    const newActiveDomain = activeDomainId === domainId
      ? newDomains[0].id
      : activeDomainId;
      
    set({ 
      domains: newDomains,
      activeDomainId: newActiveDomain
    });
    
    // If remote logging is enabled, delete from Supabase
    if (get().useRemoteLogging && isSupabaseConfigured() && isValidUUID(domainId)) {
      deleteDomainFromSupabase(domainId)
        .then(success => {
          if (success) {
            console.log('Domain deleted from Supabase:', domainId);
          }
        })
        .catch(error => {
          console.error('Error deleting domain from Supabase:', error);
        });
    }
    
    toast.success('Domain deleted!');
  },
});
