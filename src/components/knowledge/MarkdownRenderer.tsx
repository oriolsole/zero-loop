
import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onBracketLinkClick?: (text: string) => void;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = "",
  onBracketLinkClick 
}) => {
  const handleBracketClick = (text: string) => {
    if (onBracketLinkClick) {
      onBracketLinkClick(text);
    } else {
      // Default behavior: try to open as URL or search
      if (text.match(/^[A-Z]+-\d+$/)) {
        // Looks like a JIRA ticket (e.g., AMPCM-131)
        console.log(`Bracket link clicked: ${text} (JIRA ticket)`);
        // Could integrate with JIRA here
      } else {
        // General search or navigation
        console.log(`Bracket link clicked: ${text} (general)`);
        // Could trigger a search here
      }
    }
  };

  const renderContent = (text: string) => {
    if (!text) return text;

    let html = text;

    // Step 1: Process headers first (before any link processing)
    html = html
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');

    // Step 2: Process text formatting (before links to avoid interference)
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-secondary px-1 py-0.5 rounded text-sm font-mono">$1</code>');

    // Step 3: Process markdown links [text](url) FIRST (highest priority)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline break-all">$1</a>');

    // Step 4: Process bracket links [text] (but not if they're already part of markdown links)
    html = html.replace(/(?<!="[^"]*)\[([^\]]+)\](?!\([^)]*\))/g, '<button class="text-blue-400 hover:text-blue-300 underline cursor-pointer font-medium" onclick="window.handleBracketClick(\'$1\')">[$1]</button>');

    // Step 5: Process standalone URLs (with negative lookbehind/lookahead to avoid HTML)
    // This regex avoids URLs that are already inside href attributes or other HTML
    html = html.replace(/(?<!href=["']|src=["']|content=["'])(?<!\w)(https?:\/\/[^\s<>"{}|\\^`\[\]()]+?)(?=[\s<>"{}|\\^`\[\](),.;!?]|$)(?![^<]*>)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline break-all">$1</a>');

    // Step 6: Process lists
    html = html
      .replace(/^[\s]*[-*]\s+(.*)$/gm, '<li class="ml-4">$1</li>')
      .replace(/^[\s]*\d+\.\s+(.*)$/gm, '<li class="ml-4">$1</li>');

    // Step 7: Process blockquotes and other elements
    html = html
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
      .replace(/^> (.*)$/gm, '<blockquote class="border-l-4 border-muted pl-4 italic text-muted-foreground">$1</blockquote>')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<hr\s*\/?>/gi, '\n---\n')
      .replace(/\n/g, '<br>');

    // Step 8: Wrap consecutive <li> elements in <ul> tags
    html = html.replace(/(<li[^>]*>.*?<\/li>)(\s*<br>\s*<li[^>]*>.*?<\/li>)*/g, (match) => {
      const listItems = match.replace(/<br>\s*/g, '');
      return `<ul class="list-disc list-inside space-y-1 my-2">${listItems}</ul>`;
    });

    return html;
  };

  // Set up global click handler for bracket links
  React.useEffect(() => {
    (window as any).handleBracketClick = handleBracketClick;
    return () => {
      delete (window as any).handleBracketClick;
    };
  }, [onBracketLinkClick]);

  return (
    <div 
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: renderContent(content) }}
    />
  );
};

export default MarkdownRenderer;
