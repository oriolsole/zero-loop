
import React from 'react';
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Code, Calculator, Puzzle, FileText, Briefcase } from 'lucide-react';

const DomainSelector: React.FC<{ 
  domains: any[],
  activeDomain: string,
  onSelectDomain: (domain: string) => void
}> = ({ domains, activeDomain, onSelectDomain }) => {
  
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
          className={`domain-card cursor-pointer hover:border-primary ${domain.id === activeDomain ? 'border-primary' : ''}`}
          onClick={() => onSelectDomain(domain.id)}
        >
          <div className="flex items-start gap-3">
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
              </div>
            </div>
          </div>
        </Card>
      ))}
      
      <Card className="domain-card cursor-pointer border-dashed">
        <div className="flex items-center justify-center text-muted-foreground py-2">
          <span className="text-sm">+ Add new domain</span>
        </div>
      </Card>
    </div>
  );
};

export default DomainSelector;
