
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LearningLoopTester from './LearningLoopTester';
import DebugConsole from './DebugConsole';

const AIAgentTestTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="tester" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tester">Learning Loop Tester</TabsTrigger>
          <TabsTrigger value="performance">Performance Monitor</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tester" className="mt-6">
          <LearningLoopTester />
        </TabsContent>
        
        <TabsContent value="performance" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Performance Metrics</h3>
            <p className="text-sm text-gray-600">
              Monitor classification accuracy, response times, and tool usage patterns.
              Use the Learning Loop Tester to generate data for analysis.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-700">Classification Accuracy</h4>
                <p className="text-sm text-blue-600 mt-1">
                  Track how well the AI classifier identifies SIMPLE vs COMPLEX queries
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-700">Tool Usage Efficiency</h4>
                <p className="text-sm text-green-600 mt-1">
                  Monitor which tools are being used and their success rates
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-700">Knowledge Persistence</h4>
                <p className="text-sm text-purple-600 mt-1">
                  Track insights being generated and stored in the knowledge graph
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <DebugConsole />
    </div>
  );
};

export default AIAgentTestTab;
