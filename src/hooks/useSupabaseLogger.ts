import { useState, useCallback, useEffect } from 'react';
import { supabase, isSupabaseConfigured, handleSupabaseError } from '../utils/supabase-client';
import { LoopHistory, KnowledgeNode, KnowledgeEdge } from '../types/intelligence';
import { logLoopToSupabase, saveKnowledgeNodeToSupabase, saveKnowledgeEdgeToSupabase } from '../utils/supabaseUtils';
import { toast } from '@/components/ui/sonner';

interface SupabaseLoggerOptions {
  autoSync?: boolean;
  useLocalStorageFallback?: boolean;
  debug?: boolean;
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
    useLocalStorageFallback = true,
    debug = true // Enable debug by default for now to help troubleshoot
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

  // Log connection status on start
  useEffect(() => {
    if (debug) {
      console.log(`[SupabaseLogger] Initialized with remote enabled: ${state.isRemoteEnabled}`);
      console.log(`[SupabaseLogger] Supabase configured: ${isSupabaseConfigured()}`);
      
      // Check pending items count
      const pendingLoops = getPendingItems(PENDING_LOOPS_KEY);
      const pendingNodes = getPendingItems(PENDING_NODES_KEY);
      const pendingEdges = getPendingItems(PENDING_EDGES_KEY);
      
      console.log(`[SupabaseLogger] Pending items: loops=${pendingLoops.length}, nodes=${pendingNodes.length}, edges=${pendingEdges.length}`);
    }
  }, []);

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
      
      if (debug) {
        console.log(`[SupabaseLogger] Added item to ${key}:`, item);
      }
      
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
  }, [useLocalStorageFallback, getPendingItems, debug]);

  // Helper to clear processed items from local storage
  const clearProcessedItems = useCallback(<T>(key: string, processedIds: string[]): void => {
    if (!useLocalStorageFallback) return;
    try {
      const items = getPendingItems<any>(key);
      const filtered = items.filter(item => !processedIds.includes(item.id));
      localStorage.setItem(key, JSON.stringify(filtered));
      
      if (debug && processedIds.length > 0) {
        console.log(`[SupabaseLogger] Cleared ${processedIds.length} processed items from ${key}`);
      }
    } catch (error) {
      console.error(`Error clearing processed ${key}:`, error);
    }
  }, [useLocalStorageFallback, getPendingItems, debug]);

  // Log a learning loop
  const logLoop = useCallback(async (loop: LoopHistory): Promise<boolean> => {
    if (debug) {
      console.log('[SupabaseLogger] Attempting to log loop:', loop);
    }
    
    // If remote logging is enabled, try to log directly
    if (state.isRemoteEnabled) {
      try {
        const success = await logLoopToSupabase(loop);
        if (success) {
          if (debug) console.log('[SupabaseLogger] Loop saved successfully to Supabase');
          setState(prev => ({
            ...prev,
            syncStats: {
              ...prev.syncStats,
              totalSynced: prev.syncStats.totalSynced + 1
            }
          }));
          return true;
        }
        
        if (debug) console.log('[SupabaseLogger] Failed to save loop to Supabase, falling back to local storage');
        
        // If direct logging fails, fall back to local storage
        if (useLocalStorageFallback) {
          addPendingItem(PENDING_LOOPS_KEY, loop);
          return false;
        }
      } catch (error) {
        console.error('[SupabaseLogger] Error saving loop:', error);
        handleSupabaseError(error, 'Failed to log learning loop');
        if (useLocalStorageFallback) {
          addPendingItem(PENDING_LOOPS_KEY, loop);
        }
        return false;
      }
    } else if (useLocalStorageFallback) {
      // If remote is disabled, store in local storage if fallback is enabled
      if (debug) console.log('[SupabaseLogger] Remote disabled, saving loop to local storage');
      addPendingItem(PENDING_LOOPS_KEY, loop);
      return true;
    }
    
    return false;
  }, [state.isRemoteEnabled, useLocalStorageFallback, addPendingItem, debug]);

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
      if (debug) console.log(`[SupabaseLogger] Sync skipped: remoteEnabled=${state.isRemoteEnabled}, isSyncing=${state.isSyncing}`);
      return false;
    }

    if (debug) console.log('[SupabaseLogger] Starting sync of pending items');
    
    setState(prev => ({ ...prev, isSyncing: true }));
    let successCount = 0;
    let failCount = 0;

    try {
      // Sync pending loops
      const pendingLoops = getPendingItems<LoopHistory>(PENDING_LOOPS_KEY);
      const processedLoopIds: string[] = [];
      
      if (debug) console.log(`[SupabaseLogger] Found ${pendingLoops.length} pending loops to sync`);
      
      for (const loop of pendingLoops) {
        try {
          if (debug) console.log(`[SupabaseLogger] Syncing loop ${loop.id}`);
          const success = await logLoopToSupabase(loop);
          if (success) {
            processedLoopIds.push(loop.id);
            successCount++;
            if (debug) console.log(`[SupabaseLogger] Successfully synced loop ${loop.id}`);
          } else {
            failCount++;
            if (debug) console.log(`[SupabaseLogger] Failed to sync loop ${loop.id}`);
          }
        } catch (error) {
          console.error(`[SupabaseLogger] Error syncing loop ${loop.id}:`, error);
          failCount++;
        }
      }
      
      clearProcessedItems(PENDING_LOOPS_KEY, processedLoopIds);

      // Sync pending nodes
      const pendingNodes = getPendingItems<KnowledgeNode>(PENDING_NODES_KEY);
      const processedNodeIds: string[] = [];
      
      if (debug) console.log(`[SupabaseLogger] Found ${pendingNodes.length} pending nodes to sync`);
      
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
      
      if (debug) console.log(`[SupabaseLogger] Found ${pendingEdges.length} pending edges to sync`);
      
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
        if (debug) console.log(`[SupabaseLogger] Sync completed: ${successCount} succeeded, ${failCount} failed`);
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
      if (debug) console.log('[SupabaseLogger] Sync failed with exception:', error);
      return false;
    }
  }, [
    state.isRemoteEnabled, 
    state.isSyncing, 
    getPendingItems, 
    clearProcessedItems,
    debug
  ]);

  // Toggle remote logging on/off
  const toggleRemoteLogging = useCallback((enabled: boolean): void => {
    if (debug) console.log(`[SupabaseLogger] Toggling remote logging to ${enabled}`);
    setState(prev => ({ ...prev, isRemoteEnabled: enabled }));
    
    if (enabled && autoSync) {
      if (debug) console.log('[SupabaseLogger] Remote enabled, auto-syncing pending items');
      syncPendingItems();
    }
  }, [autoSync, syncPendingItems, debug]);

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
