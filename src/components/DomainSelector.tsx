
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Code, Calculator, Puzzle, FileText, Briefcase, Plus, Settings } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useLoopStore } from '../store/useLoopStore';

const DomainSelector: React.FC<{ 
  domains: any[],
  activeDomain: string,
  onSelectDomain: (domain: string) => void
}> = ({ domains, activeDomain, onSelectDomain }) => {
  const { isRunningLoop } = useLoopStore();
  
  const handleDomainSelect = (domainId: string) => {
    if (isRunningLoop) {
      toast.warning("Please complete the current learning loop before switching domains");
      return;
    }
    onSelectDomain(domainId);
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
  
  return (
    <div className="space-y-4 fade-in-delay-1">
      {domains.map((domain) => (
        <Card 
          key={domain.id}
          className={`domain-card cursor-pointer hover:border-primary transition-colors duration-200 ${domain.id === activeDomain ? 'border-primary' : ''}`}
          onClick={() => handleDomainSelect(domain.id)}
        >
          <div className="flex items-start gap-3 p-3">
            <div className={`p-2 rounded-md ${domain.id === activeDomain ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
              {getDomainIcon(domain.id)}
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{domain.name}</CardTitle>
              <CardDescription className="text-xs line-clamp-2">{domain.shortDesc}</CardDescription>
              
              <div className="mt-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Badge variant={domain.id === activeDomain ? 'default' : 'secondary'} className="text-xs">
                    Loops: {domain.totalLoops}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Success: {domain.metrics.successRate}%
                  </Badge>
                </div>
                
                <Link to={`/domain/${domain.id}`} onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="p-1 h-auto">
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      ))}
      
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
