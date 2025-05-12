
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader, Database, Upload, AlertCircle, CheckCircle, Info, Trash2, RefreshCw } from 'lucide-react';
import { useLoopStore } from "../store/useLoopStore";
import { useSupabaseLogger } from "../hooks/useSupabaseLogger";
import { isSupabaseConfigured } from "../utils/supabase-client";
import { toast } from '@/components/ui/sonner';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SupabaseControl = () => {
  const { useRemoteLogging, setUseRemoteLogging, initializeFromSupabase, domains } = useLoopStore();
  const { 
    state, 
    toggleRemoteLogging, 
    syncPendingItems, 
    pendingItemsCount, 
    queueDomain, 
    clearSyncQueue,
    clearAllTrackedData
  } = useSupabaseLogger();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'warning' | 'error' | null>(null);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  useEffect(() => {
    // Check if Supabase is configured
    setIsConfigured(isSupabaseConfigured());
  }, []);

  const handleToggleRemoteLogging = async (checked: boolean) => {
    // First update the store setting
    setUseRemoteLogging(checked);
    
    // Then toggle the logger
    toggleRemoteLogging(checked);
    
    // If turning on, initialize from Supabase
    if (checked) {
      try {
        await initializeFromSupabase();
        
        // Queue a subset of domains for syncing to avoid overloading
        if (domains && domains.length > 0) {
          console.log(`Queueing domains for initial sync (limited to 2)`);
          // Only queue up to 2 domains to prevent overwhelming the system
          domains.slice(0, 2).forEach(domain => {
            queueDomain(domain);
          });
        }
      } catch (err) {
        console.error("Error initializing from Supabase:", err);
        toast.error("Failed to initialize from Supabase");
      }
    }
    
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
        setLastSyncStatus('success');
      } else {
        console.log("Sync completed with some failures");
        toast.warning('Sync completed with some failures');
        setLastSyncStatus('warning');
      }
    } catch (error) {
      console.error('Error during sync:', error);
      toast.error('Sync failed');
      setLastSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearStorage = async () => {
    try {
      await clearSyncQueue();
      toast.success('Local storage queue cleared successfully');
      setIsClearDialogOpen(false);
    } catch (error) {
      console.error('Error clearing storage:', error);
      toast.error('Failed to clear local storage queue');
    }
  };

  const handleResetAllData = async () => {
    try {
      await clearAllTrackedData();
      toast.success('All sync data has been reset');
      setIsResetDialogOpen(false);
    } catch (error) {
      console.error('Error resetting all data:', error);
      toast.error('Failed to reset sync data');
    }
  };

  return (
    <div className="space-y-4">
      {!state.isRemoteEnabled && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Remote Logging Disabled</AlertTitle>
          <AlertDescription>
            Enable Remote Logging to sync your data with Supabase
          </AlertDescription>
        </Alert>
      )}
      
      {lastSyncStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sync Failed</AlertTitle>
          <AlertDescription>
            The last sync attempt failed. Check console for details.
          </AlertDescription>
        </Alert>
      )}
    
      <Card className="border-dashed bg-secondary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center gap-2">
            <Database className="w-5 h-5" />
            Supabase Integration
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
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
                <Badge variant={pendingItemsCount > 0 ? "secondary" : "outline"}>
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
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last sync status:</span>
                <span>
                  {lastSyncStatus === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {lastSyncStatus === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                  {lastSyncStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {!lastSyncStatus && <span className="text-muted-foreground">No sync yet</span>}
                </span>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              {isConfigured && (
                <Button 
                  onClick={handleSyncNow} 
                  disabled={isSyncing || !state.isRemoteEnabled || pendingItemsCount === 0}
                  variant={pendingItemsCount > 0 ? "default" : "outline"}
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
                      Sync Now {pendingItemsCount > 0 ? `(${pendingItemsCount})` : ''}
                    </>
                  )}
                </Button>
              )}
              
              <Button 
                onClick={() => setIsClearDialogOpen(true)} 
                variant="outline" 
                className="w-full border-dashed"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Local Storage Queue
              </Button>
              
              <Button 
                onClick={() => setIsResetDialogOpen(true)} 
                variant="outline" 
                className="w-full border-dashed border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset All Sync Data
              </Button>
            </div>

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
      
      {/* Confirmation dialog for clearing storage */}
      <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all pending items from the local storage queue. If you haven't synced your data to Supabase yet, 
              these items will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearStorage} className="bg-red-500 hover:bg-red-600">
              Yes, clear storage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Confirmation dialog for resetting all data */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Sync Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all pending items AND reset the processed items tracking system.
              This is useful if you're experiencing sync issues or queue warnings.
              Any unsynced data will be permanently lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAllData} className="bg-red-500 hover:bg-red-600">
              Yes, reset all data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SupabaseControl;
