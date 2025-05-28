
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { load } from "https://esm.sh/cheerio@1.0.0-rc.12";

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScraperOptions {
  url: string;
  selector?: string;
  format?: 'html' | 'text' | 'markdown';
  includeMetadata?: boolean;
  maxDepth?: number;
}

// Helper function to validate URLs
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Main handler for the edge function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { url, selector, format = 'markdown', includeMetadata = true } = requestBody as ScraperOptions;

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    if (!isValidUrl(url)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping URL:', url);

    // Fetch the content from the provided URL with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ZeroLoop Web Scraper)',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch URL: ${response.status} ${response.statusText}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    const $ = load(html);
    
    // Extract metadata
    const metadata: Record<string, string> = {};
    if (includeMetadata) {
      metadata.title = $('title').text().trim() || '';
      metadata.description = $('meta[name="description"]').attr('content')?.trim() || '';
      metadata.ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || '';
      metadata.ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || '';
      metadata.ogImage = $('meta[property="og:image"]').attr('content')?.trim() || '';
      metadata.url = url;
      metadata.domain = new URL(url).hostname;
      metadata.scrapedAt = new Date().toISOString();
    }
    
    // Extract content based on selector
    let content: string;
    if (selector) {
      if (format === 'html') {
        content = $(selector).html() || '';
      } else {
        content = $(selector).text() || '';
      }
    } else {
      // Default to body content if no selector provided
      if (format === 'html') {
        // Remove script and style tags to clean up the HTML
        $('script').remove();
        $('style').remove();
        $('nav').remove(); // Remove navigation
        $('header').remove(); // Remove header
        $('footer').remove(); // Remove footer
        content = $('body').html() || '';
      } else {
        // Extract main content, prioritizing article or main tags
        const mainContent = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
        // Clean up the content
        $('script', mainContent).remove();
        $('style', mainContent).remove();
        $('nav', mainContent).remove();
        $('header', mainContent).remove();
        $('footer', mainContent).remove();
        $('aside', mainContent).remove(); // Remove sidebars
        $('.advertisement', mainContent).remove(); // Remove ads
        $('.ad', mainContent).remove(); // Remove ads
        content = mainContent.text().replace(/\s+/g, ' ').trim();
      }
    }
    
    // Convert HTML to Markdown if requested
    if (format === 'markdown') {
      // Improved HTML to Markdown conversion
      content = content
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
        .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
        .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n')
        .replace(/<ul[^>]*>(.*?)<\/ul>/gis, '$1\n')
        .replace(/<ol[^>]*>(.*?)<\/ol>/gis, '$1\n')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '* $1\n')
        .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<hr\s*\/?>/gi, '\n---\n')
        .replace(/<[^>]+>/g, '') // Remove remaining HTML tags
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize multiple line breaks
        .replace(/^\s+|\s+$/g, '') // Trim whitespace
        .trim();
    }

    // Check if content was successfully extracted
    if (!content || content.length < 10) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No meaningful content could be extracted from the page',
          metadata
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully scraped content:', content.length, 'characters');

    return new Response(
      JSON.stringify({
        success: true,
        content,
        metadata,
        format
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in web scraper:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
