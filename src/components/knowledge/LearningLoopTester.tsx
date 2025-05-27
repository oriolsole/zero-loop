
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Brain, Play, RotateCcw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface TestResult {
  task: string;
  solution: string;
  verification: string;
  reflection: string;
  success: boolean;
  score: number;
  executionTime: number;
}

interface LearningLoopTesterProps {
  domainId?: string;
  engineType?: string;
}

export const LearningLoopTester: React.FC<LearningLoopTesterProps> = ({
  domainId,
  engineType = 'logic'
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testTask, setTestTask] = useState('');
  const [selectedEngine, setSelectedEngine] = useState(engineType);
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentResult, setCurrentResult] = useState<TestResult | null>(null);

  const predefinedTasks = {
    logic: [
      'If all birds can fly and penguins are birds, can penguins fly?',
      'Find the pattern in: 2, 4, 8, 16, ?',
      'Solve: If A implies B, and B implies C, and A is true, what can we conclude about C?'
    ],
    math: [
      'Calculate the derivative of x^2 + 3x + 2',
      'Find the area of a circle with radius 5',
      'Solve the quadratic equation: x^2 - 5x + 6 = 0'
    ],
    regex: [
      'Create a regex pattern to match email addresses',
      'Write a regex to validate phone numbers in format (xxx) xxx-xxxx',
      'Design a pattern to extract all URLs from text'
    ]
  };

  const runLearningLoop = async () => {
    if (!testTask.trim()) {
      toast.error('Please enter a task to test');
      return;
    }

    setIsRunning(true);
    const startTime = Date.now();

    try {
      // Simulate learning loop execution
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

      // Mock results based on engine type
      const mockResult: TestResult = {
        task: testTask,
        solution: generateMockSolution(testTask, selectedEngine),
        verification: generateMockVerification(testTask, selectedEngine),
        reflection: generateMockReflection(testTask, selectedEngine),
        success: Math.random() > 0.3,
        score: Math.floor(70 + Math.random() * 30),
        executionTime: Date.now() - startTime
      };

      setCurrentResult(mockResult);
      setResults(prev => [mockResult, ...prev]);
      
      toast.success(
        mockResult.success 
          ? `Learning loop completed successfully! Score: ${mockResult.score}%`
          : 'Learning loop completed with issues. Check the reflection for insights.'
      );
    } catch (error) {
      toast.error('Failed to execute learning loop');
      console.error('Learning loop error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const generateMockSolution = (task: string, engine: string): string => {
    const solutions = {
      logic: `Based on logical analysis of "${task}", I need to apply deductive reasoning principles...`,
      math: `To solve "${task}", I'll use mathematical methods and formulas...`,
      regex: `For the pattern "${task}", I'll construct a regular expression using...`
    };
    return solutions[engine as keyof typeof solutions] || 'Analyzing the problem systematically...';
  };

  const generateMockVerification = (task: string, engine: string): string => {
    const verifications = {
      logic: 'Verified using truth tables and logical consistency checks.',
      math: 'Verified through mathematical proof and numerical validation.',
      regex: 'Tested against sample inputs and edge cases.'
    };
    return verifications[engine as keyof typeof verifications] || 'Solution verified through systematic testing.';
  };

  const generateMockReflection = (task: string, engine: string): string => {
    const reflections = {
      logic: 'This problem required careful attention to logical fallacies and assumption validation.',
      math: 'The mathematical approach was efficient, though alternative methods could be explored.',
      regex: 'Pattern matching required balancing specificity with flexibility for edge cases.'
    };
    return reflections[engine as keyof typeof reflections] || 'The solution process revealed important insights about problem-solving strategies.';
  };

  const loadPredefinedTask = (task: string) => {
    setTestTask(task);
  };

  const clearResults = () => {
    setResults([]);
    setCurrentResult(null);
  };

  const getResultBadgeVariant = (success: boolean): "default" | "secondary" | "destructive" | "outline" => {
    return success ? 'default' : 'destructive';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    if (score >= 50) return 'outline';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Learning Loop Tester
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="engine">Engine Type</Label>
              <Select value={selectedEngine} onValueChange={setSelectedEngine}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an engine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logic">Logic Engine</SelectItem>
                  <SelectItem value="math">Math Engine</SelectItem>
                  <SelectItem value="regex">Regex Engine</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Quick Tasks</Label>
              <div className="flex flex-wrap gap-1">
                {predefinedTasks[selectedEngine as keyof typeof predefinedTasks]?.map((task, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => loadPredefinedTask(task)}
                    className="text-xs"
                  >
                    Task {index + 1}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="task">Test Task</Label>
            <Textarea
              id="task"
              placeholder="Enter a task to test the learning loop..."
              value={testTask}
              onChange={(e) => setTestTask(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={runLearningLoop} 
              disabled={isRunning || !testTask.trim()}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Learning Loop
                </>
              )}
            </Button>
            
            {results.length > 0 && (
              <Button variant="outline" onClick={clearResults}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {currentResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Latest Result</span>
              <div className="flex items-center gap-2">
                <Badge variant={getResultBadgeVariant(currentResult.success)}>
                  {currentResult.success ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {currentResult.success ? 'Success' : 'Failed'}
                </Badge>
                <Badge variant={getScoreBadgeVariant(currentResult.score)}>
                  Score: {currentResult.score}%
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Task</h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                {currentResult.task}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Solution</h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                {currentResult.solution}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Verification</h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                {currentResult.verification}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Reflection</h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                {currentResult.reflection}
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Execution Time: {currentResult.executionTime}ms</span>
              <span>Engine: {selectedEngine}</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {results.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Test History</CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {results.slice(1).map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{result.task}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.executionTime}ms execution time
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getScoreBadgeVariant(result.score)} className="text-xs">
                      {result.score}%
                    </Badge>
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
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
