
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLoopStore } from '../store/useLoopStore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Brain, PlusCircle, User, Database } from 'lucide-react';
import UserMenu from './UserMenu';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { domains } = useLoopStore();
  
  const handleAddDomain = () => {
    navigate('/domain/new');
  };
  
  return (
    <header className="sticky top-0 z-10 bg-background shadow">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">ZeroLoop</h1>
          </Link>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {domains.length} Domain{domains.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          {user && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/knowledge')}
              className="hidden sm:flex items-center gap-1"
            >
              <Database className="h-4 w-4" />
              Knowledge
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleAddDomain}
            className="hidden sm:flex items-center gap-1"
          >
            <PlusCircle className="h-4 w-4" />
            New Domain
          </Button>
          
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
    </header>
  );
};

export default Header;
