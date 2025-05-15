
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, BrainCircuit, Cloud } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

const ModelSettings = () => {
  const [isLocalModel, setIsLocalModel] = useState(false);
  const [localModelUrl, setLocalModelUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch current settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Check if LOCAL_MODEL_URL is configured
        const { data, error } = await supabase.functions.invoke('ai-model-proxy', {
          body: { operation: 'getSettings' }
        });
        
        if (!error && data) {
          const hasLocalUrl = !!data.localModelUrl;
          setIsLocalModel(hasLocalUrl);
          setLocalModelUrl(data.localModelUrl || 'http://localhost:1234/v1');
        }
      } catch (error) {
        console.error('Error fetching model settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  // Handle saving settings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // If local model is disabled, clear the URL
      const urlToSave = isLocalModel ? localModelUrl : null;
      
      // This would normally save the setting to the database
      // For now we'll just display a toast notification
      toast.success(`Model settings updated: ${isLocalModel ? 'Using local model' : 'Using OpenAI'}`);
      
      // Note: In a real implementation, you would update the LOCAL_MODEL_URL
      // in Supabase secret, but this can only be done by an admin
      toast.info('Note: To actually change the model, update the LOCAL_MODEL_URL in Supabase Edge Function Secrets');
    } catch (error) {
      console.error('Error saving model settings:', error);
      toast.error('Failed to save model settings');
    } finally {
      setIsSaving(false);
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
                onCheckedChange={setIsLocalModel}
              />
            </div>
            
            {isLocalModel && (
              <div className="space-y-2">
                <Label htmlFor="model-url">Local Model URL</Label>
                <Input
                  id="model-url"
                  placeholder="http://localhost:1234/v1"
                  value={localModelUrl}
                  onChange={(e) => setLocalModelUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The base URL of your LM Studio server's OpenAI-compatible API
                </p>
              </div>
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ModelSettings;
