// services/iterativeEditor.js
// CLEAN VERSION - Handles text, color, layout, button edits via AI
// Image changes handled by pencil icon picker (free, no AI needed)

import logger from '../utils/logger.js';

class IterativeEditor {

  /**
   * Analyze edit request and determine what type of change is needed
   */
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
        // Image changes are handled by pencil icon - NOT by AI
        targetSection = 'image';
        elementSelector = null;
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
   * Check if this is ONLY a style change (color, font, size, etc)
   */
  isStyleOnlyChange(prompt) {
    const styleKeywords = ['color', 'background', 'font', 'size'];
    return styleKeywords.some(k => prompt.includes(k)) &&
           !prompt.includes('add') &&
           !prompt.includes('image');
  }

  /**
   * Check if this is an image change request
   * (Used to redirect user to pencil icon picker)
   */
  isImageOnlyChange(prompt) {
    return (
      prompt.includes('image') ||
      prompt.includes('picture') ||
      prompt.includes('photo')
    ) && (
      prompt.includes('change') ||
      prompt.includes('replace') ||
      prompt.includes('update')
    );
  }

  /**
   * Detect the type of edit being requested
   */
  detectEditType(prompt) {
    if (prompt.includes('change color') || prompt.includes('make it')) return 'style-change';
    if (prompt.includes('add') || prompt.includes('include'))           return 'addition';
    if (prompt.includes('remove') || prompt.includes('delete'))         return 'removal';
    if (prompt.includes('rewrite') || prompt.includes('rephrase'))      return 'content-change';
    if (prompt.includes('image') && prompt.includes('change'))          return 'image-replacement';
    return 'modification';
  }

  /**
   * Estimate complexity of the edit request
   */
  estimateComplexity(prompt) {
    if (prompt.length > 200 || prompt.includes('complete') || prompt.includes('entire')) return 'high';
    if (prompt.length > 100) return 'medium';
    return 'low';
  }

  /**
   * Build the appropriate prompt based on edit complexity
   */
  buildSmartEditPrompt(currentHTML, userInstruction, analysis) {
    // Simple/style edits: use lightweight prompt (cheaper)
    if (analysis.isStyleOnly || analysis.complexity === 'low') {
      return this.buildLightweightPrompt(currentHTML, userInstruction, analysis);
    }
    // Complex edits: send full HTML
    return this.buildFullEditPrompt(currentHTML, userInstruction);
  }

  /**
   * Lightweight prompt - extracts only the relevant section
   * Used for: color changes, text tweaks, button edits, simple layout changes
   */
  buildLightweightPrompt(currentHTML, userInstruction, analysis) {
    const relevantSection = this.extractRelevantSection(currentHTML, analysis) || currentHTML;

    return `You are making a precise edit to a landing page section.

RELEVANT HTML SECTION:
${relevantSection}

USER REQUEST:
${userInstruction}

STRICT RULES:
1. Make ONLY the change the user asked for
2. PRESERVE every other element exactly as-is
3. DO NOT add, remove, or modify anything not mentioned
4. Preserve all classes, IDs, and data attributes
5. Keep all existing images (do NOT change image src values)
6. Return ONLY the modified HTML section, no explanations

Generate the modified HTML section:`;
  }

  /**
   * Full edit prompt - sends complete HTML
   * Used for: adding new sections, complex layout changes, multi-element changes
   */
  buildFullEditPrompt(currentHTML, userInstruction) {
    return `You are editing an existing landing page. Make only the requested change.

CURRENT HTML:
${currentHTML}

USER REQUEST:
${userInstruction}

STRICT RULES:
1. Make ONLY the change the user requested
2. PRESERVE ALL existing content not mentioned in the request
3. Keep ALL existing images exactly as they are (do NOT change src values)
4. Keep data-sento-form attributes on all forms
5. Keep all JavaScript at the bottom of the page
6. Return COMPLETE modified HTML, no markdown fences, no explanations

Generate the complete modified HTML:`;
  }

  /**
   * Extract relevant HTML section based on what is being edited
   * Reduces tokens for section-specific edits
   */
  extractRelevantSection(html, analysis) {
    try {
      // For header edits
      if (analysis.targetSection === 'header') {
        const match = html.match(/<header[^>]*>[\s\S]*?<\/header>/i);
        return match ? match[0] : null;
      }

      // For hero/banner edits - find first section or element with hero/banner class/id
      if (analysis.targetSection === 'hero') {
        const heroMatch = html.match(/<section[^>]*(?:hero|banner)[^>]*>[\s\S]*?<\/section>/i);
        if (heroMatch) return heroMatch[0];
        // Fallback: first section
        const firstSection = html.match(/<section[^>]*>[\s\S]*?<\/section>/i);
        return firstSection ? firstSection[0] : null;
      }

      // For footer edits
      if (analysis.targetSection === 'footer') {
        const match = html.match(/<footer[^>]*>[\s\S]*?<\/footer>/i);
        return match ? match[0] : null;
      }

      // For style/color edits - find the style block + first section
      if (analysis.targetSection === 'style') {
        const styleMatch = html.match(/<style[^>]*>[\s\S]*?<\/style>/i);
        return styleMatch ? styleMatch[0] : null;
      }

      // For button edits - try to find the section with a button
      if (analysis.targetSection === 'button') {
        const sections = html.match(/<section[^>]*>[\s\S]*?<\/section>/gi) || [];
        for (const section of sections) {
          if (section.includes('<button') || section.includes('btn')) {
            return section;
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Section extraction error:', error);
      return null;
    }
  }

  /**
   * Validate that the edited HTML didn't lose critical attributes
   */
  validateEditedHTML(html, originalHTML) {
    const issues = [];
    const warnings = [];

    // Check forms didn't lose their handler
    if (originalHTML.includes('data-sento-form') && !html.includes('data-sento-form')) {
      issues.push('Form handler attribute lost');
    }

    // Check scripts weren't removed
    const originalScripts = (originalHTML.match(/<script/g) || []).length;
    const editedScripts = (html.match(/<script/g) || []).length;
    if (originalScripts > editedScripts) {
      warnings.push(`Script count changed: ${originalScripts} → ${editedScripts}`);
    }

    // Check images weren't removed
    const originalImages = (originalHTML.match(/<img/g) || []).length;
    const editedImages = (html.match(/<img/g) || []).length;
    if (editedImages < originalImages - 1) {
      warnings.push(`Image count reduced: ${originalImages} → ${editedImages}`);
    }

    // Check basic HTML structure
    if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
      issues.push('Missing HTML document structure');
    }

    return { valid: issues.length === 0, issues, warnings };
  }

  /**
   * Sanitize user instruction to prevent prompt injection
   */
  sanitizeEditInstruction(instruction) {
    if (typeof instruction !== 'string') throw new Error('Instruction must be a string');
    return instruction
      .replace(/IGNORE\s+.*/gi, '')
      .replace(/SYSTEM\s*:/gi, '')
      .replace(/```/g, '')
      .trim()
      .slice(0, 2000);
  }

  /**
   * Create version metadata for tracking edit history
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
   * Estimate token count for cost calculation
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate API cost based on token usage
   */
  estimateCost(inputTokens, outputTokens) {
    const INPUT_COST_PER_1M  = 3.00;
    const OUTPUT_COST_PER_1M = 15.00;
    const inputCost  = (inputTokens  / 1_000_000) * INPUT_COST_PER_1M;
    const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;
    return inputCost + outputCost;
  }
}

export default new IterativeEditor();
