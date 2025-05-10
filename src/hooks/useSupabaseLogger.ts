
import { useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured, handleSupabaseError } from '../utils/supabase-client';
import { LoopHistory, KnowledgeNode, KnowledgeEdge } from '../types/intelligence';
import { logLoopToSupabase, saveKnowledgeNodeToSupabase, saveKnowledgeEdgeToSupabase } from '../utils/supabaseUtils';
import { toast } from '@/components/ui/sonner';

interface SupabaseLoggerOptions {
  autoSync?: boolean;
  useLocalStorageFallback?: boolean;
}

interface SupabaseLoggerState {
  isRemoteEnabled: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncStats: {
    totalSynced: number;
    failedSyncs: number;
    pendingItems: number;
  };
}

export const useSupabaseLogger = (options: SupabaseLoggerOptions = {}) => {
  const { 
    autoSync = true, 
    useLocalStorageFallback = true
  } = options;

  const [state, setState] = useState<SupabaseLoggerState>({
    isRemoteEnabled: isSupabaseConfigured(),
    isSyncing: false,
    lastSyncTime: null,
    syncStats: {
      totalSynced: 0,
      failedSyncs: 0,
      pendingItems: 0
    }
  });

  // Local storage key prefixes
  const PENDING_LOOPS_KEY = 'zeroloop_pending_loops';
  const PENDING_NODES_KEY = 'zeroloop_pending_nodes';
  const PENDING_EDGES_KEY = 'zeroloop_pending_edges';

  // Helper to get pending items from local storage
  const getPendingItems = useCallback(<T>(key: string): T[] => {
    if (!useLocalStorageFallback) return [];
    try {
      const items = localStorage.getItem(key);
      return items ? JSON.parse(items) : [];
    } catch (error) {
      console.error(`Error getting pending ${key}:`, error);
      return [];
    }
  }, [useLocalStorageFallback]);

  // Helper to add pending item to local storage
  const addPendingItem = useCallback(<T>(key: string, item: T): void => {
    if (!useLocalStorageFallback) return;
    try {
      const items = getPendingItems<T>(key);
      items.push(item);
      localStorage.setItem(key, JSON.stringify(items));
      
      setState(prev => ({
        ...prev,
        syncStats: {
          ...prev.syncStats,
          pendingItems: prev.syncStats.pendingItems + 1
        }
      }));
    } catch (error) {
      console.error(`Error adding pending ${key}:`, error);
    }
  }, [useLocalStorageFallback, getPendingItems]);

  // Helper to clear processed items from local storage
  const clearProcessedItems = useCallback(<T>(key: string, processedIds: string[]): void => {
    if (!useLocalStorageFallback) return;
    try {
      const items = getPendingItems<any>(key);
      const filtered = items.filter(item => !processedIds.includes(item.id));
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (error) {
      console.error(`Error clearing processed ${key}:`, error);
    }
  }, [useLocalStorageFallback, getPendingItems]);

  // Log a learning loop
  const logLoop = useCallback(async (loop: LoopHistory): Promise<boolean> => {
    // If remote logging is enabled, try to log directly
    if (state.isRemoteEnabled) {
      try {
        const success = await logLoopToSupabase(loop);
        if (success) {
          setState(prev => ({
            ...prev,
            syncStats: {
              ...prev.syncStats,
              totalSynced: prev.syncStats.totalSynced + 1
            }
          }));
          return true;
        }
        // If direct logging fails, fall back to local storage
        if (useLocalStorageFallback) {
          addPendingItem(PENDING_LOOPS_KEY, loop);
          return false;
        }
      } catch (error) {
        handleSupabaseError(error, 'Failed to log learning loop');
        if (useLocalStorageFallback) {
          addPendingItem(PENDING_LOOPS_KEY, loop);
        }
        return false;
      }
    } else if (useLocalStorageFallback) {
      // If remote is disabled, store in local storage if fallback is enabled
      addPendingItem(PENDING_LOOPS_KEY, loop);
      return true;
    }
    
    return false;
  }, [state.isRemoteEnabled, useLocalStorageFallback, addPendingItem]);

  // Log a knowledge node
  const logKnowledgeNode = useCallback(async (node: KnowledgeNode): Promise<boolean> => {
    if (state.isRemoteEnabled) {
      try {
        const success = await saveKnowledgeNodeToSupabase(node);
        if (success) {
          setState(prev => ({
            ...prev,
            syncStats: {
              ...prev.syncStats,
              totalSynced: prev.syncStats.totalSynced + 1
            }
          }));
          return true;
        }
        if (useLocalStorageFallback) {
          addPendingItem(PENDING_NODES_KEY, node);
          return false;
        }
      } catch (error) {
        handleSupabaseError(error, 'Failed to log knowledge node');
        if (useLocalStorageFallback) {
          addPendingItem(PENDING_NODES_KEY, node);
        }
        return false;
      }
    } else if (useLocalStorageFallback) {
      addPendingItem(PENDING_NODES_KEY, node);
      return true;
    }
    
    return false;
  }, [state.isRemoteEnabled, useLocalStorageFallback, addPendingItem]);

  // Log a knowledge edge
  const logKnowledgeEdge = useCallback(async (edge: KnowledgeEdge): Promise<boolean> => {
    if (state.isRemoteEnabled) {
      try {
        const success = await saveKnowledgeEdgeToSupabase(edge);
        if (success) {
          setState(prev => ({
            ...prev,
            syncStats: {
              ...prev.syncStats,
              totalSynced: prev.syncStats.totalSynced + 1
            }
          }));
          return true;
        }
        if (useLocalStorageFallback) {
          addPendingItem(PENDING_EDGES_KEY, edge);
          return false;
        }
      } catch (error) {
        handleSupabaseError(error, 'Failed to log knowledge edge');
        if (useLocalStorageFallback) {
          addPendingItem(PENDING_EDGES_KEY, edge);
        }
        return false;
      }
    } else if (useLocalStorageFallback) {
      addPendingItem(PENDING_EDGES_KEY, edge);
      return true;
    }
    
    return false;
  }, [state.isRemoteEnabled, useLocalStorageFallback, addPendingItem]);

  // Sync pending items to Supabase
  const syncPendingItems = useCallback(async (): Promise<boolean> => {
    if (!state.isRemoteEnabled || state.isSyncing) {
      return false;
    }

    setState(prev => ({ ...prev, isSyncing: true }));
    let successCount = 0;
    let failCount = 0;

    try {
      // Sync pending loops
      const pendingLoops = getPendingItems<LoopHistory>(PENDING_LOOPS_KEY);
      const processedLoopIds: string[] = [];
      
      for (const loop of pendingLoops) {
        try {
          const success = await logLoopToSupabase(loop);
          if (success) {
            processedLoopIds.push(loop.id);
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error('Error syncing loop:', error);
          failCount++;
        }
      }
      
      clearProcessedItems(PENDING_LOOPS_KEY, processedLoopIds);

      // Sync pending nodes
      const pendingNodes = getPendingItems<KnowledgeNode>(PENDING_NODES_KEY);
      const processedNodeIds: string[] = [];
      
      for (const node of pendingNodes) {
        try {
          const success = await saveKnowledgeNodeToSupabase(node);
          if (success) {
            processedNodeIds.push(node.id);
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error('Error syncing node:', error);
          failCount++;
        }
      }
      
      clearProcessedItems(PENDING_NODES_KEY, processedNodeIds);

      // Sync pending edges
      const pendingEdges = getPendingItems<KnowledgeEdge>(PENDING_EDGES_KEY);
      const processedEdgeIds: string[] = [];
      
      for (const edge of pendingEdges) {
        try {
          const success = await saveKnowledgeEdgeToSupabase(edge);
          if (success) {
            processedEdgeIds.push(edge.id);
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error('Error syncing edge:', error);
          failCount++;
        }
      }
      
      clearProcessedItems(PENDING_EDGES_KEY, processedEdgeIds);

      // Update sync stats
      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now(),
        syncStats: {
          ...prev.syncStats,
          totalSynced: prev.syncStats.totalSynced + successCount,
          failedSyncs: prev.syncStats.failedSyncs + failCount,
          pendingItems: 
            getPendingItems(PENDING_LOOPS_KEY).length +
            getPendingItems(PENDING_NODES_KEY).length +
            getPendingItems(PENDING_EDGES_KEY).length
        }
      }));

      if (successCount > 0) {
        toast.success(`Synced ${successCount} items to Supabase`);
      }
      
      return successCount > 0 && failCount === 0;
    } catch (error) {
      console.error('Error during sync:', error);
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncStats: {
          ...prev.syncStats,
          failedSyncs: prev.syncStats.failedSyncs + 1
        }
      }));
      toast.error('Sync failed');
      return false;
    }
  }, [
    state.isRemoteEnabled, 
    state.isSyncing, 
    getPendingItems, 
    clearProcessedItems
  ]);

  // Toggle remote logging on/off
  const toggleRemoteLogging = useCallback((enabled: boolean): void => {
    setState(prev => ({ ...prev, isRemoteEnabled: enabled }));
    
    if (enabled && autoSync) {
      syncPendingItems();
    }
  }, [autoSync, syncPendingItems]);

  return {
    state,
    logLoop,
    logKnowledgeNode,
    logKnowledgeEdge,
    syncPendingItems,
    toggleRemoteLogging,
    pendingItemsCount: 
      getPendingItems(PENDING_LOOPS_KEY).length +
      getPendingItems(PENDING_NODES_KEY).length +
      getPendingItems(PENDING_EDGES_KEY).length
  };
};
