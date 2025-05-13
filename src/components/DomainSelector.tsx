
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Code, Calculator, Puzzle, FileText, Briefcase, Plus, Settings } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useLoopStore } from '../store/useLoopStore';
import { ensureSafeDomainId } from '@/utils/domainUtils';

const DomainSelector: React.FC<{ 
  domains: any[],
  activeDomain: string,
  onSelectDomain: (domain: string) => void
}> = ({ domains, activeDomain, onSelectDomain }) => {
  const { isRunningLoop } = useLoopStore();
  
  // Filter out any domains with null or empty IDs
  const validDomains = domains.filter(domain => domain.id && domain.id.trim() !== '');
  
  const handleDomainSelect = (domainId: string) => {
    if (isRunningLoop) {
      toast.warning("Please complete the current learning loop before switching domains");
      return;
    }
    
    // Ensure domainId is never empty - use a fallback value if empty
    const safeDomainId = ensureSafeDomainId(domainId);
    onSelectDomain(safeDomainId);
  };
  
  const getDomainIcon = (type: string) => {
    switch (type) {
      case 'logic': return <Puzzle className="w-5 h-5" />;
      case 'programming': return <Code className="w-5 h-5" />;
      case 'math': return <Calculator className="w-5 h-5" />;
      case 'writing': return <FileText className="w-5 h-5" />;
      case 'business': return <Briefcase className="w-5 h-5" />;
      default: return <Brain className="w-5 h-5" />;
    }
  };
  
  // Make sure we have a safe value for comparison
  const safeActiveDomain = ensureSafeDomainId(activeDomain);
  
  return (
    <div className="space-y-4 fade-in-delay-1">
      {validDomains.map((domain) => {
        // Ensure we have a safe domain ID that's never empty
        const safeDomainId = ensureSafeDomainId(domain.id, `domain-${domain.name?.replace(/\s+/g, '-').toLowerCase() || 'unknown'}-${Date.now()}`);
        
        return (
          <Card 
            key={safeDomainId}
            className={`domain-card cursor-pointer hover:border-primary transition-colors duration-200 ${safeDomainId === safeActiveDomain ? 'border-primary' : ''}`}
            onClick={() => handleDomainSelect(safeDomainId)}
          >
            <div className="flex items-start gap-3 p-3">
              <div className={`p-2 rounded-md ${safeDomainId === safeActiveDomain ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                {getDomainIcon(domain.id || "default")}
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">{domain.name || "Unnamed Domain"}</CardTitle>
                <CardDescription className="text-xs line-clamp-2">{domain.shortDesc || "No description available"}</CardDescription>
                
                <div className="mt-2 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge variant={safeDomainId === safeActiveDomain ? 'default' : 'secondary'} className="text-xs">
                      Loops: {domain.totalLoops || 0}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Success: {domain.metrics?.successRate || 0}%
                    </Badge>
                  </div>
                  
                  <Link to={`/domain/${safeDomainId}`} onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="p-1 h-auto">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
      
      <Link to="/domain/new">
        <Card 
          className="domain-card cursor-pointer border-dashed hover:border-primary/50 transition-colors duration-200"
        >
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-3">
            <Plus className="w-4 h-4" />
            <span className="text-sm">Create new domain</span>
          </div>
        </Card>
      </Link>
    </div>
  );
};

export default DomainSelector;
