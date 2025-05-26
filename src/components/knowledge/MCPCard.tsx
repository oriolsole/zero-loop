
import React, { useState } from 'react';
import { MCP } from '@/types/mcp';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, PlayCircle, Zap, Copy, Shield, Info, Key, FileCode } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; 
import MCPExecutePanel from './MCPExecutePanel';
import MCPConfigModal from './MCPConfigModal';
import { Icons } from '@/components/icons';

interface MCPCardProps {
  mcp: MCP;
  onEdit: () => void;
  onDelete: () => void;
  onClone: () => void;
}

const MCPCard: React.FC<MCPCardProps> = ({ mcp, onEdit, onDelete, onClone }) => {
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [showUseCases, setShowUseCases] = useState(false);
  
  // Generate icon component based on mcp.icon string
  const IconComponent = () => {
    const Icon = Icons[mcp.icon as keyof typeof Icons] || Zap;
    return <Icon className="h-5 w-5" />;
  };

  const isDefault = mcp.isDefault === true;
  const requiresAuth = mcp.requiresAuth === true;
  const requiresToken = !!mcp.requirestoken;

  // Defensive checks for arrays
  const parameters = Array.isArray(mcp.parameters) ? mcp.parameters : [];
  const tags = Array.isArray(mcp.tags) ? mcp.tags : [];
  const sampleUseCases = Array.isArray(mcp.sampleUseCases) ? mcp.sampleUseCases : [];

  return (
    <>
      <Card className={`h-full flex flex-col ${isDefault ? 'border-primary/30 bg-primary/5' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className={`${isDefault ? 'bg-primary/20' : 'bg-primary/10'} rounded-md p-2`}>
                <IconComponent />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg truncate">{mcp.title}</CardTitle>
                <div className="flex items-center gap-1 mt-1">
                  {isDefault && (
                    <Badge variant="outline" className="text-xs border-primary/30 bg-primary/10">
                      Default
                    </Badge>
                  )}
                  {requiresAuth && (
                    <Badge variant="outline" className="text-xs border-yellow-300 bg-yellow-50/50">
                      <Shield className="h-3 w-3 mr-1" />
                      Auth
                    </Badge>
                  )}
                  {requiresToken && (
                    <Badge variant="outline" className="text-xs border-blue-300 bg-blue-50/50">
                      <Key className="h-3 w-3 mr-1" />
                      Token
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {mcp.category && (
                <Badge variant="secondary" className="text-xs">
                  {mcp.category}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">{parameters.length} params</Badge>
            </div>
          </div>
          <CardDescription className="line-clamp-2 text-sm">{mcp.description}</CardDescription>
        </CardHeader>
        
        <CardContent className="flex-grow py-2">
          {/* Tags section */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {tags.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Parameters preview */}
          <div className="space-y-1">
            {parameters.length === 0 ? (
              <span className="text-xs italic text-muted-foreground">No parameters required</span>
            ) : (
              parameters.slice(0, 2).map((param, index) => (
                <div key={index} className="flex items-center text-xs">
                  <Badge variant="outline" className="mr-2 text-xs">
                    {param.type}
                  </Badge>
                  <span className="font-mono truncate">
                    {param.name}
                    {param.required ? '*' : ''}
                  </span>
                </div>
              ))
            )}
            {parameters.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{parameters.length - 2} more
              </div>
            )}
          </div>
          
          {/* Suggested prompt - more compact */}
          {mcp.suggestedPrompt && (
            <div className="mt-3 text-xs">
              <div className="italic border-l-2 pl-2 border-primary/20 line-clamp-2">
                "{mcp.suggestedPrompt}"
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between pt-2 border-t gap-2">
          <div className="flex gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setIsConfigModalOpen(true)}>
                    <FileCode className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View JSON Config</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {isDefault ? (
              <Button variant="outline" size="sm" onClick={onClone}>
                <Copy className="h-4 w-4 mr-1" />
                Clone
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <Button size="sm" onClick={() => setIsExecuteDialogOpen(true)}>
            <PlayCircle className="h-4 w-4 mr-1" />
            Execute
          </Button>
        </CardFooter>
      </Card>
      
      <Dialog open={isExecuteDialogOpen} onOpenChange={setIsExecuteDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconComponent />
              Execute {mcp.title}
            </DialogTitle>
          </DialogHeader>
          <MCPExecutePanel mcp={mcp} />
        </DialogContent>
      </Dialog>

      <MCPConfigModal 
        mcp={mcp}
        open={isConfigModalOpen}
        onOpenChange={setIsConfigModalOpen}
      />
    </>
  );
};

export default MCPCard;
