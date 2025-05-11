
import React from 'react';
import { Globe, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SourcesToggleProps {
  showingSources: boolean;
  toggleSources: () => void;
  isDomainWebKnowledge: boolean;
  sourceCount?: number;
}

const SourcesToggle: React.FC<SourcesToggleProps> = ({ 
  showingSources, 
  toggleSources,
  isDomainWebKnowledge,
  sourceCount = 0
}) => {
  if (!isDomainWebKnowledge) return null;
  
  return (
    <div className="flex items-center gap-2">
      <Button 
        variant={showingSources ? "secondary" : "outline"} 
        size="sm" 
        onClick={toggleSources}
        className="flex items-center gap-1"
      >
        <Globe className="h-4 w-4" />
        {showingSources ? 'Hide External Sources' : 'Show External Sources'}
        {sourceCount > 0 && (
          <span className="ml-1 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-xs">
            {sourceCount}
          </span>
        )}
      </Button>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-muted-foreground cursor-help">
              <Info className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">
              External knowledge sources are used to enhance learning and verification.
              They provide real-world context to the learning process.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default SourcesToggle;
