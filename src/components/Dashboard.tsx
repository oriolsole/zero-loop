
import React, { useState } from 'react';
import Header from './Header';
import LearningLoop from './LearningLoop';
import KnowledgeMap from './KnowledgeMap';
import DomainSelector from './DomainSelector';
import PerformanceMetrics from './PerformanceMetrics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { domainsData } from '../data/mockData';

const Dashboard = () => {
  const [activeDomain, setActiveDomain] = useState('logic');
  
  const handleDomainChange = (domain: string) => {
    setActiveDomain(domain);
  };
  
  const activeData = domainsData.find(domain => domain.id === activeDomain) || domainsData[0];

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
              </TabsList>
              
              <TabsContent value="loop" className="space-y-4">
                <LearningLoop domain={activeData} />
              </TabsContent>
              
              <TabsContent value="knowledge">
                <KnowledgeMap domain={activeData} />
              </TabsContent>
            </Tabs>
          </div>
          
          <div>
            <h2 className="text-xl font-bold mb-4 fade-in">Learning Domains</h2>
            <DomainSelector 
              domains={domainsData} 
              activeDomain={activeDomain}
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
