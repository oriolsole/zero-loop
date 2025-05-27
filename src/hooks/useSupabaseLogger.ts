import { useState, useEffect, useRef } from 'react';
import { useLoopStore } from '../store/useLoopStore';
import { 
  logLoopToSupabase, 
  saveKnowledgeNodeToSupabase, 
  saveKnowledgeEdgeToSupabase, 
  syncWithSupabase,
  isValidDomainForSync 
} from '../utils/supabase';
import { isSupabaseConfigured } from '../utils/supabase-client';
import { isValidUUID } from '../utils/supabase/helpers';
import { LoopHistory, KnowledgeNode, KnowledgeEdge, Domain } from '../types/intelligence';
import { toast } from '@/components/ui/sonner';

const LOCAL_STORAGE_KEY = 'intelligence-loop-sync-queue';
const LOCAL_STORAGE_STATE_KEY = 'intelligence-loop-sync-state';
const PROCESSED_ITEMS_KEY = 'intelligence-loop-processed-items';
const MAX_QUEUE_ITEMS = 5; // Reduced from 15 to 5
const MAX_DOMAIN_QUEUE_ITEMS = 3; // Separate limit for domains
const TOAST_COOLDOWN_KEY = 'storage-warning-cooldown';
const SYNC_COOLDOWN_MS = 60000; // Cooldown period of 1 minute between sync attempts for same item
const MAX_PROCESSED_ITEMS = 100; // Maximum number of items to track as processed

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
  lastSyncAttempt: number;
}

interface ProcessedItemMap {
  [id: string]: {
    timestamp: number;
    attempts: number;
    type: 'loop' | 'node' | 'edge' | 'domain';
  };
}

// Show rate-limited warnings (max once per hour)
const showStorageWarning = () => {
  const now = Date.now();
  const lastWarning = parseInt(localStorage.getItem(TOAST_COOLDOWN_KEY) || '0', 10);
  
  // Only show warning once per hour
  if (now - lastWarning > 3600000) {
    toast.warning('Local storage quota exceeded. Some data won\'t be saved locally.', {
      id: 'storage-warning', // Use ID to prevent duplicates
      duration: 6000
    });
    try {
      localStorage.setItem(TOAST_COOLDOWN_KEY, now.toString());
    } catch (e) {
      // Ignore if this also fails
    }
  }
};

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
    },
    lastSyncAttempt: 0
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

const getProcessedItems = (): ProcessedItemMap => {
  try {
    const storedItems = localStorage.getItem(PROCESSED_ITEMS_KEY);
    if (storedItems) {
      return JSON.parse(storedItems);
    }
  } catch (e) {
    console.error('Failed to parse processed items:', e);
  }
  
  return {};
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
      // Use rate-limited warning
      showStorageWarning();
      return false;
    }
    throw e; // Re-throw if it's not a quota error
  }
};

// Calculate size of an object in bytes (approximate)
const calculateObjectSize = (obj: any): number => {
  return new TextEncoder().encode(JSON.stringify(obj)).length;
};

// Trim large text fields to reduce storage size
const trimLargeLoopFields = (loop: LoopHistory): LoopHistory => {
  const maxLength = 500; // Reduced from 1000 to 500 characters per field
  
  // Create a shallow copy of the loop
  const trimmedLoop = { ...loop };
  
  // Trim large content fields in steps
  if (trimmedLoop.steps) {
    trimmedLoop.steps = trimmedLoop.steps.map(step => {
      if (step.content && step.content.length > maxLength) {
        return {
          ...step,
          content: step.content.substring(0, maxLength) + '... [trimmed for storage]'
        };
      }
      return step;
    });
  }
  
  // Also trim insights
  if (trimmedLoop.insights && Array.isArray(trimmedLoop.insights)) {
    trimmedLoop.insights = trimmedLoop.insights.map(insight => {
      if (typeof insight === 'object' && insight && 'content' in insight && 
          typeof insight.content === 'string' && insight.content.length > maxLength) {
        return {
          ...insight,
          content: insight.content.substring(0, maxLength) + '... [trimmed]'
        };
      }
      return insight;
    });
  }
  
  return trimmedLoop;
};

// Check if an item should be processed based on cooldown period and previous attempts
const shouldProcessItem = (
  itemId: string, 
  itemType: 'loop' | 'node' | 'edge' | 'domain',
  processedItems: ProcessedItemMap
): boolean => {
  const now = Date.now();
  const itemRecord = processedItems[itemId];
  
  if (!itemRecord) {
    return true; // New item, should process
  }
  
  // If too many attempts or recent attempt, skip
  const attemptCooldown = itemRecord.attempts * SYNC_COOLDOWN_MS; // Progressive backoff
  if (itemRecord.attempts > 5 || (now - itemRecord.timestamp) < attemptCooldown) {
    return false; // Skip processing
  }
  
  return true; // Should process this item
};

// Mark item as processed with current timestamp
const markItemProcessed = (
  itemId: string, 
  itemType: 'loop' | 'node' | 'edge' | 'domain',
  processedItems: ProcessedItemMap
): ProcessedItemMap => {
  const now = Date.now();
  const updatedItems = { ...processedItems };
  
  // Update existing record or create new one
  if (updatedItems[itemId]) {
    updatedItems[itemId] = {
      ...updatedItems[itemId],
      timestamp: now,
      attempts: updatedItems[itemId].attempts + 1
    };
  } else {
    updatedItems[itemId] = {
      timestamp: now,
      attempts: 1,
      type: itemType
    };
  }
  
  // Prune old records if map gets too large
  const itemIds = Object.keys(updatedItems);
  if (itemIds.length > MAX_PROCESSED_ITEMS) {
    // Sort by timestamp (oldest first)
    const sortedIds = itemIds.sort((a, b) => 
      updatedItems[a].timestamp - updatedItems[b].timestamp);
      
    // Remove oldest items to stay under limit
    const itemsToRemove = sortedIds.slice(0, itemIds.length - MAX_PROCESSED_ITEMS);
    itemsToRemove.forEach(id => {
      delete updatedItems[id];
    });
  }
  
  return updatedItems;
};

export function useSupabaseLogger() {
  const [state, setState] = useState<SyncState>(getInitialState);
  const [queue, setQueue] = useState<SyncQueue>(getInitialQueue);
  const [processedItems, setProcessedItems] = useState<ProcessedItemMap>(getProcessedItems);
  const { loopHistory, domains, activeDomainId } = useLoopStore();
  const syncAttemptRef = useRef<number>(0); // Track sync attempts to avoid concurrent syncs
  
  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      const stateJson = JSON.stringify(state);
      safeSetItem(LOCAL_STORAGE_STATE_KEY, stateJson);
    } catch (e) {
      console.error('Failed to save sync state:', e);
    }
  }, [state]);
  
  // Save processed items to localStorage whenever they change
  useEffect(() => {
    try {
      const itemsJson = JSON.stringify(processedItems);
      safeSetItem(PROCESSED_ITEMS_KEY, itemsJson);
    } catch (e) {
      console.error('Failed to save processed items:', e);
    }
  }, [processedItems]);
  
  // Save queue to localStorage whenever it changes, with size management
  useEffect(() => {
    try {
      // First check if we're approaching storage limits before stringifying
      const totalSize = 
        calculateObjectSize(queue.loops) + 
        calculateObjectSize(queue.nodes) + 
        calculateObjectSize(queue.edges) + 
        calculateObjectSize(queue.domains);
      
      console.log(`Sync queue size estimate: ${Math.round(totalSize / 1024)}KB`);
      
      // If we're approaching the 1MB limit (~1,000,000 bytes), trim the queue
      if (totalSize > 700000) { // ~700KB as a safety threshold (reduced from 1MB)
        console.warn('Queue size is large, automatically trimming older items');
        
        // Create a trimmed version of the queue with only the most recent items
        const trimmedQueue: SyncQueue = {
          loops: queue.loops.slice(-Math.min(3, queue.loops.length)),
          nodes: queue.nodes.slice(-Math.min(3, queue.nodes.length)),
          edges: queue.edges.slice(-Math.min(3, queue.edges.length)),
          domains: queue.domains.slice(-Math.min(2, queue.domains.length)) 
        };
        
        setQueue(trimmedQueue);
        
        // Immediate attempt to save the trimmed queue
        const trimmedJson = JSON.stringify(trimmedQueue);
        const success = safeSetItem(LOCAL_STORAGE_KEY, trimmedJson);
        
        if (!success) {
          // If we still can't save, force a sync and then clear
          syncPendingItems().finally(() => {
            setQueue({
              loops: [],
              nodes: [],
              edges: [],
              domains: []
            });
          });
        }
        
        return; // Skip the normal save below since we've already handled it
      }
      
      // Normal case - attempt to save the queue
      const queueJson = JSON.stringify(queue);
      safeSetItem(LOCAL_STORAGE_KEY, queueJson);
      
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
    
    // Skip if this loop was recently processed
    if (!shouldProcessItem(loop.id, 'loop', processedItems)) {
      console.log(`Skipping loop ${loop.id} - recently processed`);
      return;
    }
    
    // Trim large fields before storing
    const trimmedLoop = trimLargeLoopFields(loop);
    
    // Mark as processed with current timestamp
    setProcessedItems(prev => markItemProcessed(loop.id, 'loop', prev));
    
    setQueue(prev => {
      // If we're approaching the limit, only keep the most recent items
      const updatedLoops = [...prev.loops, trimmedLoop];
      if (updatedLoops.length > MAX_QUEUE_ITEMS) {
        console.log(`Loop queue exceeds ${MAX_QUEUE_ITEMS} items, trimming oldest`);
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
    
    // Skip if this node was recently processed
    if (!shouldProcessItem(node.id, 'node', processedItems)) {
      return;
    }
    
    // Mark as processed with current timestamp
    setProcessedItems(prev => markItemProcessed(node.id, 'node', prev));
    
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
    
    // Skip if this edge was recently processed
    if (!shouldProcessItem(edge.id, 'edge', processedItems)) {
      return;
    }
    
    // Mark as processed with current timestamp
    setProcessedItems(prev => markItemProcessed(edge.id, 'edge', prev));
    
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

  // Queue a domain for sync with additional validation
  const queueDomain = (domain: Domain) => {
    if (!state.isRemoteEnabled) return;
    
    // ENHANCED VALIDATION: Check for valid UUID format before queueing
    if (!isValidUUID(domain.id)) {
      console.log(`Skipping invalid domain ID for sync queue: ${domain.id} (${domain.name}). Not a UUID format.`);
      return;
    }
    
    // Skip if this domain was recently processed
    if (!shouldProcessItem(domain.id, 'domain', processedItems)) {
      console.log(`Skipping domain ${domain.id} - recently processed`);
      return;
    }
    
    // Mark as processed with current timestamp
    setProcessedItems(prev => markItemProcessed(domain.id, 'domain', prev));
    
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
      
      // Keep only MAX_DOMAIN_QUEUE_ITEMS domains in the queue
      let updatedDomains = [...prev.domains, domain];
      if (updatedDomains.length > MAX_DOMAIN_QUEUE_ITEMS) {
        updatedDomains = updatedDomains.slice(-MAX_DOMAIN_QUEUE_ITEMS);
      }
      
      // Add the new domain to the queue
      return {
        ...prev,
        domains: updatedDomains
      };
    });
    
    console.log('Domain queued for sync:', domain.id);
  };
  
  // Clear sync queue method
  const clearSyncQueue = async (): Promise<void> => {
    // First try to sync any pending items if remoteEnabled
    if (state.isRemoteEnabled && 
        queue.loops.length + queue.nodes.length + queue.edges.length + queue.domains.length > 0) {
      try {
        await syncPendingItems();
      } catch (error) {
        console.error('Error syncing before queue clear:', error);
      }
    }
    
    // Then clear the queue
    setQueue({
      loops: [],
      nodes: [],
      edges: [],
      domains: []
    });
    
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      console.log('Local storage queue cleared');
    } catch (error) {
      console.error('Error clearing local storage:', error);
    }
    
    return Promise.resolve();
  };
  
  // Clear all tracked data (queue, processed items, AND sync statistics)
  const clearAllTrackedData = async (): Promise<void> => {
    // Clear queue
    setQueue({
      loops: [],
      nodes: [],
      edges: [],
      domains: []
    });
    
    // Clear processed items
    setProcessedItems({});
    
    // Reset sync state to initial values
    setState({
      isRemoteEnabled: state.isRemoteEnabled, // Keep the remote logging setting
      lastSyncTime: null,
      syncStats: {
        totalSynced: 0,
        failedSyncs: 0
      },
      lastSyncAttempt: 0
    });
    
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(PROCESSED_ITEMS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_STATE_KEY); // This is the key fix - also clear sync state
      console.log('All tracking data and sync statistics cleared');
    } catch (error) {
      console.error('Error clearing tracked data:', error);
    }
    
    return Promise.resolve();
  };
  
  // Sync all pending items in the queue
  const syncPendingItems = async (): Promise<boolean> => {
    // Generate a new sync attempt ID
    const currentSyncAttempt = Date.now();
    syncAttemptRef.current = currentSyncAttempt;
    
    // Cooldown check - don't sync too frequently
    const lastAttempt = state.lastSyncAttempt || 0;
    if (Date.now() - lastAttempt < 3000) { // 3-second cooldown between sync attempts
      console.log('Sync cooldown in effect, skipping this attempt');
      return true;
    }
    
    // Update last sync attempt time
    setState(prev => ({
      ...prev,
      lastSyncAttempt: Date.now()
    }));
    
    if (queue.loops.length === 0 && 
        queue.nodes.length === 0 && 
        queue.edges.length === 0 &&
        queue.domains.length === 0) {
      console.log('No items to sync');
      return true;
    }
    
    // To avoid storage issues, limit what we sync at once
    const batchSize = 3; // Reduced from 5 to 3
    const syncDomains = queue.domains.slice(0, 2); // Prioritize domains, up to 2
    const syncLoops = queue.loops.slice(0, batchSize);
    const syncNodes = queue.nodes.slice(0, batchSize);
    const syncEdges = queue.edges.slice(0, batchSize);
    
    try {
      console.log('Starting sync of pending items:', {
        loops: syncLoops.length,
        nodes: syncNodes.length,
        edges: syncEdges.length,
        domains: syncDomains.length
      });
      
      // If this sync attempt is no longer the current one, abort
      if (syncAttemptRef.current !== currentSyncAttempt) {
        console.log('Sync attempt superseded by newer attempt, aborting');
        return false;
      }
      
      const result = await syncWithSupabase(
        syncLoops,
        syncNodes,
        syncEdges,
        syncDomains
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
      
      // If successful, remove synced items from queue
      if (result.success) {
        setQueue(prev => ({
          loops: prev.loops.slice(syncLoops.length),
          nodes: prev.nodes.slice(syncNodes.length),
          edges: prev.edges.slice(syncEdges.length),
          domains: prev.domains.slice(syncDomains.length) 
        }));
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
  
  // Auto-sync every 2 minutes if enabled, but only if there are items to sync
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
    }, 2 * 60 * 1000); // 2 minutes
    
    return () => clearInterval(intervalId);
  }, [state.isRemoteEnabled, queue]);
  
  // Queue domains for syncing if remote logging is enabled - MODIFIED to filter invalid domains
  useEffect(() => {
    if (!state.isRemoteEnabled) return;
    
    // Only check once when enabled
    const queuedDomainIds = new Set(queue.domains.map(d => d.id));
    
    // Filter out domains with invalid IDs before counting/queueing
    const validDomains = domains.filter(d => isValidUUID(d.id));
    const unqueuedDomainsCount = validDomains.filter(d => !queuedDomainIds.has(d.id)).length;
    
    if (unqueuedDomainsCount > 0) {
      console.log(`Found ${unqueuedDomainsCount} unqueued valid domains`);
      // We don't sync all domains at once to avoid excessive rerendering
      const domainsToSync = validDomains
        .filter(d => !queuedDomainIds.has(d.id))
        .slice(0, 2);
      
      if (domainsToSync.length > 0) {
        domainsToSync.forEach(domain => {
          queueDomain(domain);
        });
      }
    }
  }, [state.isRemoteEnabled, domains.length]); // Only depend on the length to reduce renders
  
  // Force sync on component mount if storage is likely to be full - MODIFIED to be less aggressive
  useEffect(() => {
    const pendingCount = queue.loops.length + queue.nodes.length + queue.edges.length + queue.domains.length;
    if (state.isRemoteEnabled && pendingCount > 10) { // Only trigger if many pending items
      // Normal sync with slight delay
      const timer = setTimeout(() => {
        console.log('Initial sync of pending items');
        syncPendingItems().catch(err => {
          console.error('Initial sync failed:', err);
        });
      }, 5000); // Wait 5 seconds after mount before syncing (up from 2s)
      
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
    clearSyncQueue,
    clearAllTrackedData,
    pendingItemsCount: queue.loops.length + queue.nodes.length + queue.edges.length + queue.domains.length
  };
}
