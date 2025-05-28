
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Eye, Lightbulb, CheckCircle } from 'lucide-react';
import { ConversationMessage } from '@/hooks/useAgentConversation';

interface LoopProgressIndicatorProps {
  loopNumber: number;
  messages: ConversationMessage[];
}

const LoopProgressIndicator: React.FC<LoopProgressIndicatorProps> = ({ 
  loopNumber, 
  messages 
}) => {
  // Get the improvement reasoning from reflection messages
  const reflectionMessage = messages.find(m => m.messageType === 'loop-reflection');
  const improvementReasoning = reflectionMessage?.improvementReasoning;

  const getLoopIcon = () => {
    const hasComplete = messages.some(m => m.messageType === 'loop-complete');
    const hasEnhancement = messages.some(m => m.messageType === 'loop-enhancement');
    const hasReflection = messages.some(m => m.messageType === 'loop-reflection');
    
    if (hasComplete) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (hasEnhancement) return <Lightbulb className="h-4 w-4 text-blue-500" />;
    if (hasReflection) return <Eye className="h-4 w-4 text-purple-500" />;
    return <RotateCcw className="h-4 w-4 text-orange-500" />;
  };

  const getLoopStatus = () => {
    const hasComplete = messages.some(m => m.messageType === 'loop-complete');
    const hasEnhancement = messages.some(m => m.messageType === 'loop-enhancement');
    const hasReflection = messages.some(m => m.messageType === 'loop-reflection');
    
    if (hasComplete) return 'Completed';
    if (hasEnhancement) return 'Enhancing';
    if (hasReflection) return 'Reflecting';
    return 'Processing';
  };

  return (
    <div className="border-l-4 border-primary/30 pl-4 py-3 bg-muted/20 rounded-r-lg">
      <div className="flex items-center gap-3 mb-2">
        {getLoopIcon()}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            Loop {loopNumber}
          </span>
          <Badge variant="outline" className="text-xs">
            {getLoopStatus()}
          </Badge>
        </div>
      </div>
      
      {improvementReasoning && (
        <div className="text-sm text-muted-foreground/90 leading-relaxed">
          <span className="font-medium">Improving because:</span> {improvementReasoning}
        </div>
      )}
      
      <div className="text-xs text-muted-foreground/70 mt-2">
        {messages.length} message{messages.length !== 1 ? 's' : ''} in this iteration
      </div>
    </div>
  );
};

export default LoopProgressIndicator;
