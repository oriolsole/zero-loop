
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Domain, LearningStep, LoopHistory } from '../types/intelligence';
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
  cancelCurrentLoop: () => void;
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

export const useLoopStore = create<LoopState>()(
  persist(
    (set, get) => {
      // Create the base state
      const baseState = {
        domains: [],
        activeDomainId: '',
        isRunningLoop: false,
        currentStepIndex: null,
        isContinuousMode: false,
        loopDelay: 2000,
        loopHistory: [],
        selectedInsightId: null,
        useRemoteLogging: false,
        isInitialized: false,
        
        // Enhanced initialization from Supabase - only use persisted domains
        initializeFromSupabase: async () => {
          const currentState = get();
          
          // Skip if Supabase not configured
          if (!isSupabaseConfigured()) {
            console.log('Supabase not configured, skipping remote initialization');
            set({ isInitialized: true });
            return;
          }
          
          if (!currentState.useRemoteLogging) {
            console.log('Remote logging disabled, skipping Supabase initialization');
            set({ isInitialized: true });
            return;
          }
          
          try {
            console.log('Initializing domains from Supabase...');
            const remoteDomains = await loadDomainsFromSupabase();
            
            console.log(`Loaded ${remoteDomains.length} domains from Supabase:`, remoteDomains.map(d => d.name));
            
            // UPDATED: Only use domains from the database, no merging with local ones
            if (remoteDomains.length > 0) {
              // Set the active domain to the first one if current one doesn't exist in remote domains
              const activeDomainExists = remoteDomains.some(d => d.id === currentState.activeDomainId);
              const newActiveDomainId = activeDomainExists 
                ? currentState.activeDomainId 
                : (remoteDomains[0]?.id || '');
              
              set({ 
                domains: remoteDomains, // Only use remote domains, no merging
                activeDomainId: newActiveDomainId,
                isInitialized: true
              });
              
              console.log(`Successfully initialized with ${remoteDomains.length} domains from database only, active: ${newActiveDomainId}`);
            } else {
              console.log('No domains found in Supabase, clearing local domains');
              set({ 
                domains: [], // Clear domains if none in database
                activeDomainId: '',
                isInitialized: true 
              });
            }
          } catch (error) {
            console.error('Error initializing domains from Supabase:', error);
            set({ isInitialized: true }); // Mark as initialized even on error to prevent loops
            throw error; // Re-throw to let caller handle the error
          }
        },
        
        setActiveDomain: (domainId) => {
          // Only allow domain change when not in a running loop
          if (!get().isRunningLoop) {
            console.log('Setting active domain:', domainId);
            set({ activeDomainId: domainId });
          }
        },
        
        setUseRemoteLogging: (useRemote) => {
          console.log('Setting remote logging:', useRemote);
          set({ useRemoteLogging: useRemote, isInitialized: false });
          
          // If enabling remote logging, initialize from Supabase
          if (useRemote) {
            setTimeout(() => {
              get().initializeFromSupabase().catch(console.error);
            }, 100);
          } else {
            // If disabling remote logging, clear domains to avoid confusion
            set({ domains: [], activeDomainId: '' });
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
      partialize: (state) => ({
        // UPDATED: Don't persist domains in localStorage anymore since we only want database ones
        activeDomainId: state.activeDomainId,
        loopDelay: state.loopDelay,
        loopHistory: state.loopHistory,
        useRemoteLogging: state.useRemoteLogging,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            console.log('Rehydrating store from localStorage, useRemoteLogging:', state.useRemoteLogging);
            // Reset initialization flag on rehydration and clear domains
            state.isInitialized = false;
            state.domains = []; // Don't load domains from localStorage
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
