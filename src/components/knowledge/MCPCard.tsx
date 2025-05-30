
import React, { useState } from 'react';
import { MCP } from '@/types/mcp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, Info, MoreHorizontal, Edit2, Trash2, Copy, FileCode, Shield, Key } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
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
  
  // Generate icon component based on mcp.icon string
  const IconComponent = () => {
    const Icon = Icons[mcp.icon as keyof typeof Icons] || Icons.Zap;
    return <Icon className="h-5 w-5" />;
  };

  const isDefault = mcp.isDefault === true;
  const requiresAuth = mcp.requiresAuth === true;
  const requiresToken = !!mcp.requirestoken;

  // Defensive checks for arrays
  const parameters = Array.isArray(mcp.parameters) ? mcp.parameters : [];
  const tags = Array.isArray(mcp.tags) ? mcp.tags : [];

  return (
    <>
      <Card className={`h-full flex flex-col ${isDefault ? 'border-primary/30 bg-primary/5' : ''} hover:shadow-md transition-shadow`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`${isDefault ? 'bg-primary/20' : 'bg-primary/10'} rounded-md p-2 flex-shrink-0`}>
                <IconComponent />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg truncate">{mcp.title}</CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {mcp.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              {/* Info Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Info className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium">{mcp.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{mcp.description}</p>
                    </div>
                    
                    <Separator />
                    
                    {/* Category and Type */}
                    <div className="flex flex-wrap gap-2">
                      {mcp.category && (
                        <Badge variant="secondary" className="text-xs">
                          {mcp.category}
                        </Badge>
                      )}
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

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Tags:</p>
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Parameters */}
                    <div>
                      <p className="text-xs font-medium mb-1">
                        Parameters ({parameters.length}):
                      </p>
                      {parameters.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No parameters required</p>
                      ) : (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {parameters.map((param, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-xs">
                                {param.type}
                              </Badge>
                              <span className="font-mono">
                                {param.name}
                                {param.required ? '*' : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Suggested Prompt */}
                    {mcp.suggestedPrompt && (
                      <div>
                        <p className="text-xs font-medium mb-1">Suggested Prompt:</p>
                        <div className="text-xs italic border-l-2 pl-2 border-primary/20 text-muted-foreground">
                          "{mcp.suggestedPrompt}"
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Actions Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="end">
                  <div className="flex flex-col gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsConfigModalOpen(true)}
                      className="justify-start"
                    >
                      <FileCode className="h-4 w-4 mr-2" />
                      View Config
                    </Button>
                    
                    {isDefault ? (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={onClone}
                        className="justify-start"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Clone
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={onEdit}
                          className="justify-start"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={onDelete}
                          className="justify-start text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-grow flex flex-col justify-between pt-0">
          <div className="flex items-center justify-between">
            {mcp.category && (
              <Badge variant="secondary" className="text-xs">
                {mcp.category}
              </Badge>
            )}
            <Button onClick={() => setIsExecuteDialogOpen(true)} className="ml-auto">
              <PlayCircle className="h-4 w-4 mr-2" />
              Execute
            </Button>
          </div>
        </CardContent>
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
