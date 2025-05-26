
import { useState, useCallback } from 'react';
import { ToolProgressItem } from '@/components/knowledge/ToolProgressStream';

export interface UseToolProgressReturn {
  tools: ToolProgressItem[];
  isActive: boolean;
  startTool: (name: string, displayName: string, parameters?: Record<string, any>) => string;
  updateTool: (id: string, updates: Partial<ToolProgressItem>) => void;
  completeTool: (id: string, result?: any) => void;
  failTool: (id: string, error: string) => void;
  clearTools: () => void;
  setToolProgress: (id: string, progress: number) => void;
}

export const useToolProgress = (): UseToolProgressReturn => {
  const [tools, setTools] = useState<ToolProgressItem[]>([]);

  const isActive = tools.some(tool => 
    tool.status === 'pending' || 
    tool.status === 'starting' || 
    tool.status === 'executing'
  );

  const startTool = useCallback((name: string, displayName: string, parameters?: Record<string, any>): string => {
    const id = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTool: ToolProgressItem = {
      id,
      name,
      displayName,
      status: 'starting',
      startTime: new Date().toISOString(),
      parameters,
      progress: 0
    };

    setTools(prev => [...prev, newTool]);
    
    // Automatically move to executing status after a short delay
    setTimeout(() => {
      setTools(prev => prev.map(tool => 
        tool.id === id ? { ...tool, status: 'executing' } : tool
      ));
    }, 100);

    return id;
  }, []);

  const updateTool = useCallback((id: string, updates: Partial<ToolProgressItem>) => {
    setTools(prev => prev.map(tool => 
      tool.id === id ? { ...tool, ...updates } : tool
    ));
  }, []);

  const completeTool = useCallback((id: string, result?: any) => {
    setTools(prev => prev.map(tool => 
      tool.id === id 
        ? { 
            ...tool, 
            status: 'completed', 
            endTime: new Date().toISOString(),
            result,
            progress: 100
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

  const setToolProgress = useCallback((id: string, progress: number) => {
    setTools(prev => prev.map(tool => 
      tool.id === id ? { ...tool, progress } : tool
    ));
  }, []);

  const clearTools = useCallback(() => {
    setTools([]);
  }, []);

  return {
    tools,
    isActive,
    startTool,
    updateTool,
    completeTool,
    failTool,
    clearTools,
    setToolProgress
  };
};
