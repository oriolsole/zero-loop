import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LearningLoop from './learning-loop/LearningLoop';
import KnowledgeMap from './KnowledgeMap';
import InsightTimeline from './InsightTimeline';
import DomainSelector from './DomainSelector';
import PerformanceMetrics from './PerformanceMetrics';
import LoopHistory from './LoopHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLoopStore } from '../store/useLoopStore';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Code, Brain, History, LineChart, Database, Settings as SettingsIcon } from 'lucide-react';

const Dashboard = () => {
  const { 
    domains, 
    activeDomainId, 
    setActiveDomain,
    useRemoteLogging
  } = useLoopStore();

  const [activeTab, setActiveTab] = useState('loop');
  
  const handleDomainChange = (domain: string) => {
    setActiveDomain(domain);
  };
  
  const activeData = domains.find(domain => domain.id === activeDomainId) || domains[0];
  
  // For the debug view
  const debugData = {
    activeDomain: activeDomainId,
    domainData: activeData,
    currentLoop: activeData?.currentLoop || [],
    metrics: activeData?.metrics || {},
    knowledgeNodeCount: activeData?.knowledgeNodes?.length || 0,
    knowledgeEdgeCount: activeData?.knowledgeEdges?.length || 0,
    useRemoteLogging
  };

  if (!activeData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="flex-1 container mx-auto p-8 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">No Domains Available</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4">No learning domains are available. Please create a new domain.</p>
              <Link to="/domain/new">
                <Button className="mt-2">Create New Domain</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-4 fade-in">Active Domain: {activeData.name}</h2>
            <p className="text-muted-foreground mb-6 fade-in-delay-1">{activeData.description}</p>
            
            <Tabs defaultValue="loop" value={activeTab} onValueChange={setActiveTab} className="fade-in-delay-2">
              <TabsList className="mb-6">
                <TabsTrigger value="loop">Learning Loop</TabsTrigger>
                <TabsTrigger value="knowledge">Knowledge Map</TabsTrigger>
                <TabsTrigger value="insights">
                  <span className="flex items-center gap-1">
                    <Brain className="w-4 h-4" />
                    Insights Timeline
                  </span>
                </TabsTrigger>
                <TabsTrigger value="history">
                  <span className="flex items-center gap-1">
                    <History className="w-4 h-4" />
                    Loop History
                  </span>
                </TabsTrigger>
                <TabsTrigger value="debug">Debug View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="loop" className="space-y-4">
                <LearningLoop />
              </TabsContent>
              
              <TabsContent value="knowledge">
                <KnowledgeMap domain={activeData} />
              </TabsContent>
              
              <TabsContent value="insights">
                <InsightTimeline />
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
            
            <Card className="mt-6 bg-secondary/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <LineChart className="w-4 h-4" />
                  Knowledge Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Nodes</span>
                    <span className="font-medium">{activeData.knowledgeNodes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Connections</span>
                    <span className="font-medium">{activeData.knowledgeEdges?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Density</span>
                    <span className="font-medium">
                      {activeData.knowledgeNodes.length > 0 
                        ? ((activeData.knowledgeEdges?.length || 0) / activeData.knowledgeNodes.length).toFixed(1)
                        : '0'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6">
              <Link to="/settings">
                <Button variant="outline" size="sm" className="w-full">
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
