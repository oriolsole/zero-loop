
import React from 'react';
import { Agent } from '@/services/agentService';
import { MCP } from '@/types/mcp';
import { useAgentToolConfigs } from '@/hooks/useAgentToolConfigs';
import { getToolIcon } from '@/utils/toolIcons';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ToolsIndicatorProps {
  agent: Agent | null;
  availableTools: MCP[];
}

const ToolsIndicator: React.FC<ToolsIndicatorProps> = ({
  agent,
  availableTools
}) => {
  const { toolConfigs, isLoading } = useAgentToolConfigs(agent?.id || null);

  if (!agent || isLoading) {
    return null;
  }

  // Get enabled tools for this agent
  const enabledToolIds = toolConfigs
    .filter(config => config.is_active)
    .map(config => config.mcp_id);

  const enabledTools = availableTools.filter(tool => 
    enabledToolIds.includes(tool.id)
  );

  if (enabledTools.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 flex-wrap">
        {enabledTools.map((tool) => {
          const IconComponent = getToolIcon(tool.title);
          const customConfig = toolConfigs.find(config => config.mcp_id === tool.id);
          const displayName = customConfig?.custom_title || tool.title;
          
          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <div className="p-1 rounded hover:bg-muted/50 transition-colors">
                  <IconComponent className="h-3 w-3 text-muted-foreground/70 hover:text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{displayName}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default ToolsIndicator;
