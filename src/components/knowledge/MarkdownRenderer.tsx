
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

    // Step 2: Process section headers (lines ending with colon, including bullet-prefixed ones)
    html = html
      .replace(/^[\s]*[•*-]\s+(.+):[\s]*$/gm, '<h4 class="text-base font-semibold mt-3 mb-2 text-primary">$1</h4>')
      .replace(/^(.+):[\s]*$/gm, '<h4 class="text-base font-semibold mt-3 mb-2 text-primary">$1</h4>');

    // Step 3: Process text formatting (before links to avoid interference)
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-secondary px-1 py-0.5 rounded text-sm font-mono">$1</code>');

    // Step 4: Process markdown links [text](url) FIRST (highest priority)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline break-all">$1</a>');

    // Step 5: Process bracket links [text] (but not if they're already part of markdown links)
    html = html.replace(/(?<!="[^"]*)\[([^\]]+)\](?!\([^)]*\))/g, '<button class="text-blue-400 hover:text-blue-300 underline cursor-pointer font-medium" onclick="window.handleBracketClick(\'$1\')">[$1]</button>');

    // Step 6: Process standalone URLs (with negative lookbehind/lookahead to avoid HTML)
    // This regex avoids URLs that are already inside href attributes or other HTML
    html = html.replace(/(?<!href=["']|src=["']|content=["'])(?<!\w)(https?:\/\/[^\s<>"{}|\\^`\[\]()]+?)(?=[\s<>"{}|\\^`\[\](),.;!?]|$)(?![^<]*>)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline break-all">$1</a>');

    // Step 7: Process actual lists (only lines that are part of multi-item lists)
    // First, identify and temporarily mark actual list structures
    const lines = html.split('<br>');
    const processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      const prevLine = i > 0 ? lines[i - 1].trim() : '';
      
      // Check if this is a bullet/dash line
      if (/^[\s]*[-*•]\s+(.*)$/.test(line) && !line.endsWith(':')) {
        // Check if previous or next line is also a list item (making this part of an actual list)
        const isPrevList = /^[\s]*[-*•]\s+/.test(prevLine) && !prevLine.endsWith(':');
        const isNextList = /^[\s]*[-*•]\s+/.test(nextLine) && !nextLine.endsWith(':');
        
        if (isPrevList || isNextList) {
          // This is part of an actual list
          const content = line.replace(/^[\s]*[-*•]\s+(.*)$/, '$1');
          processedLines.push(`<li class="ml-4">${content}</li>`);
        } else {
          // This is a standalone bullet point, treat as regular text
          processedLines.push(line);
        }
      } else if (/^[\s]*\d+\.\s+(.*)$/.test(line)) {
        // Check for numbered lists
        const isPrevNumList = /^[\s]*\d+\.\s+/.test(prevLine);
        const isNextNumList = /^[\s]*\d+\.\s+/.test(nextLine);
        
        if (isPrevNumList || isNextNumList) {
          const content = line.replace(/^[\s]*\d+\.\s+(.*)$/, '$1');
          processedLines.push(`<li class="ml-4">${content}</li>`);
        } else {
          processedLines.push(line);
        }
      } else {
        processedLines.push(line);
      }
    }
    
    html = processedLines.join('<br>');

    // Step 8: Process blockquotes and other elements
    html = html
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
      .replace(/^> (.*)$/gm, '<blockquote class="border-l-4 border-muted pl-4 italic text-muted-foreground">$1</blockquote>')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<hr\s*\/?>/gi, '\n---\n')
      .replace(/\n/g, '<br>');

    // Step 9: Wrap consecutive <li> elements in <ul> tags
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
