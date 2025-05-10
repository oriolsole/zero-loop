
import React from 'react';
import Header from './Header';
import LearningLoop from './LearningLoop';
import KnowledgeMap from './KnowledgeMap';
import DomainSelector from './DomainSelector';
import PerformanceMetrics from './PerformanceMetrics';
import LoopHistory from './LoopHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLoopStore } from '../store/useLoopStore';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Code, Eye, History } from 'lucide-react';

const Dashboard = () => {
  const { 
    domains, 
    activeDomainId, 
    setActiveDomain 
  } = useLoopStore();
  
  const handleDomainChange = (domain: string) => {
    setActiveDomain(domain);
  };
  
  const activeData = domains.find(domain => domain.id === activeDomainId) || domains[0];
  
  // For the debug view
  const debugData = {
    activeDomain: activeDomainId,
    domainData: activeData,
    currentLoop: activeData.currentLoop,
    metrics: activeData.metrics
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-4 fade-in">Active Domain: {activeData.name}</h2>
            <p className="text-muted-foreground mb-6 fade-in-delay-1">{activeData.description}</p>
            
            <Tabs defaultValue="loop" className="fade-in-delay-2">
              <TabsList className="mb-6">
                <TabsTrigger value="loop">Learning Loop</TabsTrigger>
                <TabsTrigger value="knowledge">Knowledge Map</TabsTrigger>
                <TabsTrigger value="history">
                  <span className="flex items-center gap-1">
                    <History className="w-4 h-4" />
                    History
                  </span>
                </TabsTrigger>
                <TabsTrigger value="debug">Debug View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="loop" className="space-y-4">
                <LearningLoop domain={activeData} />
              </TabsContent>
              
              <TabsContent value="knowledge">
                <KnowledgeMap domain={activeData} />
              </TabsContent>
              
              <TabsContent value="history">
                <LoopHistory />
              </TabsContent>
              
              <TabsContent value="debug">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-5 h-5" /> Debug Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-secondary/30 p-4 rounded-md overflow-auto max-h-[600px]">
                      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(debugData, null, 2)}
                      </pre>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(debugData, null, 2))}
                      >
                        Copy JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div>
            <h2 className="text-xl font-bold mb-4 fade-in">Learning Domains</h2>
            <DomainSelector 
              domains={domains} 
              activeDomain={activeDomainId}
              onSelectDomain={handleDomainChange}
            />
            
            <h2 className="text-xl font-bold mt-8 mb-4 fade-in-delay-2">Performance</h2>
            <PerformanceMetrics data={activeData.metrics} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
