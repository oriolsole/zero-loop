
/**
 * Process an image to extract text and description using OpenAI
 */
export async function extractTextFromImage(imageBase64: string): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  // For images, we'll use the OpenAI API to generate a description
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this image and provide a detailed description of what you see. Include any visible text.' },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    })
  });

  const data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    const extractedText = data.choices[0].message.content || '';
    console.log(`Generated ${extractedText.length} characters of image description`);
    return extractedText;
  }
  
  throw new Error('Failed to analyze image with OpenAI');
}
