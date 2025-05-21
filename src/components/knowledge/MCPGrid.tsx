
import React from 'react';
import { MCP } from '@/types/mcp';
import MCPCard from './MCPCard';

interface MCPGridProps {
  mcps: MCP[];
  onEdit: (mcp: MCP) => void;
  onDelete: (id: string) => void;
  onClone: (id: string) => void;
}

const MCPGrid: React.FC<MCPGridProps> = ({ mcps, onEdit, onDelete, onClone }) => {
  if (mcps.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-md">
        <h3 className="text-lg font-medium">No MCPs Found</h3>
        <p className="text-muted-foreground mt-1">
          Create your first MCP tool to connect your AI assistant to external systems.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {mcps.map((mcp) => (
        <MCPCard 
          key={mcp.id} 
          mcp={mcp} 
          onEdit={() => onEdit(mcp)} 
          onDelete={() => onDelete(mcp.id)}
          onClone={() => onClone(mcp.id)}
        />
      ))}
    </div>
  );
};

export default MCPGrid;
