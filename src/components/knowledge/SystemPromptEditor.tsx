
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Eye, Edit3, Info, Loader2, Copy, Check } from 'lucide-react';
import { useGeneratedSystemPrompt } from '@/hooks/useGeneratedSystemPrompt';
import { toast } from '@/components/ui/sonner';

interface SystemPromptEditorProps {
  isOpen: boolean;
  onClose: () => void;
  generatedPrompt: string;
  customPrompt: string;
  useCustomPrompt: boolean;
  onCustomPromptChange: (prompt: string) => void;
  onUseCustomPromptChange: (use: boolean) => void;
  onReset: () => void;
  toolsCount: number;
  loopEnabled: boolean;
}

const SystemPromptEditor: React.FC<SystemPromptEditorProps> = ({
  isOpen,
  onClose,
  generatedPrompt: fallbackPrompt,
  customPrompt,
  useCustomPrompt,
  onCustomPromptChange,
  onUseCustomPromptChange,
  onReset,
  toolsCount,
  loopEnabled
}) => {
  const [localCustomPrompt, setLocalCustomPrompt] = useState(customPrompt);
  const [copied, setCopied] = useState(false);

  // Fetch the real generated system prompt
  const { 
    generatedPrompt: realGeneratedPrompt, 
    isLoading: isLoadingPrompt, 
    error: promptError,
    refetch: refetchPrompt
  } = useGeneratedSystemPrompt({
    customPrompt,
    useCustomPrompt,
    loopEnabled
  });

  useEffect(() => {
    setLocalCustomPrompt(customPrompt);
  }, [customPrompt]);

  const handleSave = () => {
    onCustomPromptChange(localCustomPrompt);
    onClose();
  };

  const handleReset = () => {
    setLocalCustomPrompt('');
    onReset();
  };

  const handleRefresh = () => {
    refetchPrompt();
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(currentPrompt);
      setCopied(true);
      toast.success('System prompt copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Use the real generated prompt if available, otherwise fall back to the passed one
  const displayPrompt = realGeneratedPrompt || fallbackPrompt;
  const currentPrompt = useCustomPrompt && customPrompt ? customPrompt : displayPrompt;
  const estimatedTokens = Math.ceil(currentPrompt.length / 4);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            System Prompt Editor
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Use Custom Prompt</span>
              <Switch
                checked={useCustomPrompt}
                onCheckedChange={onUseCustomPromptChange}
              />
            </div>
            <Badge variant="outline" className="text-xs">
              {toolsCount} Tools Available
            </Badge>
            <Badge variant={loopEnabled ? "default" : "secondary"} className="text-xs">
              Loop {loopEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            ~{estimatedTokens} tokens
          </div>
        </div>

        <Tabs defaultValue="editor" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Edit Prompt
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Current Prompt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 flex flex-col space-y-4 min-h-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Custom System Prompt</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Reset to Default
              </Button>
            </div>
            
            <Textarea
              value={localCustomPrompt}
              onChange={(e) => setLocalCustomPrompt(e.target.value)}
              placeholder="Enter your custom system prompt here, or leave empty to use the generated prompt..."
              className="flex-1 min-h-[300px] font-mono text-sm"
            />

            {useCustomPrompt && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                <strong>Tips:</strong>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>Be specific about how you want the AI to behave</li>
                  <li>Include instructions about tool usage if needed</li>
                  <li>Consider tone, response style, and decision-making preferences</li>
                  <li>Test changes with simple queries to see the effect</li>
                </ul>
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">
                {useCustomPrompt && customPrompt ? 'Custom Prompt (Active)' : 'Generated Prompt (Active)'}
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant={useCustomPrompt && customPrompt ? "default" : "secondary"} className="text-xs">
                  {useCustomPrompt && customPrompt ? 'Custom' : 'Generated'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPrompt}
                  className="h-7 px-2"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoadingPrompt}
                  className="h-7 px-2"
                >
                  {isLoadingPrompt ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
            
            {promptError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
                Error loading prompt: {promptError}
              </div>
            )}
            
            <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
              <ScrollArea className="h-[450px] w-full">
                <div className="p-4 text-sm font-mono whitespace-pre-wrap bg-muted/20">
                  {isLoadingPrompt ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading real system prompt...
                    </div>
                  ) : (
                    currentPrompt
                  )}
                </div>
              </ScrollArea>
            </div>

            {currentPrompt && !isLoadingPrompt && (
              <div className="text-xs text-muted-foreground text-center py-1">
                Scroll to see full content • {currentPrompt.split('\n').length} lines
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            Changes will apply to new messages in this session
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!useCustomPrompt}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SystemPromptEditor;
