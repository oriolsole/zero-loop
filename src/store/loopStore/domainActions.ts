
import { toast } from '@/components/ui/sonner';
import { Domain } from '../../types/intelligence';
import { v4 as uuidv4 } from 'uuid';
import { LoopState } from '../useLoopStore';
import { 
  saveDomainToSupabase, 
  updateDomainInSupabase, 
  deleteDomainFromSupabase 
} from '../../utils/supabase';
import { isSupabaseConfigured } from '../../utils/supabase-client';
import { isValidUUID } from '../../utils/supabase/helpers';
import { domainEngines } from '../../engines/domainEngines';

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
    // ENHANCED: Ensure the domain ID is always a valid UUID
    // Replace any non-UUID formatted ID with a new UUID
    const domainId = isValidUUID(domain.id) ? domain.id : uuidv4();
    
    // Ensure the domain has an engineType set, defaulting to a valid one if missing
    const engineType = domain.engineType && domainEngines[domain.engineType] 
      ? domain.engineType 
      : Object.keys(domainEngines)[0];
    
    const completeDomain: Domain = {
      ...domain,
      id: domainId,
      engineType,
      totalLoops: domain.totalLoops || 0,
      currentLoop: domain.currentLoop || [],
      knowledgeNodes: domain.knowledgeNodes || [],
      knowledgeEdges: domain.knowledgeEdges || [],
      metrics: domain.metrics || {
        successRate: 0,
        knowledgeGrowth: [{ name: 'Start', nodes: 0 }],
        taskDifficulty: [{ name: 'Start', difficulty: 1, success: 1 }],
        skills: [{ name: 'Learning', level: 1 }]
      }
    };
    
    // Add the new domain
    set(state => ({
      domains: [...state.domains, completeDomain],
      activeDomainId: domainId // Switch to the new domain
    }));
    
    // If remote logging is enabled, save to Supabase
    if (get().useRemoteLogging && isSupabaseConfigured()) {
      saveDomainToSupabase(completeDomain)
        .then(success => {
          if (success) {
            console.log('Domain saved to Supabase:', domainId);
          }
        })
        .catch(error => {
          console.error('Error saving domain to Supabase:', error);
        });
    }
    
    toast.success('New domain created!');
  },
  
  updateDomain: (updatedDomain: Domain) => {
    // ENHANCED: Ensure we don't try to update domains with invalid IDs
    if (!isValidUUID(updatedDomain.id)) {
      toast.error(`Cannot update domain with invalid ID: ${updatedDomain.id}`);
      return;
    }
    
    // Ensure engineType is valid if it exists
    if (updatedDomain.engineType && !domainEngines[updatedDomain.engineType]) {
      console.warn(`Invalid engine type ${updatedDomain.engineType}, defaulting to ${Object.keys(domainEngines)[0]}`);
      updatedDomain.engineType = Object.keys(domainEngines)[0];
    }
    
    set(state => {
      const domainIndex = state.domains.findIndex(d => d.id === updatedDomain.id);
      if (domainIndex === -1) return state;
      
      const newDomains = [...state.domains];
      
      // Keep the existing complex data while updating the basic info
      const existingDomain = state.domains[domainIndex];
      newDomains[domainIndex] = {
        ...existingDomain,
        name: updatedDomain.name,
        shortDesc: updatedDomain.shortDesc,
        description: updatedDomain.description,
        engineType: updatedDomain.engineType || existingDomain.engineType,
      };

      // If remote logging is enabled, update in Supabase
      if (state.useRemoteLogging && isSupabaseConfigured()) {
        updateDomainInSupabase(newDomains[domainIndex])
          .then(success => {
            if (success) {
              console.log('Domain updated in Supabase:', updatedDomain.id);
            }
          })
          .catch(error => {
            console.error('Error updating domain in Supabase:', error);
          });
      }
      
      return { domains: newDomains };
    });
    
    toast.success('Domain updated!');
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
