
import { useState, useCallback } from 'react';
import { AtomicTool } from '@/types/tools';

export interface UseToolProgressReturn {
  tools: AtomicTool[];
  isActive: boolean;
  startTool: (name: string, displayName: string) => string;
  completeTool: (id: string, result?: any) => void;
  failTool: (id: string, error: string) => void;
  clearTools: () => void;
}

export const useToolProgress = (): UseToolProgressReturn => {
  const [tools, setTools] = useState<AtomicTool[]>([]);

  const isActive = tools.some(tool => tool.status === 'running');

  const startTool = useCallback((name: string, displayName: string): string => {
    const id = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTool: AtomicTool = {
      id,
      name,
      displayName,
      status: 'running',
      startTime: new Date().toISOString()
    };

    setTools(prev => [...prev, newTool]);
    return id;
  }, []);

  const completeTool = useCallback((id: string, result?: any) => {
    setTools(prev => prev.map(tool => 
      tool.id === id 
        ? { 
            ...tool, 
            status: 'completed', 
            endTime: new Date().toISOString(),
            result
          } 
        : tool
    ));
  }, []);

  const failTool = useCallback((id: string, error: string) => {
    setTools(prev => prev.map(tool => 
      tool.id === id 
        ? { 
            ...tool, 
            status: 'failed', 
            endTime: new Date().toISOString(),
            error
          } 
        : tool
    ));
  }, []);

  const clearTools = useCallback(() => {
    setTools([]);
  }, []);

  return {
    tools,
    isActive,
    startTool,
    completeTool,
    failTool,
    clearTools
  };
};
