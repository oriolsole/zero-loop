
import { useState, useEffect } from 'react';
import { useLoopStore } from '../store/useLoopStore';
import { logLoopToSupabase, saveKnowledgeNodeToSupabase, saveKnowledgeEdgeToSupabase, saveDomainToSupabase, updateDomainInSupabase, syncWithSupabase } from '../utils/supabaseUtils';
import { isSupabaseConfigured } from '../utils/supabase-client';
import { LoopHistory, KnowledgeNode, KnowledgeEdge, Domain } from '../types/intelligence';

const LOCAL_STORAGE_KEY = 'intelligence-loop-sync-queue';
const LOCAL_STORAGE_STATE_KEY = 'intelligence-loop-sync-state';

interface SyncQueue {
  loops: LoopHistory[];
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  domains: Domain[];
}

interface SyncState {
  isRemoteEnabled: boolean;
  lastSyncTime: number | null;
  syncStats: {
    totalSynced: number;
    failedSyncs: number;
  };
}

const getInitialState = (): SyncState => {
  const storedState = localStorage.getItem(LOCAL_STORAGE_STATE_KEY);
  if (storedState) {
    try {
      return JSON.parse(storedState);
    } catch (e) {
      console.error('Failed to parse stored sync state:', e);
    }
  }
  
  return {
    isRemoteEnabled: false,
    lastSyncTime: null,
    syncStats: {
      totalSynced: 0,
      failedSyncs: 0
    }
  };
};

const getInitialQueue = (): SyncQueue => {
  const storedQueue = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (storedQueue) {
    try {
      return JSON.parse(storedQueue);
    } catch (e) {
      console.error('Failed to parse stored sync queue:', e);
    }
  }
  
  return {
    loops: [],
    nodes: [],
    edges: [],
    domains: []
  };
};

export function useSupabaseLogger() {
  const [state, setState] = useState<SyncState>(getInitialState);
  const [queue, setQueue] = useState<SyncQueue>(getInitialQueue);
  const { loopHistory, domains, activeDomainId } = useLoopStore();
  
  // Save state and queue to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_STATE_KEY, JSON.stringify(state));
  }, [state]);
  
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(queue));
  }, [queue]);
  
  // Check if Supabase is properly configured
  useEffect(() => {
    const supabaseConfig = isSupabaseConfigured();
    if (!supabaseConfig && state.isRemoteEnabled) {
      setState(prev => ({ ...prev, isRemoteEnabled: false }));
    }
  }, [state.isRemoteEnabled]);
  
  // Function to toggle remote logging
  const toggleRemoteLogging = (enabled: boolean) => {
    setState(prev => ({ ...prev, isRemoteEnabled: enabled }));
  };
  
  // Queue a completed loop for sync
  const queueLoop = (loop: LoopHistory) => {
    if (!state.isRemoteEnabled) return;
    
    setQueue(prev => ({
      ...prev,
      loops: [...prev.loops, loop]
    }));
    
    console.log('Loop queued for sync:', loop.id);
  };
  
  // Queue a knowledge node for sync
  const queueNode = (node: KnowledgeNode) => {
    if (!state.isRemoteEnabled) return;
    
    setQueue(prev => ({
      ...prev,
      nodes: [...prev.nodes, node]
    }));
    
    console.log('Knowledge node queued for sync:', node.id);
  };
  
  // Queue a knowledge edge for sync
  const queueEdge = (edge: KnowledgeEdge) => {
    if (!state.isRemoteEnabled) return;
    
    setQueue(prev => ({
      ...prev,
      edges: [...prev.edges, edge]
    }));
    
    console.log('Knowledge edge queued for sync:', edge.id);
  };

  // Queue a domain for sync
  const queueDomain = (domain: Domain) => {
    if (!state.isRemoteEnabled) return;
    
    setQueue(prev => {
      // Check if the domain is already in the queue
      const existingIndex = prev.domains.findIndex(d => d.id === domain.id);
      if (existingIndex >= 0) {
        // Replace the existing domain with the updated one
        const updatedDomains = [...prev.domains];
        updatedDomains[existingIndex] = domain;
        return {
          ...prev,
          domains: updatedDomains
        };
      }
      
      // Add the new domain to the queue
      return {
        ...prev,
        domains: [...prev.domains, domain]
      };
    });
    
    console.log('Domain queued for sync:', domain.id);
  };
  
  // Sync all pending items in the queue
  const syncPendingItems = async (): Promise<boolean> => {
    if (queue.loops.length === 0 && 
        queue.nodes.length === 0 && 
        queue.edges.length === 0 &&
        queue.domains.length === 0) {
      console.log('No items to sync');
      return true;
    }
    
    try {
      console.log('Starting sync of pending items:', {
        loops: queue.loops.length,
        nodes: queue.nodes.length,
        edges: queue.edges.length,
        domains: queue.domains.length
      });
      
      const result = await syncWithSupabase(
        queue.loops,
        queue.nodes,
        queue.edges,
        queue.domains
      );
      
      const totalSynced = 
        result.stats.loops + 
        result.stats.nodes + 
        result.stats.edges +
        result.stats.domains;
      
      console.log('Sync result:', result);
      
      // Update stats
      setState(prev => ({
        ...prev,
        lastSyncTime: Date.now(),
        syncStats: {
          totalSynced: prev.syncStats.totalSynced + totalSynced,
          failedSyncs: prev.syncStats.failedSyncs + (result.success ? 0 : 1)
        }
      }));
      
      // Clear synced items from queue
      if (result.success) {
        setQueue({
          loops: [],
          nodes: [],
          edges: [],
          domains: []
        });
      }
      
      return result.success;
    } catch (error) {
      console.error('Error during sync:', error);
      setState(prev => ({
        ...prev,
        syncStats: {
          ...prev.syncStats,
          failedSyncs: prev.syncStats.failedSyncs + 1
        }
      }));
      return false;
    }
  };
  
  // Auto-sync every 5 minutes if enabled
  useEffect(() => {
    if (!state.isRemoteEnabled) return;
    
    const intervalId = setInterval(() => {
      const pendingCount = queue.loops.length + queue.nodes.length + queue.edges.length + queue.domains.length;
      if (pendingCount > 0) {
        console.log('Auto-syncing pending items:', pendingCount);
        syncPendingItems();
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(intervalId);
  }, [state.isRemoteEnabled, queue]);
  
  // Queue new loops for syncing if remote logging is enabled
  useEffect(() => {
    if (!state.isRemoteEnabled) return;
    
    // Check if there are any loops not in the queue
    const queuedLoopIds = new Set(queue.loops.map(l => l.id));
    const unqueuedLoops = loopHistory.filter(l => !queuedLoopIds.has(l.id));
    
    if (unqueuedLoops.length > 0) {
      console.log(`Found ${unqueuedLoops.length} unqueued loops, adding to queue`);
      setQueue(prev => ({
        ...prev,
        loops: [...prev.loops, ...unqueuedLoops]
      }));
    }
  }, [state.isRemoteEnabled, loopHistory, queue.loops]);

  // Queue domains for syncing if remote logging is enabled
  useEffect(() => {
    if (!state.isRemoteEnabled) return;
    
    // Check if any domains need to be added to the queue
    const queuedDomainIds = new Set(queue.domains.map(d => d.id));
    const unqueuedDomains = domains.filter(d => !queuedDomainIds.has(d.id));
    
    if (unqueuedDomains.length > 0) {
      console.log(`Found ${unqueuedDomains.length} unqueued domains, adding to queue`);
      setQueue(prev => ({
        ...prev,
        domains: [...prev.domains, ...unqueuedDomains]
      }));
    }
  }, [state.isRemoteEnabled, domains, queue.domains]);
  
  return {
    state,
    queue,
    toggleRemoteLogging,
    queueLoop,
    queueNode,
    queueEdge,
    queueDomain,
    syncPendingItems,
    pendingItemsCount: queue.loops.length + queue.nodes.length + queue.edges.length + queue.domains.length
  };
}
