import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Domain, LearningStep, LoopHistory } from '../types/intelligence';
import { domainsData } from '../data/mockData';
import { isSupabaseConfigured } from '../utils/supabase-client';
import { loadDomainsFromSupabase } from '../utils/supabase';

// Import actions from separated files
import { createDomainActions } from './loopStore/domainActions';
import { createLoopActions } from './loopStore/loopActions';
import { createKnowledgeActions } from './loopStore/knowledgeActions';
import { createSyncActions } from './loopStore/syncActions';

export interface LoopState {
  domains: Domain[];
  activeDomainId: string;
  isRunningLoop: boolean;
  currentStepIndex: number | null;
  isContinuousMode: boolean;
  loopDelay: number;
  loopHistory: LoopHistory[];
  selectedInsightId: string | null;
  useRemoteLogging: boolean;
  isInitialized: boolean;
  
  // Actions will be added by the action creators
  initializeFromSupabase: () => Promise<void>;
  setActiveDomain: (domainId: string) => void;
  startNewLoop: () => Promise<void>;
  advanceToNextStep: () => Promise<void>;
  completeLoop: () => void;
  loadPreviousLoop: (loopId?: string) => void;
  toggleContinuousMode: () => void;
  setLoopDelay: (delay: number) => void;
  pauseLoops: () => void;
  setSelectedInsight: (nodeId: string | null) => void;
  recalculateGraphLayout: () => void;
  setUseRemoteLogging: (useRemote: boolean) => void;
  
  // Domain management actions
  addNewDomain: (domain: Domain) => void;
  updateDomain: (domain: Domain) => void;
  deleteDomain: (domainId: string) => void;
}

// Convert existing domain IDs to UUIDs if they're not already
const convertedDomains = domainsData.map(domain => {
  // Check if the domain ID is already a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(domain.id)) {
    return {
      ...domain,
      id: uuidv4(),
      knowledgeEdges: domain.knowledgeEdges || []
    };
  }
  return {
    ...domain,
    knowledgeEdges: domain.knowledgeEdges || []
  };
});

export const useLoopStore = create<LoopState>()(
  persist(
    (set, get) => {
      // Create the base state
      const baseState = {
        domains: convertedDomains,
        activeDomainId: convertedDomains[0]?.id || '',
        isRunningLoop: false,
        currentStepIndex: null,
        isContinuousMode: false,
        loopDelay: 2000,
        loopHistory: [],
        selectedInsightId: null,
        useRemoteLogging: false,
        isInitialized: false,
        
        // Basic initialization and state setters
        initializeFromSupabase: async () => {
          // Skip if already initialized or Supabase not configured
          if (get().isInitialized || !isSupabaseConfigured() || !get().useRemoteLogging) {
            set({ isInitialized: true }); // Mark as initialized even if not using remote
            return;
          }
          
          try {
            console.log('Initializing domains from Supabase...');
            const remoteDomains = await loadDomainsFromSupabase();
            
            if (remoteDomains.length > 0) {
              console.log(`Loaded ${remoteDomains.length} domains from Supabase`);
              
              // Keep local knowledge nodes and edges for each domain
              const mergedDomains = remoteDomains.map(remoteDomain => {
                // Find matching local domain (if any)
                const localDomain = get().domains.find(d => d.id === remoteDomain.id);
                
                if (localDomain) {
                  return {
                    ...remoteDomain,
                    knowledgeNodes: localDomain.knowledgeNodes,
                    knowledgeEdges: localDomain.knowledgeEdges || []
                  };
                }
                
                return {
                  ...remoteDomain,
                  knowledgeNodes: [],
                  knowledgeEdges: []
                };
              });
              
              // If there are any domains locally that don't exist in remote, add them
              const remoteDomainIds = new Set(remoteDomains.map(d => d.id));
              const localOnlyDomains = get().domains.filter(d => !remoteDomainIds.has(d.id));
              
              const allDomains = [...mergedDomains, ...localOnlyDomains];
              
              // Set the active domain to the first one if the current one doesn't exist
              const activeDomainExists = allDomains.some(d => d.id === get().activeDomainId);
              const newActiveDomainId = activeDomainExists 
                ? get().activeDomainId 
                : (allDomains[0]?.id || '');
              
              set({ 
                domains: allDomains,
                activeDomainId: newActiveDomainId,
                isInitialized: true
              });
              
              console.log('Domains initialized from Supabase');
            } else {
              console.log('No domains found in Supabase, keeping local domains');
              set({ isInitialized: true });
            }
          } catch (error) {
            console.error('Error initializing domains from Supabase:', error);
            set({ isInitialized: true }); // Mark as initialized even on error
          }
        },
        
        setActiveDomain: (domainId) => {
          // Only allow domain change when not in a running loop
          if (!get().isRunningLoop) {
            set({ activeDomainId: domainId });
          }
        },
        
        setUseRemoteLogging: (useRemote) => {
          const { isInitialized } = get();
          
          set({ useRemoteLogging: useRemote });
          
          // If enabling remote logging and not initialized, initialize from Supabase
          if (useRemote && !isInitialized) {
            get().initializeFromSupabase();
          }
        },

        setSelectedInsight: (nodeId) => {
          set({ selectedInsightId: nodeId });
        },
      };
      
      // Combine all actions into one state object
      return {
        ...baseState,
        ...createDomainActions(set, get),
        ...createLoopActions(set, get),
        ...createKnowledgeActions(set, get),
        ...createSyncActions(set, get),
      };
    },
    {
      name: 'intelligence-loop-storage',
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            // Initialize from Supabase if remote logging is enabled
            if (state.useRemoteLogging) {
              setTimeout(() => {
                state.initializeFromSupabase();
              }, 0);
            } else {
              state.isInitialized = true;
            }
          }
        };
      }
    }
  )
);

// Initialize from Supabase if remote logging is enabled when the app starts
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const state = useLoopStore.getState();
    if (state.useRemoteLogging && !state.isInitialized) {
      state.initializeFromSupabase();
    }
  }, 100);
}
