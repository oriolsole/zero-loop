
import React, { useState } from 'react';
import { MCP } from '@/types/mcp';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, PlayCircle, Zap, Copy, Shield, Info, Key } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; 
import MCPExecutePanel from './MCPExecutePanel';
import { Icons } from '@/components/icons';

interface MCPCardProps {
  mcp: MCP;
  onEdit: () => void;
  onDelete: () => void;
  onClone: () => void;
}

const MCPCard: React.FC<MCPCardProps> = ({ mcp, onEdit, onDelete, onClone }) => {
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);
  const [showUseCases, setShowUseCases] = useState(false);
  
  // Generate icon component based on mcp.icon string
  const IconComponent = () => {
    const Icon = Icons[mcp.icon as keyof typeof Icons] || Zap;
    return <Icon className="h-5 w-5" />;
  };

  const isDefault = mcp.isDefault === true;
  const requiresAuth = mcp.requiresAuth === true;
  const requiresToken = !!mcp.requiresToken;

  return (
    <>
      <Card className={`h-full flex flex-col ${isDefault ? 'border-primary/30 bg-primary/5' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className={`${isDefault ? 'bg-primary/20' : 'bg-primary/10'} rounded-md p-2`}>
                <IconComponent />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {mcp.title}
                  {isDefault && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs border-primary/30 bg-primary/10">
                            Default
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Pre-configured tool provided by ZeroLoop
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {requiresAuth && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs border-yellow-300 bg-yellow-50/50">
                            <Shield className="h-3 w-3 mr-1" />
                            Auth
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Requires authentication: {mcp.authKeyName || "API key"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {requiresToken && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs border-blue-300 bg-blue-50/50">
                            <Key className="h-3 w-3 mr-1" />
                            Token
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Requires a {mcp.requiresToken} API token
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {mcp.category && (
                <Badge variant="secondary" className="text-xs">
                  {mcp.category}
                </Badge>
              )}
              <Badge variant="outline">{mcp.parameters.length} params</Badge>
            </div>
          </div>
          <CardDescription className="line-clamp-2">{mcp.description}</CardDescription>
          
          {/* Tags section */}
          {mcp.tags && mcp.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {mcp.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="flex-grow">
          <div className="text-sm text-muted-foreground mb-2">Parameters:</div>
          <div className="space-y-1">
            {mcp.parameters.length === 0 ? (
              <span className="text-sm italic text-muted-foreground">No parameters required</span>
            ) : (
              mcp.parameters.slice(0, 3).map((param, index) => (
                <div key={index} className="flex items-center text-sm">
                  <Badge variant="outline" className="mr-2">
                    {param.type}
                  </Badge>
                  <span className="font-mono">
                    {param.name}
                    {param.required ? '*' : ''}
                  </span>
                </div>
              ))
            )}
            {mcp.parameters.length > 3 && (
              <div className="text-sm text-muted-foreground">
                +{mcp.parameters.length - 3} more parameters
              </div>
            )}
          </div>
          
          {/* Suggested prompt */}
          {mcp.suggestedPrompt && (
            <div className="mt-3 text-sm">
              <div className="flex items-center text-muted-foreground mb-1">
                <Info className="h-3 w-3 mr-1" />
                Suggested prompt:
              </div>
              <div className="italic border-l-2 pl-2 border-primary/20 text-xs">
                "{mcp.suggestedPrompt}"
              </div>
            </div>
          )}
          
          {/* Sample use cases section, toggled by a button */}
          {mcp.sampleUseCases && mcp.sampleUseCases.length > 0 && (
            <div className="mt-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs p-0 h-auto"
                onClick={() => setShowUseCases(!showUseCases)}
              >
                {showUseCases ? 'Hide examples' : 'Show examples'}
              </Button>
              
              {showUseCases && (
                <div className="mt-2 text-sm border-l-2 pl-2 border-primary/20 space-y-1">
                  {mcp.sampleUseCases.slice(0, 2).map((useCase, idx) => (
                    <div key={idx} className="text-xs">&bull; {useCase}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between pt-2 border-t">
          <div className="flex gap-2">
            {isDefault ? (
              <Button variant="outline" size="sm" onClick={onClone}>
                <Copy className="h-4 w-4 mr-1" />
                Clone
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
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
    </>
  );
};

export default MCPCard;
