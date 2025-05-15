
import { DomainEngine } from '../types/intelligence';
import { FileSearch } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

// The web scraping engine extracts and processes content from specific web pages
export const webScrapingEngine: DomainEngine = {
  generateTask: async () => {
    try {
      return "Enter a URL to scrape content from a web page.";
    } catch (error) {
      console.error('Error generating web scraping task:', error);
      toast.error('Failed to generate scraping task');
      return 'Error generating scraping task. Please try again later.';
    }
  },

  solveTask: async (task: string) => {
    try {
      // Extract URL from the task
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = task.match(urlRegex);
      
      if (!matches || matches.length === 0) {
        return "No valid URL found in the task. Please provide a URL to scrape.";
      }
      
      const url = matches[0];
      
      // Call the web scraper edge function
      const { data, error } = await supabase.functions.invoke('web-scraper', {
        body: {
          url,
          format: 'markdown',
          includeMetadata: true
        }
      });
      
      if (error) {
        throw new Error(`Web scraping error: ${error.message}`);
      }
      
      if (!data.success) {
        throw new Error(`Scraping failed: ${data.error}`);
      }
      
      // Format the response
      const metadata = data.metadata;
      let solution = `# Scraped Content from ${metadata.domain}\n\n`;
      
      if (metadata.title) {
        solution += `## ${metadata.title}\n\n`;
      }
      
      if (metadata.description) {
        solution += `*${metadata.description}*\n\n`;
      }
      
      solution += `---\n\n${data.content}\n\n---\n\n`;
      solution += `Source: [${url}](${url})\n`;
      solution += `Scraped at: ${new Date(metadata.scrapedAt).toLocaleString()}\n`;
      
      return solution;
    } catch (error) {
      console.error('Error scraping web content:', error);
      toast.error('Failed to scrape web content');
      return `Error scraping web content: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`;
    }
  },

  verifySolution: async (task: string, solution: string) => {
    try {
      // Basic verification - check if content was extracted successfully
      const contentLength = solution.length;
      const isContentSubstantial = contentLength > 500;
      const hasMarkdownFormatting = solution.includes('#') && solution.includes('\n\n');
      const hasSourceAttribution = solution.toLowerCase().includes('source:');
      
      const isCorrect = isContentSubstantial && hasMarkdownFormatting && hasSourceAttribution;
      let explanation = "";
      
      if (isCorrect) {
        explanation = `Successfully scraped web content (${contentLength} characters) with proper formatting and attribution.`;
      } else {
        explanation = `The scraped content may be incomplete or improperly formatted. `;
        if (!isContentSubstantial) explanation += "Content length is insufficient. ";
        if (!hasMarkdownFormatting) explanation += "Markdown formatting is missing. ";
        if (!hasSourceAttribution) explanation += "Source attribution is missing. ";
      }
      
      return {
        isCorrect,
        explanation
      };
    } catch (error) {
      console.error('Error verifying scrape result:', error);
      return {
        isCorrect: false,
        explanation: `Error verifying scraped content: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  reflect: async (task: string, solution: string, verification: string) => {
    try {
      // Extract URL from the task
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = task.match(urlRegex);
      const url = matches && matches.length > 0 ? matches[0] : "unknown URL";
      
      // Basic reflection on the scraping process
      let reflection = `## Web Scraping Analysis\n\n`;
      
      reflection += `### Target\n`;
      reflection += `- URL: ${url}\n`;
      reflection += `- Domain: ${new URL(url).hostname}\n\n`;
      
      reflection += `### Content Extraction\n`;
      const contentLength = solution.length;
      reflection += `- Content length: ${contentLength} characters\n`;
      reflection += `- Content format: Markdown\n\n`;
      
      reflection += `### Quality Assessment\n`;
      if (verification.includes('Successfully scraped')) {
        reflection += `- Quality: Good\n`;
        reflection += `- Completeness: High\n`;
        reflection += `- The content was successfully extracted and formatted.\n\n`;
      } else {
        reflection += `- Quality: Needs improvement\n`;
        reflection += `- Issues: ${verification}\n\n`;
      }
      
      reflection += `### Usage Recommendations\n`;
      reflection += `- This content can be added to the knowledge base for future reference.\n`;
      reflection += `- Consider extracting key insights or specific sections for more targeted knowledge entries.\n`;
      
      return reflection;
    } catch (error) {
      console.error('Error reflecting on scrape:', error);
      return `Failed to generate reflection on scraped content due to an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },

  mutateTask: async (task: string, solution: string, verification: string, reflection: string) => {
    try {
      // Extract URL from the task
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = task.match(urlRegex);
      
      if (!matches || matches.length === 0) {
        return "Enter a new URL to scrape different web content.";
      }
      
      const url = matches[0];
      const domain = new URL(url).hostname;
      
      // Generate follow-up URLs or related scraping tasks
      let mutatedTask = "";
      
      // Check if it's a blog or article
      if (url.includes("/blog/") || url.includes("/article/") || url.includes("/post/")) {
        mutatedTask = `Scrape the main blog index page at https://${domain}/blog/ to find more related articles.`;
      } 
      // Check if it's a product page
      else if (url.includes("/product/") || url.includes("/item/")) {
        mutatedTask = `Scrape the related products or category page at https://${domain}/products/ or https://${domain}/category/.`;
      }
      // Check if it's documentation
      else if (url.includes("/docs/") || url.includes("/documentation/")) {
        mutatedTask = `Scrape the documentation table of contents at https://${domain}/docs/ to build a knowledge structure.`;
      }
      // Default to scraping about page
      else {
        mutatedTask = `Scrape the about page at https://${domain}/about/ to gather organization context.`;
      }
      
      return mutatedTask;
    } catch (error) {
      console.error('Error mutating scraping task:', error);
      return "Enter a new URL to scrape different web content.";
    }
  }
};

// Add metadata for the engine
export const webScrapingEngineMetadata = {
  id: 'web-scraping',
  name: 'Web Scraper',
  icon: FileSearch,
  description: 'Extracts and processes content from specific web pages',
  sources: ['web', 'code'],
  color: 'emerald'
};
