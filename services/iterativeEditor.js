// services/iterativeEditor.js
// FIXED VERSION - Section-based editing to reduce cost and improve accuracy

import logger from '../utils/logger.js';

class IterativeEditor {
  /**
   * Analyze edit request and determine what section needs to change
   * @param {string} userPrompt - User's edit instruction
   * @param {string} currentHTML - Current page HTML
   * @returns {Object} - Analysis result
   */
  analyzeEditRequest(userPrompt, currentHTML) {
    try {
      const prompt = userPrompt.toLowerCase();
      
      let targetSection = 'specific-element';
      let elementSelector = null;
      
      // Detect specific element mentions
      if (prompt.includes('hero') || prompt.includes('banner') || prompt.includes('top section')) {
        targetSection = 'hero';
      } else if (prompt.includes('header') || prompt.includes('navigation') || prompt.includes('nav')) {
        targetSection = 'header';
      } else if (prompt.includes('footer')) {
        targetSection = 'footer';
      } else if (prompt.includes('form') || prompt.includes('contact')) {
        targetSection = 'form';
      } else if (prompt.includes('image') || prompt.includes('picture') || prompt.includes('photo')) {
        targetSection = 'image';
        
        // IMPROVED: Multiple patterns to extract which image
        // Pattern 1: "image for X" or "image of X"
        let imageMatch = prompt.match(/(?:image|picture|photo)\s+(?:for|of)\s+([a-z\s]+?)(?:\s+to|\s+with|$)/i);
        
        // Pattern 2: "the X image" or "X's image"  
        if (!imageMatch) {
          imageMatch = prompt.match(/(?:the\s+)?([a-z\s]+?)\s+(?:image|picture|photo)/i);
        }
        
        // Pattern 3: "change/replace X image"
        if (!imageMatch) {
          imageMatch = prompt.match(/(?:change|replace|update)\s+(?:the\s+)?([a-z\s]+?)(?:\s+image|\s+picture|\s+photo)/i);
        }
        
        if (imageMatch && imageMatch[1]) {
          elementSelector = imageMatch[1].trim();
          logger.log(`🔍 [EDIT] Extracted element selector: "${elementSelector}"`);
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
   * Check if this is ONLY a style change (color, size, etc)
   */
  isStyleOnlyChange(prompt) {
    const styleKeywords = ['color', 'background', 'font', 'size', 'spacing', 'padding', 'margin'];
    const hasStyleKeyword = styleKeywords.some(keyword => prompt.includes(keyword));
    const hasContentKeyword = prompt.includes('add') || prompt.includes('text') || prompt.includes('image');
    
    return hasStyleKeyword && !hasContentKeyword;
  }

  /**
   * Check if this is ONLY an image change
   */
  isImageOnlyChange(prompt) {
    return (prompt.includes('image') || prompt.includes('picture') || prompt.includes('photo')) &&
           (prompt.includes('change') || prompt.includes('replace') || prompt.includes('update'));
  }

  /**
   * Detect type of edit requested
   */
  detectEditType(prompt) {
    if (prompt.includes('change color') || prompt.includes('make it')) {
      return 'style-change';
    } else if (prompt.includes('add') || prompt.includes('include')) {
      return 'addition';
    } else if (prompt.includes('remove') || prompt.includes('delete')) {
      return 'removal';
    } else if (prompt.includes('rewrite') || prompt.includes('rephrase')) {
      return 'content-change';
    } else if (prompt.includes('image') && (prompt.includes('change') || prompt.includes('replace'))) {
      return 'image-replacement';
    }
    return 'modification';
  }

  /**
   * Estimate complexity of edit
   */
  estimateComplexity(prompt) {
    if (prompt.length > 200 || prompt.includes('complete') || prompt.includes('entire')) {
      return 'high';
    } else if (prompt.length > 100) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Build SMART edit prompt (section-based, not full regeneration)
   * @param {string} currentHTML - Current page HTML
   * @param {string} userInstruction - User's edit request
   * @param {Object} analysis - Analysis result
   * @returns {string} - Complete prompt for Claude
   */
  buildSmartEditPrompt(currentHTML, userInstruction, analysis) {
    // For simple changes, use a much lighter prompt
    if (analysis.isImageOnly || analysis.isStyleOnly || analysis.complexity === 'low') {
      return this.buildLightweightPrompt(currentHTML, userInstruction, analysis);
    }
    
    // For complex changes, use full prompt (but still warn about preservation)
    return this.buildFullEditPrompt(currentHTML, userInstruction);
  }

  /**
   * Build lightweight prompt for simple changes (COST SAVER)
   */
  buildLightweightPrompt(currentHTML, userInstruction, analysis) {
    // Extract only relevant section (not entire HTML)
    let relevantSection = this.extractRelevantSection(currentHTML, analysis);
    
    if (!relevantSection) {
      relevantSection = currentHTML; // Fallback to full HTML
    }

    return `You are making a small, precise edit to a landing page.

RELEVANT HTML SECTION:
${relevantSection}

USER'S EDIT REQUEST:
${userInstruction}

CRITICAL RULES:
1. Make ONLY the requested change
2. PRESERVE all other content exactly as-is
3. DO NOT remove or modify any other elements
4. If the change involves images, use format: <img src="{{IMAGE_X:[description]}}" alt="...">
5. Return ONLY the modified HTML section

OUTPUT FORMAT:
- Return just the modified section
- Do NOT add markdown fences
- Do NOT add explanations
- Match the original structure exactly

Generate the modified HTML now:`;
  }

  /**
   * Build full edit prompt (for complex changes)
   */
  buildFullEditPrompt(currentHTML, userInstruction) {
    return `You are editing an existing landing page. Make precise changes while preserving all other content.

CURRENT HTML CODE:
${currentHTML}

USER'S EDIT REQUEST:
${userInstruction}

CRITICAL RULES FOR EDITING:
1. PRESERVE ALL EXISTING CONTENT that is not mentioned in the edit request
2. PRESERVE ALL IMAGES - Do not remove any existing images unless specifically asked
3. Keep ALL data-sento-form attributes (form handling)
4. Keep ALL IDs and classes (analytics, scripts)
5. Keep ALL existing JavaScript at bottom of page

2. IMAGES - Use EXACT same format:
   <img src="{{IMAGE_X:[detailed 15+ word description]}}" alt="description">
   - If replacing an image, use the SAME IMAGE NUMBER
   - If adding new images, use next available number

3. MAKE ONLY THE REQUESTED CHANGES:
   - Apply the user's edit precisely
   - DO NOT modify unrelated sections
   - Preserve exact structure and styling

4. OUTPUT FORMAT:
   - Return COMPLETE modified HTML
   - Do NOT include markdown code fences
   - Do NOT include explanations
   - ONLY return the HTML code

Generate the complete modified HTML now:`;
  }

  /**
   * Extract relevant section based on analysis
   */
  extractRelevantSection(html, analysis) {
    try {
      if (analysis.targetSection === 'image' && analysis.elementSelector) {
        // Try to find the specific section containing this element
        const searchTerm = analysis.elementSelector.toLowerCase();
        
        // Find sections containing this term
        const sectionRegex = /<section[^>]*>[\s\S]*?<\/section>/gi;
        const sections = html.match(sectionRegex) || [];
        
        for (const section of sections) {
          if (section.toLowerCase().includes(searchTerm)) {
            return section;
          }
        }
      }
      
      // Try to extract specific section types
      if (analysis.targetSection === 'header') {
        const match = html.match(/<header[^>]*>[\s\S]*?<\/header>/i);
        return match ? match[0] : null;
      }
      
      if (analysis.targetSection === 'hero') {
        // Look for first main section or hero section
        const heroMatch = html.match(/<section[^>]*hero[^>]*>[\s\S]*?<\/section>/i);
        if (heroMatch) return heroMatch[0];
        
        // Fallback to first section
        const firstSection = html.match(/<section[^>]*>[\s\S]*?<\/section>/i);
        return firstSection ? firstSection[0] : null;
      }
      
      if (analysis.targetSection === 'footer') {
        const match = html.match(/<footer[^>]*>[\s\S]*?<\/footer>/i);
        return match ? match[0] : null;
      }
      
      return null;
    } catch (error) {
      logger.error('Section extraction error:', error);
      return null;
    }
  }

  /**
   * Validate edited HTML has required attributes
   * @param {string} html - HTML to validate
   * @param {string} originalHTML - Original HTML for comparison
   * @returns {Object} - Validation result
   */
  validateEditedHTML(html, originalHTML) {
    const issues = [];
    const warnings = [];

    // Check if forms lost their attributes
    const originalHasForms = originalHTML.includes('data-sento-form');
    const editedHasForms = html.includes('data-sento-form');

    if (originalHasForms && !editedHasForms) {
      issues.push('Form handler attributes removed');
    }

    // Check for critical script removal
    const originalScripts = (originalHTML.match(/<script/g) || []).length;
    const editedScripts = (html.match(/<script/g) || []).length;

    if (originalScripts > editedScripts) {
      warnings.push(`Script count changed: ${originalScripts} → ${editedScripts}`);
    }

    // Check if images were accidentally removed
    const originalImages = (originalHTML.match(/<img/g) || []).length;
    const editedImages = (html.match(/<img/g) || []).length;

    if (editedImages < originalImages - 1) { // Allow for 1 image to be removed if intentional
      warnings.push(`Images reduced: ${originalImages} → ${editedImages}`);
    }

    // Check HTML structure
    if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
      issues.push('Missing HTML document structure');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * Sanitize edit instruction
   */
  sanitizeEditInstruction(instruction) {
    if (typeof instruction !== 'string') {
      throw new Error('Edit instruction must be a string');
    }

    return instruction
      .replace(/IGNORE\s+.*/gi, '')
      .replace(/SYSTEM\s*:/gi, '')
      .replace(/```/g, '')
      .trim()
      .slice(0, 2000); // Limit length
  }

  /**
   * Create version metadata
   */
  createVersionMetadata(userInstruction, analysis) {
    return {
      change_description: userInstruction.slice(0, 500),
      target_section: analysis.targetSection,
      edit_type: analysis.editType,
      complexity: analysis.complexity,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate token estimate for cost tracking
   */
  estimateTokens(text) {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate cost of edit operation
   */
  estimateCost(inputTokens, outputTokens) {
    // Sonnet 4 pricing (as of Feb 2026)
    const INPUT_COST_PER_1M = 3.00;  // $3 per 1M input tokens
    const OUTPUT_COST_PER_1M = 15.00; // $15 per 1M output tokens
    
    const inputCost = (inputTokens / 1000000) * INPUT_COST_PER_1M;
    const outputCost = (outputTokens / 1000000) * OUTPUT_COST_PER_1M;
    
    return inputCost + outputCost;
  }
}

export default new IterativeEditor();
