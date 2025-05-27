
import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Trash2, Loader2 } from 'lucide-react';
import { ConversationSession } from '@/hooks/useAgentConversation';

interface CollapsibleChatSidebarProps {
  sessions: ConversationSession[];
  currentSessionId: string | null;
  onStartNewSession: () => void;
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  isLoading?: boolean;
}

const CollapsibleChatSidebar: React.FC<CollapsibleChatSidebarProps> = ({
  sessions,
  currentSessionId,
  onStartNewSession,
  onLoadSession,
  onDeleteSession,
  isLoading = false
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <span className="font-semibold">Chat History</span>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <Button variant="outline" size="sm" onClick={onStartNewSession}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className="h-[600px]">
              <SidebarMenu>
                {isLoading && sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">Loading conversations...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <SidebarMenuItem key={session.id}>
                      <SidebarMenuButton
                        onClick={() => onLoadSession(session.id)}
                        isActive={currentSessionId === session.id}
                        className="w-full justify-start p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 w-full">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate mb-1">
                                {session.title}
                              </h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {formatDate(session.updated_at)}
                                </Badge>
                                {session.messageCount !== undefined && session.messageCount > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {session.messageCount} msgs
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(session.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default CollapsibleChatSidebar;
