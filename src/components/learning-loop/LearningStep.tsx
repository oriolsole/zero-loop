
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, AlertCircle, Brain } from "lucide-react";

interface LearningStepProps {
  title: string;
  content: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  stepNumber: number;
  isActive?: boolean;
}

export const LearningStep: React.FC<LearningStepProps> = ({
  title,
  content,
  status,
  stepNumber,
  isActive = false
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getCardBorderClass = () => {
    if (isActive) return 'border-primary';
    switch (status) {
      case 'completed':
        return 'border-green-200';
      case 'processing':
        return 'border-blue-200';
      case 'error':
        return 'border-red-200';
      default:
        return 'border-gray-200';
    }
  };

  return (
    <Card className={`transition-all duration-200 ${getCardBorderClass()} ${isActive ? 'shadow-md' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
              {stepNumber}
            </div>
            <span>{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant()} className="text-xs">
              {status}
            </Badge>
            {getStatusIcon()}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {content ? (
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
            <pre className="whitespace-pre-wrap font-sans">{content}</pre>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic flex items-center gap-2">
            <Brain className="h-4 w-4" />
            {status === 'processing' ? 'Thinking...' : 'Waiting to start...'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
