
import React from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface MCPExecuteResultsProps {
  result?: Record<string, any> | null;
  error?: string | null;
  requestInfo?: string | null;
}

const MCPExecuteResults: React.FC<MCPExecuteResultsProps> = ({ result, error, requestInfo }) => {
  return (
    <div className="space-y-4">
      {/* Request info display - useful for debugging */}
      {requestInfo && (
        <Card className="mt-4">
          <div className="p-4">
            <h3 className="text-sm font-medium mb-2">Request details:</h3>
            <ScrollArea className="h-[100px] rounded-md border p-2">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {requestInfo}
              </pre>
            </ScrollArea>
          </div>
        </Card>
      )}
      
      {/* Results display */}
      {result && (
        <Card className="mt-4">
          <div className="p-4">
            <h3 className="text-lg font-medium mb-2">Result:</h3>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </ScrollArea>
          </div>
        </Card>
      )}
      
      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MCPExecuteResults;
