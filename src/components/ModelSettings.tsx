
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BrainCircuit, Cloud, AlertTriangle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

interface Model {
  id: string;
  created: number;
  object: string;
  owned_by?: string;
}

const ModelSettings = () => {
  const [isLocalModel, setIsLocalModel] = useState(false);
  const [localModelUrl, setLocalModelUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Fetch current settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check if LOCAL_MODEL_URL is configured
        const { data, error } = await supabase.functions.invoke('ai-model-proxy', {
          body: { operation: 'getSettings' }
        });
        
        if (error) {
          console.error('Error fetching model settings:', error);
          setError('Failed to load model settings. Check console for details.');
          return;
        }
        
        if (data) {
          const hasLocalUrl = !!data.localModelUrl;
          setIsLocalModel(hasLocalUrl);
          setLocalModelUrl(data.localModelUrl || 'http://localhost:1234/v1');
          
          // If using local model, also fetch available models
          if (hasLocalUrl) {
            await fetchAvailableModels(data.localModelUrl);
          }
        }
      } catch (error) {
        console.error('Error fetching model settings:', error);
        setError('Failed to load model settings. Check console for details.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  // Function to fetch available models from LM Studio
  const fetchAvailableModels = async (url: string) => {
    try {
      setIsLoadingModels(true);
      
      const { data, error } = await supabase.functions.invoke('ai-model-proxy', {
        body: { operation: 'getAvailableModels', localUrl: url }
      });
      
      if (error) {
        console.error('Error fetching available models:', error);
        toast.error('Failed to fetch available models');
        return;
      }
      
      if (data && data.models) {
        setAvailableModels(data.models);
        
        // If we have models, select the first one
        if (data.models.length > 0) {
          setSelectedModel(data.models[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching available models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  };
  
  // Handle toggling local model on/off
  const handleToggleLocalModel = (checked: boolean) => {
    setIsLocalModel(checked);
    
    // If turning on local model, fetch available models
    if (checked && localModelUrl) {
      fetchAvailableModels(localModelUrl);
    }
  };
  
  // Handle URL changes
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalModelUrl(e.target.value);
  };
  
  // Handle saving settings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // If local model is disabled, clear the URL
      const urlToSave = isLocalModel ? localModelUrl : null;
      
      // In a real implementation, you would update the LOCAL_MODEL_URL
      // in Supabase Edge Function Secret, but this requires admin access
      toast.success(`Model settings updated: ${isLocalModel ? 'Using local model' : 'Using OpenAI'}`);
      
      if (isLocalModel) {
        toast.info(`Local model URL: ${localModelUrl}`);
      }
      
      // Inform users about actually changing the environment variable
      toast.info('Note: To actually change the model, update the LOCAL_MODEL_URL in Supabase Edge Function Secrets');
    } catch (error) {
      console.error('Error saving model settings:', error);
      toast.error('Failed to save model settings');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle refreshing model list
  const handleRefreshModels = () => {
    if (localModelUrl) {
      fetchAvailableModels(localModelUrl);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5" />
          AI Model Settings
        </CardTitle>
        <CardDescription>
          Configure which AI model ZeroLoop uses for reasoning
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 p-4 rounded-md flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="local-model">Use Local Model</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle to use a local LM Studio model instead of OpenAI
                </p>
              </div>
              <Switch
                id="local-model"
                checked={isLocalModel}
                onCheckedChange={handleToggleLocalModel}
              />
            </div>
            
            {isLocalModel && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="model-url">Local Model URL</Label>
                  <Input
                    id="model-url"
                    placeholder="http://localhost:1234/v1"
                    value={localModelUrl}
                    onChange={handleUrlChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    The base URL of your LM Studio server's OpenAI-compatible API
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="model-select">Available Models</Label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleRefreshModels}
                      disabled={isLoadingModels}
                    >
                      {isLoadingModels ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Refresh'
                      )}
                    </Button>
                  </div>
                  
                  {isLoadingModels ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                      <span className="text-sm text-muted-foreground">Loading models...</span>
                    </div>
                  ) : availableModels.length > 0 ? (
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>{model.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      No models found. Make sure LM Studio is running and the URL is correct.
                    </p>
                  )}
                </div>
              </>
            )}
            
            <div className="flex justify-end pt-2">
              <Button 
                onClick={handleSaveSettings}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </div>
            
            <div className="bg-muted rounded-md p-3 mt-4">
              <h4 className="text-sm font-medium flex items-center">
                <Cloud className="h-4 w-4 mr-2 text-blue-500" />
                Current Model:
              </h4>
              <p className="text-sm mt-1">
                {isLocalModel ? (
                  <>Using local model at <code className="bg-muted-foreground/20 px-1 rounded">{localModelUrl}</code></>
                ) : (
                  <>Using OpenAI API</>
                )}
              </p>
              {isLocalModel && selectedModel && (
                <p className="text-sm mt-1">
                  Selected model: <code className="bg-muted-foreground/20 px-1 rounded">{selectedModel}</code>
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ModelSettings;
