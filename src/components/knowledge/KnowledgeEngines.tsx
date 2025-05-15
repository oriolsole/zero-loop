
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Database, Globe, Brain, FileCode } from "lucide-react";
import { domainEngines, engineMetadata } from '@/engines/domainEngines';

const KnowledgeEngines: React.FC = () => {
  // Convert the engines object to an array for rendering
  const enginesList = Object.entries(domainEngines).map(([key, engine]) => {
    // Determine engine capabilities
    const capabilities = {
      generateTask: typeof engine.generateTask === 'function',
      solveTask: typeof engine.solveTask === 'function',
      verifyTask: typeof engine.verifyTask === 'function',
      reflectOnTask: typeof engine.reflectOnTask === 'function',
      mutateTask: typeof engine.mutateTask === 'function',
    };

    // Get metadata for this engine
    const metadata = engineMetadata[key] || {
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      icon: Database,
      description: 'Knowledge processing engine',
      sources: ['knowledge'],
      color: 'gray'
    };

    return {
      id: key,
      name: metadata.name,
      Icon: metadata.icon,
      description: metadata.description,
      capabilities,
      sources: metadata.sources || [], // Ensure sources is always at least an empty array
      color: metadata.color
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {enginesList.map((engine) => (
          <Card key={engine.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-${engine.color}-100 dark:bg-${engine.color}-950 rounded-md`}>
                  <engine.Icon className={`h-6 w-6 text-${engine.color}-600 dark:text-${engine.color}-400`} />
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
                    {engine.sources && engine.sources.map(source => {
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
