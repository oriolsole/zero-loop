
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from '@/components/ui/sonner';
import { 
  fetchLocalModels,
  isLocalUrl,
  getLocalModelSettings,
  saveLocalModelSettings 
} from '@/services/localModelService';
import { InfoBox } from '@/components/ui/info-box';

interface Model {
  id: string;
  created?: number;
  object: string;
  owned_by?: string;
}

const ModelSettingsForm = () => {
  const [isLocalModel, setIsLocalModel] = useState(false);
  const [localModelUrl, setLocalModelUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Fetch current settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        // First check local storage
        const localSettings = getLocalModelSettings();
        
        if (localSettings.localModelUrl) {
          setIsLocalModel(true);
          setLocalModelUrl(localSettings.localModelUrl);
          
          if (localSettings.selectedModel) {
            setSelectedModel(localSettings.selectedModel);
          }
          
          // Try to fetch available models if we have a URL
          await fetchModelsFromUrl(localSettings.localModelUrl);
        } else {
          // Default values
          setIsLocalModel(false);
          setLocalModelUrl('http://localhost:1234');
        }
      } catch (error) {
        console.error('Error loading model settings:', error);
        setError('Failed to load saved settings');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  // Function to fetch available models from LM Studio
  const fetchModelsFromUrl = async (url: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching models from URL:', url);
      
      // Check if this is a localhost URL
      if (isLocalUrl(url)) {
        setError('Local URLs (localhost) cannot be accessed by edge functions. Use a tunneling service like ngrok to make your local model available.');
        return;
      }
      
      // Try to fetch directly
      const modelResponse = await fetchLocalModels(url);
      
      if (!modelResponse) {
        setError('Could not connect to model server');
        return;
      }
      
      if (modelResponse.data && Array.isArray(modelResponse.data)) {
        setAvailableModels(modelResponse.data);
        
        // Select first model if we don't have one already
        if (!selectedModel && modelResponse.data.length > 0) {
          setSelectedModel(modelResponse.data[0].id);
        }
      } else {
        setError('No models returned from server');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setError(`Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle toggling local model on/off
  const handleToggleLocalModel = (checked: boolean) => {
    setIsLocalModel(checked);
    
    // If turning on local model, fetch available models
    if (checked && localModelUrl && !isLocalUrl(localModelUrl)) {
      fetchModelsFromUrl(localModelUrl);
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
      // Save settings locally first
      saveLocalModelSettings({
        localModelUrl: isLocalModel ? localModelUrl : null,
        selectedModel: isLocalModel ? selectedModel : null
      });
      
      toast.success(`Model settings updated: ${isLocalModel ? 'Using local model' : 'Using OpenAI'}`);
      
      if (isLocalModel) {
        toast.info(`Local model URL: ${localModelUrl}`);
        toast.info(`Selected model: ${selectedModel || 'None'}`);
      }
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
      fetchModelsFromUrl(localModelUrl);
    }
  };
  
  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              <InfoBox 
                title="Local LLM Access"
                className="my-4"
              >
                For local models to work with Edge Functions, you need a public URL.
                Use ngrok (ngrok http 1234) to expose your local LM Studio server,
                then enter the public ngrok URL here.
              </InfoBox>
              
              <div className="space-y-2">
                <Label htmlFor="model-url">Local Model URL</Label>
                <Input
                  id="model-url"
                  placeholder="https://your-ngrok-url.ngrok.io"
                  value={localModelUrl}
                  onChange={handleUrlChange}
                />
                <p className="text-xs text-muted-foreground">
                  The base URL of your LM Studio server (without /v1 path)
                </p>
              </div>
              
              {error && (
                <div className="bg-destructive/10 p-4 rounded-md flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="model-select">Available Models</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleRefreshModels}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                </div>
                
                {isLoading ? (
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
                  <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm">
                    <p className="font-medium">No models found.</p>
                    <p className="mt-1">
                      Make sure your model server is running and accessible. For local development,
                      use a tunneling tool like ngrok to expose your server publicly.
                    </p>
                  </div>
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
        </>
      )}
    </div>
  );
};

export default ModelSettingsForm;
