
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader, Database, Upload, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useLoopStore } from "../store/useLoopStore";
import { useSupabaseLogger } from "../hooks/useSupabaseLogger";
import { isSupabaseConfigured } from "../utils/supabase-client";
import { toast } from '@/components/ui/sonner';

const SupabaseControl = () => {
  const { useRemoteLogging, setUseRemoteLogging } = useLoopStore();
  const { state, toggleRemoteLogging, syncPendingItems, pendingItemsCount } = useSupabaseLogger();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if Supabase is configured
    setIsConfigured(isSupabaseConfigured());
  }, []);

  const handleToggleRemoteLogging = (checked: boolean) => {
    setUseRemoteLogging(checked);
    toggleRemoteLogging(checked);
    
    toast[checked ? 'success' : 'info'](
      checked ? 'Remote logging enabled' : 'Remote logging disabled'
    );
  };

  const handleSyncNow = async () => {
    if (!isConfigured) {
      toast.error('Supabase is not configured');
      return;
    }

    setIsSyncing(true);
    try {
      const success = await syncPendingItems();
      if (success) {
        console.log("Sync completed successfully");
        toast.success('Sync completed successfully');
      } else {
        console.log("Sync completed with some failures");
        toast.warning('Sync completed with some failures');
      }
    } catch (error) {
      console.error('Error during sync:', error);
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="border-dashed bg-secondary/10">
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-primary" />
              <Label htmlFor="remote-logging" className="font-medium">
                Remote Logging
              </Label>
              {!isConfigured && (
                <Badge variant="outline" className="text-red-500 border-red-300 bg-red-50">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not Configured
                </Badge>
              )}
            </div>
            <Switch
              id="remote-logging"
              checked={useRemoteLogging}
              onCheckedChange={handleToggleRemoteLogging}
              disabled={!isConfigured}
            />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={state.isRemoteEnabled ? "default" : "outline"}>
                {state.isRemoteEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending items:</span>
              <Badge variant={pendingItemsCount > 0 ? "warning" : "outline"}>
                {pendingItemsCount}
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last sync:</span>
              <span className="font-mono">
                {state.lastSyncTime ? new Date(state.lastSyncTime).toLocaleTimeString() : 'Never'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total synced:</span>
              <span>{state.syncStats.totalSynced}</span>
            </div>
          </div>

          {isConfigured && (
            <Button 
              onClick={handleSyncNow} 
              disabled={isSyncing || !state.isRemoteEnabled || pendingItemsCount === 0}
              variant="outline" 
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          )}

          <div className="text-xs text-muted-foreground rounded-md p-2 bg-secondary/30">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {isConfigured ? (
                  <>
                    Remote logging sends intelligence loop data to Supabase for persistence and analysis.
                    {pendingItemsCount > 0 && state.isRemoteEnabled && (
                      <span className="block mt-1 font-medium">
                        {pendingItemsCount} item(s) waiting to be synced.
                      </span>
                    )}
                  </>
                ) : (
                  "Supabase integration needs to be configured to enable remote logging."
                )}
              </span>
            </div>

            {state.syncStats.failedSyncs > 0 && (
              <div className="flex items-start gap-2 mt-2 text-warning-foreground">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>
                  {state.syncStats.failedSyncs} sync attempt(s) failed. Check console for details.
                </span>
              </div>
            )}
            
            {state.syncStats.totalSynced > 0 && (
              <div className="flex items-start gap-2 mt-2 text-success-foreground">
                <CheckCircle className="w-4 h-4 mt-0.5" />
                <span>
                  {state.syncStats.totalSynced} item(s) successfully synced.
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupabaseControl;
