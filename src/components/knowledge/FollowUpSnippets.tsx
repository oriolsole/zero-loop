
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Search, Code, Database, FileText } from 'lucide-react';

interface FollowUpSnippet {
  text: string;
  icon?: React.ReactNode;
  category?: 'search' | 'analysis' | 'code' | 'data' | 'general';
}

interface FollowUpSnippetsProps {
  snippets: string[] | FollowUpSnippet[];
  onSnippetClick: (snippet: string) => void;
  title?: string;
}

const FollowUpSnippets: React.FC<FollowUpSnippetsProps> = ({ 
  snippets, 
  onSnippetClick, 
  title = "Continue exploring" 
}) => {
  const getSnippetIcon = (category?: string) => {
    switch (category) {
      case 'search':
        return <Search className="h-3 w-3" />;
      case 'analysis':
        return <Sparkles className="h-3 w-3" />;
      case 'code':
        return <Code className="h-3 w-3" />;
      case 'data':
        return <Database className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const normalizeSnippets = (): FollowUpSnippet[] => {
    return snippets.map(snippet => 
      typeof snippet === 'string' 
        ? { text: snippet, category: 'general' }
        : snippet
    );
  };

  const normalizedSnippets = normalizeSnippets();

  if (normalizedSnippets.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-secondary/20 rounded-xl border border-border/30">
      <div className="flex items-center gap-2 mb-3">
        <ArrowRight className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {normalizedSnippets.map((snippet, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSnippetClick(snippet.text)}
            className="h-auto px-3 py-2 text-xs bg-secondary/40 hover:bg-secondary/60 border-border/50 hover:border-primary/30 transition-all duration-200 text-left"
          >
            <div className="flex items-center gap-2">
              {snippet.icon || getSnippetIcon(snippet.category)}
              <span>{snippet.text}</span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default FollowUpSnippets;
