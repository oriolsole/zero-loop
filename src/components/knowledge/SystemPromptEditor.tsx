
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Eye, Edit3, Info } from 'lucide-react';

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
  generatedPrompt,
  customPrompt,
  useCustomPrompt,
  onCustomPromptChange,
  onUseCustomPromptChange,
  onReset,
  toolsCount,
  loopEnabled
}) => {
  const [localCustomPrompt, setLocalCustomPrompt] = useState(customPrompt);

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

  const currentPrompt = useCustomPrompt && customPrompt ? customPrompt : generatedPrompt;
  const estimatedTokens = Math.ceil(currentPrompt.length / 4);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
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

        <Tabs defaultValue="editor" className="flex-1 flex flex-col">
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

          <TabsContent value="editor" className="flex-1 flex flex-col space-y-4">
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
              className="flex-1 min-h-[180px] max-h-[300px] overflow-y-auto font-mono text-sm resize-none"
              disabled={!useCustomPrompt}
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

          <TabsContent value="preview" className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">
                {useCustomPrompt && customPrompt ? 'Custom Prompt (Active)' : 'Generated Prompt (Active)'}
              </h3>
              <Badge variant={useCustomPrompt && customPrompt ? "default" : "secondary"} className="text-xs">
                {useCustomPrompt && customPrompt ? 'Custom' : 'Generated'}
              </Badge>
            </div>
            
            <ScrollArea className="flex-1 border rounded-md h-[400px] w-full">
              <div className="p-4 text-sm font-mono whitespace-pre-wrap bg-muted/20 min-h-full">
                {currentPrompt}
              </div>
            </ScrollArea>
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
