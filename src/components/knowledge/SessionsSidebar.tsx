
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Plus, Trash2, Clock } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  lastMessage: Date;
  messageCount: number;
}

interface SessionsSidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  onStartNewSession: () => void;
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

const SessionsSidebar: React.FC<SessionsSidebarProps> = ({
  sessions,
  currentSessionId,
  onStartNewSession,
  onLoadSession,
  onDeleteSession
}) => {
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="w-80 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Conversations
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-4">
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onStartNewSession}
              className="w-full justify-start"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
            
            <Separator className="my-3" />
            
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                  session.id === currentSessionId ? 'bg-accent' : ''
                }`}
                onClick={() => onLoadSession(session.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(session.lastMessage)}</span>
                      <span>•</span>
                      <span>{session.messageCount} messages</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SessionsSidebar;
