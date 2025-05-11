
import React from 'react';
import { Globe } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface SourcesToggleProps {
  showingSources: boolean;
  toggleSources: () => void;
  isDomainWebKnowledge: boolean;
}

const SourcesToggle: React.FC<SourcesToggleProps> = ({ 
  showingSources, 
  toggleSources,
  isDomainWebKnowledge
}) => {
  if (!isDomainWebKnowledge) return null;
  
  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={toggleSources}
        className="flex items-center gap-1"
      >
        <Globe className="h-4 w-4" />
        {showingSources ? 'Hide External Sources' : 'Show External Sources'}
      </Button>
      
      <span className="text-sm text-muted-foreground">
        Using external knowledge for enhanced learning
      </span>
    </div>
  );
};

export default SourcesToggle;
