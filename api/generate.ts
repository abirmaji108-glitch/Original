import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 60,
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.VITE_CLAUDE_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        stream: false,
        system: 'You are an expert web developer who creates beautiful, modern, production-ready websites. You always return ONLY complete HTML code starting with <!DOCTYPE html>. Never include markdown formatting, explanations, or code blocks - ONLY the raw HTML.',
        messages: [
          {
            role: 'user',
            content: `Create a complete, fully-functional, professional single-page website for: ${prompt}

CRITICAL REQUIREMENTS:
- Return ONLY complete HTML starting with <!DOCTYPE html>
- Include ALL content (hero, features, about, contact, footer)
- Use modern CSS (gradients, animations, responsive)
- Include placeholder images from unsplash.com
- Make it visually stunning and professional
- Ensure all sections are complete
- Add smooth scroll and hover effects
- Use professional color scheme
- NO markdown, NO explanations, ONLY HTML`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API Error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `API Error: ${response.status}`,
        details: errorText 
      });
    }

    const data = await response.json();
    let htmlCode = data.content[0].text;

    // Clean up any markdown artifacts
    htmlCode = htmlCode.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

    // Ensure it starts with DOCTYPE
    if (!htmlCode.includes('<!DOCTYPE html>')) {
      return res.status(400).json({ 
        error: 'Invalid HTML generated',
        message: 'Generated content does not include proper HTML structure' 
      });
    }

    return res.status(200).json({ htmlCode });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
