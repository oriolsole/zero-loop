
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FormDescription } from "@/components/ui/form";
import { Database, CloudSun, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { isSupabaseConfigured } from '../utils/supabase-client';
import { useSupabaseLogger } from '../hooks/useSupabaseLogger';

interface SupabaseControlProps {
  onToggleRemote: (enabled: boolean) => void;
}

const SupabaseControl: React.FC<SupabaseControlProps> = ({ onToggleRemote }) => {
  const { 
    state, 
    syncPendingItems,
    toggleRemoteLogging,
    pendingItemsCount
  } = useSupabaseLogger();

  const isConfigured = isSupabaseConfigured();
  
  const handleSync = async () => {
    if (!state.isRemoteEnabled) {
      toast.warning("Remote logging is not enabled. Please enable it first.");
      return;
    }
    
    const result = await syncPendingItems();
    if (result) {
      toast.success("Sync completed successfully");
    } else if (pendingItemsCount === 0) {
      toast.info("No pending items to sync");
    }
  };

  const handleToggleRemote = (enabled: boolean) => {
    toggleRemoteLogging(enabled);
    onToggleRemote(enabled);
    
    if (enabled) {
      toast.success("Remote logging enabled");
      if (pendingItemsCount > 0) {
        toast.info(`${pendingItemsCount} items pending sync`);
      }
    } else {
      toast.info("Remote logging disabled, using local storage");
    }
  };
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" /> 
              Supabase Integration
            </CardTitle>
            <CardDescription>
              Configure remote logging and data synchronization
            </CardDescription>
          </div>
          <Badge variant={isConfigured ? "default" : "outline"}>
            {isConfigured ? "Connected to Supabase" : "Not Connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Connection Status */}
          {isConfigured && (
            <div className="bg-secondary/30 p-3 rounded-md text-sm">
              <p className="text-muted-foreground">Your project is connected to Supabase. Any data you generate can be stored in your Supabase tables when remote logging is enabled.</p>
            </div>
          )}
          
          {/* Remote logging toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Remote Logging</Label>
              <FormDescription>
                Save your learning data to Supabase
              </FormDescription>
            </div>
            <Switch 
              checked={state.isRemoteEnabled} 
              onCheckedChange={handleToggleRemote}
              disabled={!isConfigured}
            />
          </div>
          
          {/* Sync controls */}
          <div className="pt-2 flex justify-end">
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={!state.isRemoteEnabled || pendingItemsCount === 0}
              >
                <CloudSun className="w-4 h-4 mr-2" /> 
                Sync ({pendingItemsCount})
              </Button>
              
              <Button
                variant={state.isSyncing ? "secondary" : "default"}
                size="sm"
                disabled={state.isSyncing}
                onClick={handleSync}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${state.isSyncing ? 'animate-spin' : ''}`} /> 
                {state.isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
            </div>
          </div>
          
          {/* Sync stats */}
          {state.lastSyncTime && (
            <div className="pt-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Last synced: {new Date(state.lastSyncTime).toLocaleTimeString()}</span>
                <span>
                  Synced items: {state.syncStats.totalSynced} | 
                  Failed: {state.syncStats.failedSyncs}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SupabaseControl;
