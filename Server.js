// server.js - Complete Express.js server with Smart Compression for Website Generation
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Add CORS middleware - PUT THIS BEFORE ANY ROUTES
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Handle larger payloads for long prompts
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files if needed

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Website generation endpoint with smart compression
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    let optimizedPrompt = prompt;
   
    // SMART COMPRESSION: If prompt is long (>1000 chars), compress it first
    if (prompt.length > 1000) {
      console.log(`🔧 Compressing long prompt (${prompt.length} chars)...`);
     
      const compressionResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          system: 'You are a prompt optimization expert. Convert detailed website requests into concise, structured briefs while preserving ALL key requirements.',
          messages: [{
            role: 'user',
            content: `Convert this detailed website request into a concise structured brief (maximum 500 words). Keep ALL essential details but compress into efficient format:
${prompt}

Format your response as:
**Business Type:** [type]
**Style:** [design style/theme]
**Color Scheme:** [colors]
**Required Sections:** [list all sections]
**Key Features:** [interactive elements, special requests]
**Content Details:** [specific text, images, data to include]
**Target Audience:** [if mentioned]

Be comprehensive but concise. Don't lose any important details.`
          }]
        })
      });

      if (!compressionResponse.ok) {
        console.error('Compression failed, using original prompt');
        optimizedPrompt = prompt; // Fallback to original
      } else {
        const compressionData = await compressionResponse.json();
        optimizedPrompt = compressionData.content[0].text;
        console.log(`✅ Compressed to ${optimizedPrompt.length} chars`);
      }
    }

    // MAIN GENERATION with optimized prompt
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: `You are an elite web developer who creates stunning, production-ready websites. You MUST return ONLY complete HTML code starting with <!DOCTYPE html>.

CRITICAL RULES:
- NEVER include markdown code blocks (\`\`\`html)
- NEVER add explanations or comments outside the HTML
- Return ONLY raw HTML that can be directly rendered
- Make every website visually stunning with modern design
- Use professional color schemes and typography
- Include smooth animations and hover effects
- Ensure full mobile responsiveness
- Use high-quality placeholder images from unsplash.com`,
        messages: [
          {
            role: 'user',
            content: `Create a complete, professional, fully-functional website based on this brief:
${optimizedPrompt}

REQUIREMENTS:
✅ Complete HTML with <!DOCTYPE html>
✅ All sections mentioned in the brief
✅ Modern CSS with gradients, animations, hover effects
✅ Fully responsive (mobile, tablet, desktop)
✅ Professional typography and spacing
✅ Placeholder images from unsplash.com where needed
✅ Smooth scrolling and micro-animations
✅ Production-ready quality
✅ NO markdown formatting - ONLY pure HTML

Return ONLY the HTML code, nothing else.`
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

    // Validate HTML
    if (!htmlCode.includes('<!DOCTYPE html>') && !htmlCode.includes('<!doctype html>')) {
      console.error('Invalid HTML generated - missing DOCTYPE');
      return res.status(400).json({
        error: 'Invalid HTML generated',
        message: 'Generated content does not include proper HTML structure'
      });
    }

    console.log(`✅ Generated website successfully (${htmlCode.length} bytes)`);
    return res.status(200).json({ htmlCode });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Catch-all handler for frontend routes (if serving React app)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔑 CLAUDE_API_KEY configured: ${process.env.CLAUDE_API_KEY ? 'Yes' : 'No - Set it in .env'}`);
});

module.exports = app;
