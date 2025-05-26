
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, XCircle, CheckCircle, Clock, Brain } from 'lucide-react';

interface DebugLog {
  id: string;
  timestamp: Date;
  type: 'complexity' | 'tool' | 'knowledge' | 'error' | 'info';
  message: string;
  data?: any;
}

const DebugConsole: React.FC = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen for debug events from the system
    const handleDebugEvent = (event: CustomEvent) => {
      const newLog: DebugLog = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: event.detail.type,
        message: event.detail.message,
        data: event.detail.data
      };
      
      setLogs(prev => [newLog, ...prev.slice(0, 99)]); // Keep last 100 logs
    };

    window.addEventListener('debugLog' as any, handleDebugEvent);
    return () => window.removeEventListener('debugLog' as any, handleDebugEvent);
  }, []);

  const clearLogs = () => setLogs([]);

  const getLogIcon = (type: DebugLog['type']) => {
    switch (type) {
      case 'complexity':
        return <Brain className="h-4 w-4 text-purple-500" />;
      case 'tool':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'knowledge':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLogBadge = (type: DebugLog['type']) => {
    const variants = {
      complexity: 'purple',
      tool: 'default',
      knowledge: 'secondary',
      error: 'destructive',
      info: 'outline'
    } as const;
    
    return <Badge variant={variants[type] || 'outline'}>{type.toUpperCase()}</Badge>;
  };

  if (!isVisible) {
    return (
      <Button 
        onClick={() => setIsVisible(true)} 
        variant="outline" 
        size="sm"
        className="fixed bottom-4 right-4 z-50"
      >
        <Terminal className="h-4 w-4 mr-2" />
        Debug Console {logs.length > 0 && `(${logs.length})`}
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-80 z-50 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Debug Console
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={clearLogs} variant="outline" size="sm">
              Clear
            </Button>
            <Button onClick={() => setIsVisible(false)} variant="outline" size="sm">
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-60 px-4">
          <div className="space-y-2 pb-4">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No debug logs yet. Test some queries to see classification decisions.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="border-l-2 border-gray-200 pl-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    {getLogIcon(log.type)}
                    {getLogBadge(log.type)}
                    <span className="text-xs text-gray-500">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{log.message}</p>
                  {log.data && (
                    <details className="mt-1">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        Show data
                      </summary>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DebugConsole;
