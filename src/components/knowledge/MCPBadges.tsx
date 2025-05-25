
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, Key } from 'lucide-react';
import { MCP } from '@/types/mcp';

interface MCPBadgesProps {
  mcp: MCP;
}

const MCPBadges: React.FC<MCPBadgesProps> = ({ mcp }) => {
  const isDefault = mcp.isDefault === true;
  const requiresAuth = mcp.requiresAuth === true;
  const requiresToken = !!mcp.requirestoken;

  return (
    <div className="flex items-center gap-2">
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
              Requires a {mcp.requirestoken} API token
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default MCPBadges;
