import React from 'react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { Bot, Brain, Settings, Database, Puzzle, Search, MessageSquare, Wrench } from 'lucide-react';
import UserMenu from './UserMenu';
import { cn } from '@/lib/utils';

const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <Brain className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              ZeroLoop
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              to="/"
              className={cn(
                "transition-colors hover:text-foreground/80",
                isActive("/") ? "text-foreground" : "text-foreground/60"
              )}
            >
              Learning Loops
            </Link>
            <Link
              to="/knowledge"
              className={cn(
                "transition-colors hover:text-foreground/80",
                isActive("/knowledge") ? "text-foreground" : "text-foreground/60"
              )}
            >
              Knowledge
            </Link>
            <Link
              to="/tools"
              className={cn(
                "transition-colors hover:text-foreground/80",
                isActive("/tools") ? "text-foreground" : "text-foreground/60"
              )}
            >
              Tools
            </Link>
            <Link
              to="/ai-agent"
              className={cn(
                "transition-colors hover:text-foreground/80",
                isActive("/ai-agent") ? "text-foreground" : "text-foreground/60"
              )}
            >
              AI Agent
            </Link>
            <Link
              to="/agents"
              className={cn(
                "transition-colors hover:text-foreground/80",
                isActive("/agents") ? "text-foreground" : "text-foreground/60"
              )}
            >
              Agents
            </Link>
            <Link
              to="/domains"
              className={cn(
                "transition-colors hover:text-foreground/80",
                isActive("/domains") ? "text-foreground" : "text-foreground/60"
              )}
            >
              Domains
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Mobile navigation placeholder */}
          </div>
          <nav className="flex items-center">
            <UserMenu />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
