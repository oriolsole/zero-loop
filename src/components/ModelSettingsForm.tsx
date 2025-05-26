import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, Cloud, HardDrive, Zap } from "lucide-react";
import { toast } from '@/components/ui/sonner';
import { InfoBox } from '@/components/ui/info-box';
import { 
  ModelProvider, 
  ModelSettings, 
  getModelSettings, 
  saveModelSettings,
  getNpawModels,
  getOpenAIModels,
  isLocalUrl
} from '@/services/modelProviderService';
import { fetchLocalModels } from '@/services/localModelService';

interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
}

const ModelSettingsForm = () => {
  const [settings, setSettings] = useState<ModelSettings>({ provider: 'openai' });
  const [localModelUrl, setLocalModelUrl] = useState('http://localhost:1234');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const savedSettings = getModelSettings();
        setSettings(savedSettings);
        
        if (savedSettings.localModelUrl) {
          setLocalModelUrl(savedSettings.localModelUrl);
        }
        
        // Load models for the current provider
        await loadModelsForProvider(savedSettings.provider);
      } catch (error) {
        console.error('Error loading model settings:', error);
        setError('Failed to load saved settings');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);
  
  // Load models based on provider
  const loadModelsForProvider = async (provider: ModelProvider) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let models: Model[] = [];
      
      switch (provider) {
        case 'openai':
          models = getOpenAIModels();
          break;
          
        case 'npaw':
          models = getNpawModels();
          break;
          
        case 'local':
          if (localModelUrl && !isLocalUrl(localModelUrl)) {
            const localModels = await fetchLocalModels(localModelUrl);
            if (localModels?.data) {
              models = localModels.data.map(model => ({
                id: model.id,
                name: model.id,
                provider: 'local' as const
              }));
            }
          } else if (isLocalUrl(localModelUrl)) {
            setError('Local URLs (localhost) cannot be accessed by edge functions. Use a tunneling service like ngrok.');
          }
          break;
      }
      
      setAvailableModels(models);
      
      // Auto-select first model if none selected
      if (models.length > 0 && !settings.selectedModel) {
        setSettings(prev => ({ ...prev, selectedModel: models[0].id }));
      }
    } catch (error) {
      console.error('Error loading models:', error);
      setError(`Failed to load models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle provider change
  const handleProviderChange = (provider: ModelProvider) => {
    setSettings(prev => ({ ...prev, provider, selectedModel: undefined }));
    loadModelsForProvider(provider);
  };
  
  // Handle model selection
  const handleModelSelect = (modelId: string) => {
    setSettings(prev => ({ ...prev, selectedModel: modelId }));
  };
  
  // Handle local URL change
  const handleLocalUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setLocalModelUrl(url);
    setSettings(prev => ({ ...prev, localModelUrl: url }));
  };
  
  // Refresh models for current provider
  const handleRefreshModels = () => {
    loadModelsForProvider(settings.provider);
  };
  
  // Save settings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      const settingsToSave: ModelSettings = {
        provider: settings.provider,
        selectedModel: settings.selectedModel
      };
      
      if (settings.provider === 'local') {
        settingsToSave.localModelUrl = localModelUrl;
      }
      
      saveModelSettings(settingsToSave);
      
      toast.success(`Model settings updated: Using ${settings.provider} provider`);
      
      if (settings.selectedModel) {
        toast.info(`Selected model: ${settings.selectedModel}`);
      }
    } catch (error) {
      console.error('Error saving model settings:', error);
      toast.error('Failed to save model settings');
    } finally {
      setIsSaving(false);
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
          {/* Provider Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">AI Model Provider</Label>
            <RadioGroup
              value={settings.provider}
              onValueChange={handleProviderChange}
              className="grid grid-cols-1 gap-4"
            >
              <div className="flex items-center space-x-3 border rounded-lg p-4">
                <RadioGroupItem value="openai" id="openai" />
                <Cloud className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <Label htmlFor="openai" className="font-medium">OpenAI</Label>
                  <p className="text-sm text-muted-foreground">Use OpenAI's GPT models</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 border rounded-lg p-4">
                <RadioGroupItem value="npaw" id="npaw" />
                <Zap className="h-5 w-5 text-purple-500" />
                <div className="flex-1">
                  <Label htmlFor="npaw" className="font-medium">NPAW DeepSeek</Label>
                  <p className="text-sm text-muted-foreground">Use NPAW's DeepSeek-V3 or Mistral7B models</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 border rounded-lg p-4">
                <RadioGroupItem value="local" id="local" />
                <HardDrive className="h-5 w-5 text-green-500" />
                <div className="flex-1">
                  <Label htmlFor="local" className="font-medium">Local Model</Label>
                  <p className="text-sm text-muted-foreground">Use a local LM Studio model</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Local Model Configuration */}
          {settings.provider === 'local' && (
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
                  onChange={handleLocalUrlChange}
                />
                <p className="text-xs text-muted-foreground">
                  The base URL of your LM Studio server (without /v1 path)
                </p>
              </div>
            </>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 p-4 rounded-md flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Model Selection */}
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
              <Select value={settings.selectedModel || ''} onValueChange={handleModelSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm">
                <p className="font-medium">No models found.</p>
                <p className="mt-1">
                  {settings.provider === 'local' 
                    ? 'Make sure your model server is running and accessible.'
                    : 'Please try refreshing or check your connection.'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button 
              onClick={handleSaveSettings}
              disabled={isSaving || !settings.selectedModel}
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
