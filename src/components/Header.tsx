
import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useLoopStore } from '../store/useLoopStore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Brain, PlusCircle, User, Database, BookOpen, Settings } from 'lucide-react';
import UserMenu from './UserMenu';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { domains } = useLoopStore();
  
  const handleAddDomain = () => {
    navigate('/domain/new');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  
  return (
    <header className="sticky top-0 z-10 bg-background border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 mr-6">
              <Brain className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">ZeroLoop</h1>
            </Link>
            
            {user && (
              <nav className="hidden md:flex items-center gap-1">
                <Button
                  variant={isActive('/') ? "default" : "ghost"}
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <Link to="/">
                    <Brain className="h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
                
                <Button
                  variant={isActive('/knowledge') ? "default" : "ghost"}
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <Link to="/knowledge">
                    <BookOpen className="h-4 w-4" />
                    Knowledge
                  </Link>
                </Button>
                
                <Button
                  variant={isActive('/settings') ? "default" : "ghost"}
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <Link to="/settings">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </Button>
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {user && (
              <>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full hidden sm:inline-block">
                  {domains.length} Domain{domains.length !== 1 ? 's' : ''}
                </span>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddDomain}
                  className="hidden sm:flex items-center gap-1"
                >
                  <PlusCircle className="h-4 w-4" />
                  New Domain
                </Button>
              </>
            )}
            
            {user ? (
              <UserMenu />
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
