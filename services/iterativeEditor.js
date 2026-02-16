// services/iterativeEditor.js
// FIXED VERSION - Claude-powered image identification

import logger from '../utils/logger.js';

class IterativeEditor {
  analyzeEditRequest(userPrompt, currentHTML) {
    try {
      const prompt = userPrompt.toLowerCase();
      let targetSection = 'specific-element';
      let elementSelector = null;
      
      if (prompt.includes('hero') || prompt.includes('banner')) {
        targetSection = 'hero';
      } else if (prompt.includes('header') || prompt.includes('nav')) {
        targetSection = 'header';
      } else if (prompt.includes('footer')) {
        targetSection = 'footer';
      } else if (prompt.includes('form') || prompt.includes('contact')) {
        targetSection = 'form';
      } else if (prompt.includes('image') || prompt.includes('picture') || prompt.includes('photo')) {
        targetSection = 'image';
        
        // Extract element name
        const match = prompt.match(/(?:change|replace|update)\s+(?:the\s+)?(.+?)\s+(?:image|picture|photo)/i);
        if (match && match[1]) {
          elementSelector = match[1].trim();
        }
      } else if (prompt.includes('button')) {
        targetSection = 'button';
      } else if (prompt.includes('color') || prompt.includes('background')) {
        targetSection = 'style';
      }

      return {
        targetSection,
        elementSelector,
        editType: this.detectEditType(prompt),
        complexity: this.estimateComplexity(prompt),
        isStyleOnly: this.isStyleOnlyChange(prompt),
        isImageOnly: this.isImageOnlyChange(prompt)
      };
    } catch (error) {
      logger.error('Edit analysis error:', error);
      return {
        targetSection: 'full-page',
        elementSelector: null,
        editType: 'modification',
        complexity: 'medium',
        isStyleOnly: false,
        isImageOnly: false
      };
    }
  }

  /**
   * NEW METHOD: Use Claude to identify which image to change
   * Cost: ~$0.0003-0.0005 (very cheap identification call)
   */
  async identifyImageElement(instruction, html, apiKey) {
    try {
      logger.log('🔍 [IDENTIFY] Calling Claude to identify target image...');
      
      // Extract relevant sections (menu, features, etc.) to reduce tokens
      const htmlSnippet = this.extractRelevantHTMLForIdentification(html);
      
      const identificationPrompt = `You are analyzing HTML to identify which image should be changed.

USER INSTRUCTION: ${instruction}

HTML STRUCTURE:
${htmlSnippet}

TASK: Find the exact <img> tag that matches the user's instruction.

RULES:
1. Look for headings, alt text, or nearby text that matches
2. Return ONLY the complete <img> tag (including all attributes)
3. If no match found, return "NOT_FOUND"

Example:
User: "Change the Truffle Carbonara image"
You find: <h3>Truffle Carbonara</h3> nearby <img src="..." alt="...">
Return: <img src="..." alt="Truffle Carbonara" class="...">

Return ONLY the <img> tag:`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150, // Small - just need the img tag
          messages: [{ role: 'user', content: identificationPrompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const result = data.content[0].text.trim();
      
      const inputTokens = data.usage?.input_tokens || 0;
      const outputTokens = data.usage?.output_tokens || 0;
      const cost = this.estimateCost(inputTokens, outputTokens);
      
      logger.log(`💰 [IDENTIFY] Cost: $${cost.toFixed(6)} (${inputTokens}in + ${outputTokens}out tokens)`);
      
      if (result === 'NOT_FOUND' || !result.includes('<img')) {
        return { success: false, cost };
      }
      
      // Extract img tag from response
      const imgMatch = result.match(/<img[^>]+>/i);
      if (!imgMatch) {
        return { success: false, cost };
      }
      
      logger.log(`✅ [IDENTIFY] Found: ${imgMatch[0].substring(0, 100)}...`);
      return { success: true, imageTag: imgMatch[0], cost };
      
    } catch (error) {
      logger.error('❌ [IDENTIFY] Error:', error);
      return { success: false, error: error.message };
    }
  }

  extractRelevantHTMLForIdentification(html) {
    const sections = [];
    const sectionRegex = /<section[^>]*>[\s\S]*?<\/section>/gi;
    const foundSections = html.match(sectionRegex) || [];
    
    // Only include sections with images
    for (const section of foundSections) {
      if (section.includes('<img')) {
        sections.push(section);
      }
    }
    
    if (sections.length > 0) {
      const combined = sections.join('\n\n');
      return combined.substring(0, 4000); // Limit to 4000 chars
    }
    
    return html.substring(0, 4000);
  }

  isStyleOnlyChange(prompt) {
    const styleKeywords = ['color', 'background', 'font', 'size'];
    return styleKeywords.some(k => prompt.includes(k)) && !prompt.includes('add') && !prompt.includes('image');
  }

  isImageOnlyChange(prompt) {
    return (prompt.includes('image') || prompt.includes('picture') || prompt.includes('photo')) &&
           (prompt.includes('change') || prompt.includes('replace') || prompt.includes('update'));
  }

  detectEditType(prompt) {
    if (prompt.includes('change color')) return 'style-change';
    if (prompt.includes('add')) return 'addition';
    if (prompt.includes('remove')) return 'removal';
    if (prompt.includes('rewrite')) return 'content-change';
    if (prompt.includes('image') && prompt.includes('change')) return 'image-replacement';
    return 'modification';
  }

  estimateComplexity(prompt) {
    if (prompt.length > 200) return 'high';
    if (prompt.length > 100) return 'medium';
    return 'low';
  }

  buildSmartEditPrompt(currentHTML, userInstruction, analysis) {
    if (analysis.isImageOnly || analysis.isStyleOnly || analysis.complexity === 'low') {
      return this.buildLightweightPrompt(currentHTML, userInstruction, analysis);
    }
    return this.buildFullEditPrompt(currentHTML, userInstruction);
  }

  buildLightweightPrompt(currentHTML, userInstruction, analysis) {
    let relevantSection = this.extractRelevantSection(currentHTML, analysis);
    if (!relevantSection) relevantSection = currentHTML;

    return `You are making a small edit to a landing page.

RELEVANT HTML:
${relevantSection}

USER REQUEST:
${userInstruction}

RULES:
1. Make ONLY the requested change
2. PRESERVE all other content
3. For images use: <img src="{{IMAGE_X:[description]}}" alt="...">
4. Return ONLY the modified HTML section

Generate the modified HTML:`;
  }

  buildFullEditPrompt(currentHTML, userInstruction) {
    return `Edit this landing page while preserving all content not mentioned.

CURRENT HTML:
${currentHTML}

USER REQUEST:
${userInstruction}

RULES:
1. PRESERVE all existing content
2. Keep data-sento-form attributes
3. For images: <img src="{{IMAGE_X:[description]}}" alt="...">
4. Return complete modified HTML

Generate modified HTML:`;
  }

  extractRelevantSection(html, analysis) {
    try {
      if (analysis.targetSection === 'image' && analysis.elementSelector) {
        const searchTerm = analysis.elementSelector.toLowerCase();
        const sections = html.match(/<section[^>]*>[\s\S]*?<\/section>/gi) || [];
        for (const section of sections) {
          if (section.toLowerCase().includes(searchTerm)) return section;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  validateEditedHTML(html, originalHTML) {
    const issues = [];
    const warnings = [];
    
    if (originalHTML.includes('data-sento-form') && !html.includes('data-sento-form')) {
      issues.push('Form handler lost');
    }
    
    return { valid: issues.length === 0, issues, warnings };
  }

  sanitizeEditInstruction(instruction) {
    if (typeof instruction !== 'string') throw new Error('Must be string');
    return instruction.replace(/IGNORE\s+.*/gi, '').replace(/```/g, '').trim().slice(0, 2000);
  }

  createVersionMetadata(userInstruction, analysis) {
    return {
      change_description: userInstruction.slice(0, 500),
      target_section: analysis.targetSection,
      edit_type: analysis.editType,
      timestamp: new Date().toISOString()
    };
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  estimateCost(inputTokens, outputTokens) {
    const INPUT_COST = 3.00;  // $ per 1M tokens
    const OUTPUT_COST = 15.00;
    return (inputTokens / 1000000) * INPUT_COST + (outputTokens / 1000000) * OUTPUT_COST;
  }
}

export default new IterativeEditor();
