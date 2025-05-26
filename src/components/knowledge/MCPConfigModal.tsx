
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, Check } from 'lucide-react';
import { MCP } from '@/types/mcp';
import { mcpConfigService } from '@/services/mcpConfigService';

interface MCPConfigModalProps {
  mcp: MCP;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MCPConfigModal: React.FC<MCPConfigModalProps> = ({ mcp, open, onOpenChange }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('standardized');

  // Convert to standardized MCP format
  const standardizedConfig = mcpConfigService.convertFromLegacyMCP(mcp);
  const toolConfig = {
    protocol: 'ModelContextProtocol' as const,
    version: '1.0.0',
    tool: standardizedConfig,
    compatibility: {
      frameworks: ['openai-functions', 'supabase-edge'],
      versions: ['1.0.x']
    }
  };

  const handleCopyConfig = async (config: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy configuration:', error);
    }
  };

  const handleDownloadConfig = (config: any, filename: string) => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Configuration: {mcp.title}</span>
            <Badge variant={mcp.isDefault ? 'default' : 'secondary'}>
              {mcp.isDefault ? 'Default' : 'Custom'}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standardized">Standardized MCP</TabsTrigger>
            <TabsTrigger value="legacy">Legacy Format</TabsTrigger>
          </TabsList>
          
          <TabsContent value="standardized" className="mt-4 overflow-hidden">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyConfig(toolConfig)}
                  className="flex items-center gap-2"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadConfig(toolConfig, `${mcp.id}.mcp.json`)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
              
              <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-auto max-h-96 border">
                <pre className="text-sm text-gray-100 dark:text-gray-200">
                  <code>{JSON.stringify(toolConfig, null, 2)}</code>
                </pre>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="legacy" className="mt-4 overflow-hidden">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyConfig(mcp)}
                  className="flex items-center gap-2"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadConfig(mcp, `${mcp.id}-legacy.json`)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
              
              <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-auto max-h-96 border">
                <pre className="text-sm text-gray-100 dark:text-gray-200">
                  <code>{JSON.stringify(mcp, null, 2)}</code>
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MCPConfigModal;
