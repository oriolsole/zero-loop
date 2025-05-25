
import React from 'react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/theme-provider';
import { Brain, Settings, Library, Puzzle, Bot } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import UserMenu from './UserMenu';

const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link className="mr-6 flex items-center space-x-2" to="/">
            <Brain className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              ZeroLoop
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              to="/"
              className={`transition-colors hover:text-foreground/80 ${
                isActive('/') ? 'text-foreground' : 'text-foreground/60'
              }`}
            >
              Learning
            </Link>
            <Link
              to="/knowledge"
              className={`transition-colors hover:text-foreground/80 ${
                isActive('/knowledge') ? 'text-foreground' : 'text-foreground/60'
              }`}
            >
              Knowledge
            </Link>
            <Link
              to="/domains"
              className={`transition-colors hover:text-foreground/80 ${
                isActive('/domains') ? 'text-foreground' : 'text-foreground/60'
              }`}
            >
              Domains
            </Link>
            <Link
              to="/ai-agent"
              className={`transition-colors hover:text-foreground/80 ${
                isActive('/ai-agent') ? 'text-foreground' : 'text-foreground/60'
              }`}
            >
              AI Agent
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Button variant="ghost" className="mr-2" asChild>
              <Link to="/knowledge">
                <Library className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Knowledge</span>
              </Link>
            </Button>
            <Button variant="ghost" className="mr-2" asChild>
              <Link to="/ai-agent">
                <Bot className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">AI Agent</span>
              </Link>
            </Button>
            <Button variant="ghost" className="mr-2" asChild>
              <Link to="/domains">
                <Puzzle className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Domains</span>
              </Link>
            </Button>
          </div>
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            <ModeToggle />
            <UserMenu />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
