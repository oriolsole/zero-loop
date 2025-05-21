
import React, { useState } from 'react';
import { MCP } from '@/types/mcp';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, PlayCircle, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MCPExecutePanel from './MCPExecutePanel';
import { Icons } from '@/components/icons';

interface MCPCardProps {
  mcp: MCP;
  onEdit: () => void;
  onDelete: () => void;
}

const MCPCard: React.FC<MCPCardProps> = ({ mcp, onEdit, onDelete }) => {
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);
  
  // Generate icon component based on mcp.icon string
  const IconComponent = () => {
    const Icon = Icons[mcp.icon as keyof typeof Icons] || Zap;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 rounded-md p-2">
                <IconComponent />
              </div>
              <CardTitle className="text-lg">{mcp.title}</CardTitle>
            </div>
            <Badge variant="outline">{mcp.parameters.length} params</Badge>
          </div>
          <CardDescription className="line-clamp-2">{mcp.description}</CardDescription>
        </CardHeader>
        
        <CardContent className="flex-grow">
          <div className="text-sm text-muted-foreground mb-2">Parameters:</div>
          <div className="space-y-1">
            {mcp.parameters.length === 0 ? (
              <span className="text-sm italic text-muted-foreground">No parameters required</span>
            ) : (
              mcp.parameters.map((param, index) => (
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
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between pt-2 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
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
