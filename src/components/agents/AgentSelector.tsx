
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Bot, Crown, Settings } from 'lucide-react';
import { Agent } from '@/services/agentService';
import { useAgentManagement } from '@/hooks/useAgentManagement';

interface AgentSelectorProps {
  currentAgent?: Agent | null;
  onAgentChange: (agent: Agent) => void;
  onManageAgents: () => void;
}

const AgentSelector: React.FC<AgentSelectorProps> = ({
  currentAgent,
  onAgentChange,
  onManageAgents,
}) => {
  const { agents } = useAgentManagement();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[200px] justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="truncate">
              {currentAgent?.name || 'Select Agent'}
            </span>
            {currentAgent?.is_default && (
              <Crown className="h-3 w-3 text-yellow-500" />
            )}
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-64">
        {agents.map((agent) => (
          <DropdownMenuItem
            key={agent.id}
            onClick={() => onAgentChange(agent)}
            className="flex items-center justify-between p-3"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{agent.name}</span>
                {agent.is_default && (
                  <Crown className="h-3 w-3 text-yellow-500" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {agent.model}
                </Badge>
                {agent.loop_enabled && (
                  <Badge variant="secondary" className="text-xs">
                    Self-Improve
                  </Badge>
                )}
              </div>
              {agent.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {agent.description}
                </p>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        
        {agents.length === 0 && (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">No agents available</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onManageAgents} className="gap-2">
          <Settings className="h-4 w-4" />
          Manage Agents...
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AgentSelector;
