
import React from 'react';
import { ToolProgressItem } from '@/types/tools';
import EnhancedToolCard from './EnhancedToolCard';

interface ToolExecutionCardProps {
  tool: ToolProgressItem;
  compact?: boolean;
}

const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({ tool, compact = false }) => {
  return <EnhancedToolCard tool={tool} compact={compact} />;
};

export default ToolExecutionCard;
