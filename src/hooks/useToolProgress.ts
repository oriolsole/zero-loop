import { useState, useCallback } from 'react';
import { ToolProgressItem } from '@/types/tools';

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

  // Keep tools visible longer and consider active when any tools exist
  const isActive = tools.length > 0;

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

    console.log(`🚀 [TOOL-PROGRESS] Starting tool: ${name} with ID: ${id}`);
    setTools(prev => {
      // Remove any existing tool with the same name to avoid duplicates
      const filtered = prev.filter(t => t.name !== name);
      return [...filtered, newTool];
    });
    
    // Transition to executing after a brief delay for UI feedback
    setTimeout(() => {
      setTools(prev => prev.map(tool => 
        tool.id === id ? { ...tool, status: 'executing', progress: 50 } : tool
      ));
    }, 300);

    return id;
  }, []);

  const updateTool = useCallback((id: string, updates: Partial<ToolProgressItem>) => {
    console.log(`🔄 [TOOL-PROGRESS] Updating tool: ${id}`, updates);
    setTools(prev => prev.map(tool => 
      tool.id === id ? { ...tool, ...updates } : tool
    ));
  }, []);

  const completeTool = useCallback((id: string, result?: any) => {
    console.log(`✅ [TOOL-PROGRESS] Completing tool: ${id}`);
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
    
    // Keep completed tools visible for better user experience
    setTimeout(() => {
      setTools(prev => prev.filter(t => t.id !== id));
    }, 15000); // Increased visibility time
  }, []);

  const failTool = useCallback((id: string, error: string) => {
    console.log(`❌ [TOOL-PROGRESS] Failing tool: ${id}`, error);
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
    
    // Keep failed tools visible longer for error visibility
    setTimeout(() => {
      setTools(prev => prev.filter(t => t.id !== id));
    }, 20000); // Increased error visibility time
  }, []);

  const setToolProgress = useCallback((id: string, progress: number) => {
    setTools(prev => prev.map(tool => 
      tool.id === id ? { ...tool, progress } : tool
    ));
  }, []);

  const clearTools = useCallback(() => {
    console.log(`🧹 [TOOL-PROGRESS] Clearing all tools`);
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
