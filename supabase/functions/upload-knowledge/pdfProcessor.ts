
import { extractTextFromImage } from "./imageProcessor.ts";

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(fileBase64: string, fileName: string): Promise<string> {
  try {
    // Decode the base64 file
    const binaryData = Uint8Array.from(atob(fileBase64.split(',')[1]), c => c.charCodeAt(0));
    
    // Try to extract text using a simple PDF text extraction approach
    const extractedText = await extractPDFText(binaryData);
    
    if (extractedText && extractedText.trim().length > 50) {
      console.log(`Successfully extracted ${extractedText.length} characters from PDF`);
      return extractedText;
    }
    
    // If text extraction failed or returned minimal text, try OCR using OpenAI Vision
    console.log('PDF text extraction yielded minimal content, attempting OCR...');
    return await extractPDFWithOCR(fileBase64, fileName);
    
  } catch (error) {
    console.error('Error processing PDF:', error);
    // Fallback to OCR if text extraction fails
    try {
      return await extractPDFWithOCR(fileBase64, fileName);
    } catch (ocrError) {
      console.error('OCR fallback also failed:', ocrError);
      return `[PDF file: ${fileName}. Text extraction failed: ${error.message}]`;
    }
  }
}

/**
 * Extract text directly from PDF using basic text extraction
 */
async function extractPDFText(pdfData: Uint8Array): Promise<string> {
  try {
    // Convert binary data to text and look for text content
    const pdfText = new TextDecoder('utf-8', { fatal: false }).decode(pdfData);
    
    // Simple PDF text extraction - look for text between common PDF text markers
    const textMatches = pdfText.match(/BT\s*(.*?)\s*ET/gs);
    if (textMatches) {
      let extractedText = '';
      textMatches.forEach(match => {
        // Remove PDF commands and extract readable text
        const cleanText = match
          .replace(/BT|ET/g, '')
          .replace(/\/\w+\s+\d+(\.\d+)?\s+Tf/g, '') // Remove font commands
          .replace(/\d+(\.\d+)?\s+\d+(\.\d+)?\s+Td/g, '') // Remove positioning
          .replace(/\d+(\.\d+)?\s+TL/g, '') // Remove leading
          .replace(/\(\s*(.*?)\s*\)\s*Tj/g, '$1') // Extract text from Tj commands
          .replace(/\[\s*(.*?)\s*\]\s*TJ/g, '$1') // Extract text from TJ commands
          .trim();
        
        if (cleanText) {
          extractedText += cleanText + ' ';
        }
      });
      
      return extractedText.trim();
    }
    
    // Alternative: Look for readable text patterns
    const readableText = pdfText
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Keep only printable ASCII
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // If we found substantial readable text, return it
    if (readableText.length > 50) {
      return readableText;
    }
    
    return '';
  } catch (error) {
    console.error('Error in basic PDF text extraction:', error);
    return '';
  }
}

/**
 * Extract text from PDF using OCR via OpenAI Vision API
 */
async function extractPDFWithOCR(fileBase64: string, fileName: string): Promise<string> {
  console.log('Attempting OCR extraction for PDF:', fileName);
  
  try {
    // For OCR, we'll treat the PDF as an image and use OpenAI Vision
    // This works well for scanned PDFs or image-based PDFs
    const ocrText = await extractTextFromImage(fileBase64);
    
    if (ocrText && ocrText.trim().length > 0) {
      console.log(`OCR extraction successful: ${ocrText.length} characters`);
      return `[OCR-extracted content from ${fileName}]\n\n${ocrText}`;
    }
    
    return `[PDF file: ${fileName}. OCR extraction yielded no readable content.]`;
    
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw new Error(`OCR processing failed: ${error.message}`);
  }
}

/**
 * Determine if a PDF likely contains extractable text vs images
 */
export function analyzePDFContent(pdfData: Uint8Array): { hasText: boolean; hasImages: boolean; confidence: number } {
  try {
    const pdfText = new TextDecoder('utf-8', { fatal: false }).decode(pdfData);
    
    // Look for text content indicators
    const hasTextContent = /BT\s.*?ET/s.test(pdfText) || /\(\s*\w+.*?\)\s*Tj/s.test(pdfText);
    
    // Look for image content indicators
    const hasImageContent = /\/Type\s*\/XObject/.test(pdfText) || /\/Subtype\s*\/Image/.test(pdfText);
    
    // Calculate confidence based on content analysis
    let confidence = 0.5;
    if (hasTextContent && !hasImageContent) confidence = 0.9;
    else if (hasImageContent && !hasTextContent) confidence = 0.1;
    else if (hasTextContent && hasImageContent) confidence = 0.7;
    
    return {
      hasText: hasTextContent,
      hasImages: hasImageContent,
      confidence
    };
  } catch (error) {
    console.error('Error analyzing PDF content:', error);
    return { hasText: false, hasImages: true, confidence: 0.3 };
  }
}
