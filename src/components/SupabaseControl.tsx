
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Database, Save, CloudSun, RefreshCw } from 'lucide-react';
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

  const form = useForm({
    defaultValues: {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    }
  });

  const isConfigured = isSupabaseConfigured();
  
  const handleSaveConfig = () => {
    toast.info("Your project is already connected to Supabase!");
    toast.info("Any data you generate will be stored in your Supabase tables.");
  };
  
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
            {isConfigured ? "Configured" : "Not Configured"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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

          {/* Configuration */}
          <Form {...form}>
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="supabaseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supabase URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://your-project.supabase.co" 
                        {...field} 
                        disabled
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="supabaseKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supabase Anon Key</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="your-anon-key" 
                        type="password" 
                        {...field} 
                        disabled
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="pt-2 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleSaveConfig}
                >
                  <Save className="w-4 h-4 mr-2" /> 
                  Config Info
                </Button>
                
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
            </div>
          </Form>
          
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
