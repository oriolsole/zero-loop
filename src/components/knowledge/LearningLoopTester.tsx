
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Brain, TestTube, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface TestCase {
  query: string;
  expectedComplexity: 'SIMPLE' | 'COMPLEX';
  description: string;
}

const testCases: TestCase[] = [
  {
    query: "What are the major news stories in 2025?",
    expectedComplexity: "COMPLEX",
    description: "Current events requiring web search"
  },
  {
    query: "What is the capital of France?",
    expectedComplexity: "SIMPLE", 
    description: "General knowledge question"
  },
  {
    query: "Latest AI developments today",
    expectedComplexity: "COMPLEX",
    description: "Time-sensitive query"
  },
  {
    query: "How does photosynthesis work?",
    expectedComplexity: "SIMPLE",
    description: "Scientific concept explanation"
  },
  {
    query: "What are the biggest M&A deals of 2025?",
    expectedComplexity: "COMPLEX",
    description: "Current business/financial data"
  },
  {
    query: "Explain the theory of relativity",
    expectedComplexity: "SIMPLE",
    description: "Established scientific theory"
  },
  {
    query: "Find recent developments in quantum computing",
    expectedComplexity: "COMPLEX",
    description: "Recent tech developments"
  }
];

interface TestResult {
  query: string;
  expectedComplexity: 'SIMPLE' | 'COMPLEX';
  actualComplexity: 'SIMPLE' | 'COMPLEX' | null;
  reasoning: string;
  confidence: number;
  passed: boolean | null;
  timestamp: Date;
}

const LearningLoopTester: React.FC = () => {
  const [customQuery, setCustomQuery] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);

  const testSingleQuery = async (testCase: TestCase): Promise<TestResult> => {
    try {
      setCurrentTest(testCase.query);
      
      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          message: testCase.query,
          conversationHistory: [],
          userId: 'test-user',
          sessionId: 'test-session',
          testMode: true
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const result: TestResult = {
        query: testCase.query,
        expectedComplexity: testCase.expectedComplexity,
        actualComplexity: data.complexity?.classification || null,
        reasoning: data.complexity?.reasoning || 'No reasoning provided',
        confidence: data.complexity?.confidence || 0,
        passed: data.complexity?.classification === testCase.expectedComplexity,
        timestamp: new Date()
      };

      return result;
    } catch (error) {
      console.error('Test error:', error);
      return {
        query: testCase.query,
        expectedComplexity: testCase.expectedComplexity,
        actualComplexity: null,
        reasoning: `Error: ${error.message}`,
        confidence: 0,
        passed: false,
        timestamp: new Date()
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      const results: TestResult[] = [];
      
      for (const testCase of testCases) {
        const result = await testSingleQuery(testCase);
        results.push(result);
        setTestResults([...results]);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const passedCount = results.filter(r => r.passed).length;
      toast.success(`Tests completed: ${passedCount}/${results.length} passed`);
    } catch (error) {
      toast.error('Test suite failed');
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  };

  const testCustomQuery = async () => {
    if (!customQuery.trim()) return;
    
    setIsRunning(true);
    try {
      const result = await testSingleQuery({
        query: customQuery,
        expectedComplexity: 'COMPLEX', // Default assumption for custom queries
        description: 'Custom test query'
      });
      
      setTestResults([result, ...testResults]);
      toast.success('Custom query tested');
    } catch (error) {
      toast.error('Custom test failed');
    } finally {
      setIsRunning(false);
      setCustomQuery('');
    }
  };

  const getResultIcon = (result: TestResult) => {
    if (result.actualComplexity === null) return <XCircle className="h-4 w-4 text-red-500" />;
    if (result.passed) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getComplexityBadge = (complexity: 'SIMPLE' | 'COMPLEX' | null) => {
    if (complexity === null) return <Badge variant="destructive">ERROR</Badge>;
    return (
      <Badge variant={complexity === 'COMPLEX' ? 'purple' : 'secondary'}>
        {complexity}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Learning Loop Detector Tester
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Run All Tests
                </>
              )}
            </Button>
            
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="Enter custom query to test..."
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                rows={2}
                disabled={isRunning}
              />
              <Button 
                onClick={testCustomQuery}
                disabled={isRunning || !customQuery.trim()}
                variant="outline"
              >
                Test
              </Button>
            </div>
          </div>

          {currentTest && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-700">Currently testing:</p>
              <p className="text-sm text-blue-600">{currentTest}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Predefined Test Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {testCases.map((testCase, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{testCase.query}</span>
                  <Badge variant={testCase.expectedComplexity === 'COMPLEX' ? 'purple' : 'secondary'}>
                    Expected: {testCase.expectedComplexity}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{testCase.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {getResultIcon(result)}
                    <span className="font-medium flex-1">{result.query}</span>
                    <div className="flex gap-2">
                      {getComplexityBadge(result.actualComplexity)}
                      <Badge variant="outline">
                        {Math.round(result.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected:</span>
                      <span>{result.expectedComplexity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual:</span>
                      <span>{result.actualComplexity || 'ERROR'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Reasoning:</span>
                      <p className="mt-1 text-sm bg-gray-50 p-2 rounded">{result.reasoning}</p>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Tested at:</span>
                      <span>{result.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LearningLoopTester;
