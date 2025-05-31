
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ToolProgressBarProps {
  value: number;
}

const ToolProgressBar: React.FC<ToolProgressBarProps> = ({ value }) => {
  return <Progress value={value} className="h-2" />;
};

export default ToolProgressBar;
