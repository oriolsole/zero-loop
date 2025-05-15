
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Code, Database, Brain, FileText, Globe, Calculator, FileCode, PencilRuler, Info } from "lucide-react";
import { domainEngines } from '@/engines/domainEngines';

const KnowledgeEngines: React.FC = () => {
  // Convert the engines object to an array for rendering
  const enginesList = Object.entries(domainEngines).map(([key, engine]) => {
    // Determine engine capabilities
    const capabilities = {
      generateTask: typeof engine.generateTask === 'function',
      solveTask: typeof engine.solveTask === 'function',
      verifySolution: typeof engine.verifySolution === 'function',
      reflect: typeof engine.reflect === 'function',
      mutateTask: typeof engine.mutateTask === 'function',
    };

    // Map engine keys to human-readable names and icons
    const engineInfo = {
      'logic': {
        name: 'Logical Reasoning',
        icon: PencilRuler,
        description: 'Handles logical reasoning tasks and syllogisms',
        sources: ['knowledge']
      },
      'programming': {
        name: 'Regex Patterns',
        icon: Code,
        description: 'Processes and generates regex pattern matching tasks',
        sources: ['code']
      },
      'web-knowledge': {
        name: 'Web Knowledge',
        icon: Globe,
        description: 'Retrieves and processes information from web sources',
        sources: ['web', 'knowledge']
      },
      'ai-reasoning': {
        name: 'AI Reasoning',
        icon: Brain,
        description: 'Advanced AI-based reasoning for complex tasks',
        sources: ['ai', 'knowledge']
      },
      'math': {
        name: 'Mathematics',
        icon: Calculator,
        description: 'Solves mathematical problems and equations',
        sources: ['knowledge']
      },
      'writing': {
        name: 'Content Writing',
        icon: FileText,
        description: 'Creates and evaluates written content',
        sources: ['knowledge']
      },
      'business': {
        name: 'Business Strategy',
        icon: Info,
        description: 'Develops and analyzes business strategies',
        sources: ['knowledge']
      }
    };

    // Get the specific info for this engine
    const info = engineInfo[key as keyof typeof engineInfo] || {
      name: key.charAt(0).toUpperCase() + key.slice(1),
      icon: Database,
      description: 'Knowledge processing engine',
      sources: ['knowledge']
    };

    return {
      id: key,
      name: info.name,
      Icon: info.icon,
      description: info.description,
      capabilities,
      sources: info.sources
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {enginesList.map((engine) => (
          <Card key={engine.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <engine.Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">{engine.name}</CardTitle>
                  <CardDescription>{engine.id}</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pb-2">
              <p className="text-sm text-muted-foreground mb-4">{engine.description}</p>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-2">Capabilities</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(engine.capabilities).map(([capability, hasCapability]) => (
                      <Badge 
                        key={capability} 
                        variant={hasCapability ? "default" : "outline"}
                        className={hasCapability ? "" : "opacity-50"}
                      >
                        {hasCapability && <Check className="h-3 w-3 mr-1" />}
                        {capability.replace(/([A-Z])/g, ' $1').trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Knowledge Sources</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {engine.sources.map(source => {
                      let SourceIcon = Database;
                      
                      if (source === 'web') SourceIcon = Globe;
                      else if (source === 'ai') SourceIcon = Brain;
                      else if (source === 'code') SourceIcon = FileCode;
                      
                      return (
                        <Badge key={source} variant="secondary" className="flex items-center gap-1">
                          <SourceIcon className="h-3 w-3" />
                          {source.charAt(0).toUpperCase() + source.slice(1)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="pt-2">
              <div className="text-xs text-muted-foreground">
                Engine ID: {engine.id}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default KnowledgeEngines;
