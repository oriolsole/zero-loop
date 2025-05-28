
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useConversationContext } from '@/contexts/ConversationContext';

const DebugInfo: React.FC = () => {
  const { messages, currentSessionId } = useConversationContext();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white p-2 rounded text-xs space-y-1">
      <div>Session: {currentSessionId?.substring(-8) || 'None'}</div>
      <div>Messages: {messages.length}</div>
      <div className="flex gap-1">
        {messages.slice(-3).map((msg, i) => (
          <Badge key={i} variant={msg.role === 'user' ? 'default' : 'secondary'} className="text-xs">
            {msg.role[0].toUpperCase()}{msg.id.substring(0, 4)}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default DebugInfo;
