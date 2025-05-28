
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

    // Convert markdown-style formatting to HTML
    let html = text
      // Bold text (**text** or __text__)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic text (*text* or _text_)
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Inline code (`code`)
      .replace(/`(.*?)`/g, '<code class="bg-secondary px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      // Headers (### Header)
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      // Markdown links [text](url) - MUST come before bracket links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline break-all">$1</a>')
      // Bracket links [text] - but not markdown links [text](url) - now safe since markdown links are already processed
      .replace(/\[([^\]]+)\]/g, '<button class="text-blue-400 hover:text-blue-300 underline cursor-pointer font-medium" onclick="window.handleBracketClick(\'$1\')">[$1]</button>')
      // URLs (make them clickable) - improved regex for better URL detection
      // This regex looks for URLs that are NOT already inside href attributes
      .replace(/(?<!href=["'])(?<!href=)https?:\/\/[^\s<>"{}|\\^`[\]]+(?=[\s<>"{}|\\^`[\]]*(?:[^>]*>|$))/g, (match) => {
        // Clean the URL by removing any trailing punctuation or HTML-like content
        const cleanUrl = match.replace(/[<>"{}|\\^`[\]]+.*$/, '').replace(/[.,;:!?]+$/, '');
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline break-all">${cleanUrl}</a>`;
      })
      // Bullet lists (- item or * item)
      .replace(/^[\s]*[-*]\s+(.*)$/gm, '<li class="ml-4">$1</li>')
      // Numbered lists (1. item)
      .replace(/^[\s]*\d+\.\s+(.*)$/gm, '<li class="ml-4">$1</li>')
      // Line breaks
      .replace(/\n/g, '<br>');

    // Wrap consecutive <li> elements in <ul> tags
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
