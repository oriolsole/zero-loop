
import React from 'react';
import { Brain, Pause, Play } from 'lucide-react';
import { useLoopStore } from '../store/useLoopStore';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UserMenu from './UserMenu';

const Header = () => {
  const {
    domains,
    activeDomainId,
    isRunningLoop,
    isContinuousMode,
    toggleContinuousMode,
    loopHistory
  } = useLoopStore();
  
  const activeDomain = domains.find(domain => domain.id === activeDomainId) || domains[0];
  const totalLoopsCompleted = activeDomain ? activeDomain.totalLoops : 0;
  const totalHistoryLoops = loopHistory.filter(loop => loop.domainId === activeDomainId).length;
  
  return (
    <header className="bg-secondary/50 backdrop-blur-sm border-b border-border py-3 px-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <Brain className="w-6 h-6 text-primary" />
        <h1 className="text-lg font-semibold">Zero loop</h1>
      </div>
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost"
          size="sm"
          className="flex items-center gap-1"
          onClick={toggleContinuousMode}
        >
          {isContinuousMode ? (
            <>
              <Pause className="w-4 h-4" />
              <span className="text-sm">Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span className="text-sm">Auto Run</span>
            </>
          )}
        </Button>
        
        <span className="text-sm text-muted-foreground">Learning Status: 
          <Badge variant={isContinuousMode ? "outline" : "secondary"} className={`ml-1 ${isRunningLoop ? 'animate-pulse' : ''}`}>
            {isContinuousMode 
              ? "Continuous" 
              : isRunningLoop 
                ? 'Active' 
                : 'Idle'}
          </Badge>
        </span>
        <span className="text-sm text-muted-foreground">Domain: 
          <span className="ml-1 font-medium">{activeDomain?.name || 'None'}</span>
        </span>
        <span className="text-sm text-muted-foreground">Loops: 
          <span className="ml-1 font-medium">{totalLoopsCompleted}</span>
        </span>
        <span className="text-sm text-muted-foreground">History: 
          <span className="ml-1 font-medium">{totalHistoryLoops}</span>
        </span>
        
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;
