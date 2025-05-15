
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { load } from "https://esm.sh/cheerio@1.0.0-rc.12";
import { corsHeaders } from "./cors.ts";

interface ScraperOptions {
  url: string;
  selector?: string;
  format?: 'html' | 'text' | 'markdown';
  includeMetadata?: boolean;
  maxDepth?: number;
}

// Main handler for the edge function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, selector, format = 'markdown', includeMetadata = true } = await req.json() as ScraperOptions;

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the content from the provided URL
    const response = await fetch(url);
    
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
      metadata.title = $('title').text() || '';
      metadata.description = $('meta[name="description"]').attr('content') || '';
      metadata.ogTitle = $('meta[property="og:title"]').attr('content') || '';
      metadata.ogDescription = $('meta[property="og:description"]').attr('content') || '';
      metadata.ogImage = $('meta[property="og:image"]').attr('content') || '';
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
        // Remove script tags to clean up the HTML
        $('script').remove();
        $('style').remove();
        content = $('body').html() || '';
      } else {
        // Extract main content, prioritizing article or main tags
        const mainContent = $('article').length ? $('article') : $('main').length ? $('main') : $('body');
        // Clean up the text
        $('script', mainContent).remove();
        $('style', mainContent).remove();
        content = mainContent.text().replace(/\s+/g, ' ').trim();
      }
    }
    
    // Convert HTML to Markdown if requested
    if (format === 'markdown') {
      // Very simple HTML to Markdown conversion
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
        .replace(/<ul[^>]*>(.*?)<\/ul>/gis, '$1\n')
        .replace(/<ol[^>]*>(.*?)<\/ol>/gis, '$1\n')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '* $1\n')
        .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
        .replace(/<[^>]+>/g, '') // Remove remaining HTML tags
        .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
        .trim();
    }

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
