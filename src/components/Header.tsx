
import React from 'react';
import { Brain } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-secondary/50 backdrop-blur-sm border-b border-border py-3 px-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <Brain className="w-6 h-6 text-primary" />
        <h1 className="text-lg font-semibold">Intelligence in Motion</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Learning Status: <span className="text-success">Active</span></span>
        <span className="text-sm text-muted-foreground">Loops: <span className="font-medium">247</span></span>
      </div>
    </header>
  );
};

export default Header;
