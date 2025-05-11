import { useState, useEffect } from 'react';
import { useLoopStore } from '../store/useLoopStore';
import { logLoopToSupabase, saveKnowledgeNodeToSupabase, saveKnowledgeEdgeToSupabase, saveDomainToSupabase, updateDomainInSupabase, syncWithSupabase } from '../utils/supabaseUtils';
import { isSupabaseConfigured } from '../utils/supabase-client';
import { LoopHistory, KnowledgeNode, KnowledgeEdge, Domain } from '../types/intelligence';
import { toast } from '@/components/ui/sonner';

const LOCAL_STORAGE_KEY = 'intelligence-loop-sync-queue';
const LOCAL_STORAGE_STATE_KEY = 'intelligence-loop-sync-state';
const MAX_QUEUE_ITEMS = 50; // Limit total items in queue

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
  try {
    const storedState = localStorage.getItem(LOCAL_STORAGE_STATE_KEY);
    if (storedState) {
      return JSON.parse(storedState);
    }
  } catch (e) {
    console.error('Failed to parse stored sync state:', e);
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
  try {
    const storedQueue = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedQueue) {
      return JSON.parse(storedQueue);
    }
  } catch (e) {
    console.error('Failed to parse stored sync queue:', e);
  }
  
  return {
    loops: [],
    nodes: [],
    edges: [],
    domains: []
  };
};

// Safe storage function that handles quota errors
const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error(`Storage error for key ${key}:`, e);
    if (e instanceof DOMException && (
      e.name === 'QuotaExceededError' || 
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      toast.error('Local storage quota exceeded. Some data won\'t be saved locally.');
      return false;
    }
    throw e; // Re-throw if it's not a quota error
  }
};

export function useSupabaseLogger() {
  const [state, setState] = useState<SyncState>(getInitialState);
  const [queue, setQueue] = useState<SyncQueue>(getInitialQueue);
  const { loopHistory, domains, activeDomainId } = useLoopStore();
  
  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      const stateJson = JSON.stringify(state);
      safeSetItem(LOCAL_STORAGE_STATE_KEY, stateJson);
    } catch (e) {
      console.error('Failed to save sync state:', e);
    }
  }, [state]);
  
  // Save queue to localStorage whenever it changes, with size management
  useEffect(() => {
    try {
      const queueJson = JSON.stringify(queue);
      
      // Check if we might be approaching the storage limit
      if (queueJson.length > 2000000) { // ~2MB as a safety threshold
        console.warn('Queue size is large, attempting to trim oldest items');
        
        // Create a trimmed version of the queue with only the most recent items
        const trimmedQueue: SyncQueue = {
          loops: queue.loops.slice(-Math.min(MAX_QUEUE_ITEMS, queue.loops.length)),
          nodes: queue.nodes.slice(-Math.min(MAX_QUEUE_ITEMS, queue.nodes.length)),
          edges: queue.edges.slice(-Math.min(MAX_QUEUE_ITEMS, queue.edges.length)),
          domains: queue.domains // Keep all domains as they're typically small and important
        };
        
        const success = safeSetItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmedQueue));
        if (!success) {
          // If we still can't save, force a sync and then clear the queue
          syncPendingItems().finally(() => {
            setQueue({
              loops: [],
              nodes: [],
              edges: [],
              domains: []
            });
          });
        }
      } else {
        safeSetItem(LOCAL_STORAGE_KEY, queueJson);
      }
    } catch (e) {
      console.error('Failed to save sync queue:', e);
    }
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
  
  // Queue a completed loop for sync, with size management
  const queueLoop = (loop: LoopHistory) => {
    if (!state.isRemoteEnabled) return;
    
    setQueue(prev => {
      // If we're approaching the limit, only keep the most recent items
      const updatedLoops = [...prev.loops, loop];
      if (updatedLoops.length > MAX_QUEUE_ITEMS) {
        console.warn(`Loop queue exceeds ${MAX_QUEUE_ITEMS} items, trimming oldest`);
        return {
          ...prev,
          loops: updatedLoops.slice(-MAX_QUEUE_ITEMS)
        };
      }
      return {
        ...prev,
        loops: updatedLoops
      };
    });
    
    console.log('Loop queued for sync:', loop.id);
  };
  
  // Queue a knowledge node for sync
  const queueNode = (node: KnowledgeNode) => {
    if (!state.isRemoteEnabled) return;
    
    setQueue(prev => {
      const updatedNodes = [...prev.nodes, node];
      if (updatedNodes.length > MAX_QUEUE_ITEMS) {
        return {
          ...prev,
          nodes: updatedNodes.slice(-MAX_QUEUE_ITEMS)
        };
      }
      return {
        ...prev,
        nodes: updatedNodes
      };
    });
    
    console.log('Knowledge node queued for sync:', node.id);
  };
  
  // Queue a knowledge edge for sync
  const queueEdge = (edge: KnowledgeEdge) => {
    if (!state.isRemoteEnabled) return;
    
    setQueue(prev => {
      const updatedEdges = [...prev.edges, edge];
      if (updatedEdges.length > MAX_QUEUE_ITEMS) {
        return {
          ...prev,
          edges: updatedEdges.slice(-MAX_QUEUE_ITEMS)
        };
      }
      return {
        ...prev,
        edges: updatedEdges
      };
    });
    
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
  
  // Auto-sync every 5 minutes if enabled, but only if there are items to sync
  useEffect(() => {
    if (!state.isRemoteEnabled) return;
    
    const intervalId = setInterval(() => {
      const pendingCount = queue.loops.length + queue.nodes.length + queue.edges.length + queue.domains.length;
      if (pendingCount > 0) {
        console.log('Auto-syncing pending items:', pendingCount);
        syncPendingItems().catch(err => {
          console.error('Auto-sync failed:', err);
        });
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(intervalId);
  }, [state.isRemoteEnabled, queue]);
  
  // Queue new loops for syncing if remote logging is enabled, with size limits
  useEffect(() => {
    if (!state.isRemoteEnabled) return;
    
    // Check if there are any loops not in the queue, limiting total size
    const queuedLoopIds = new Set(queue.loops.map(l => l.id));
    const unqueuedLoops = loopHistory
      .filter(l => !queuedLoopIds.has(l.id))
      .slice(-MAX_QUEUE_ITEMS); // Only take the most recent ones if there are too many
    
    if (unqueuedLoops.length > 0) {
      console.log(`Found ${unqueuedLoops.length} unqueued loops, adding to queue`);
      setQueue(prev => {
        const combinedLoops = [...prev.loops, ...unqueuedLoops];
        return {
          ...prev,
          loops: combinedLoops.length > MAX_QUEUE_ITEMS ? 
            combinedLoops.slice(-MAX_QUEUE_ITEMS) : 
            combinedLoops
        };
      });
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
  
  // Force an immediate sync on component mount if there are pending items
  useEffect(() => {
    const pendingCount = queue.loops.length + queue.nodes.length + queue.edges.length + queue.domains.length;
    if (state.isRemoteEnabled && pendingCount > 0) {
      const timer = setTimeout(() => {
        console.log('Initial sync of pending items');
        syncPendingItems().catch(err => {
          console.error('Initial sync failed:', err);
        });
      }, 2000); // Wait 2 seconds after mount before syncing
      
      return () => clearTimeout(timer);
    }
  }, []); // Empty dependency array ensures this runs once on mount
  
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
