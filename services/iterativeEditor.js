// services/iterativeEditor.js
// Handles AI-powered iterative editing of landing pages

import logger from '../utils/logger.js';

class IterativeEditor {
  /**
   * Analyze edit request and determine what needs to change
   * @param {string} userPrompt - User's edit instruction
   * @param {string} currentHTML - Current page HTML
   * @returns {Object} - Analysis result
   */
  analyzeEditRequest(userPrompt, currentHTML) {
    try {
      // Simple keyword detection for section targeting
      const prompt = userPrompt.toLowerCase();
      
      let targetSection = 'full-page';
      
      if (prompt.includes('header') || prompt.includes('navigation') || prompt.includes('nav')) {
        targetSection = 'header';
      } else if (prompt.includes('hero') || prompt.includes('banner') || prompt.includes('top section')) {
        targetSection = 'hero';
      } else if (prompt.includes('footer')) {
        targetSection = 'footer';
      } else if (prompt.includes('pricing') || prompt.includes('price')) {
        targetSection = 'pricing';
      } else if (prompt.includes('testimonial') || prompt.includes('review')) {
        targetSection = 'testimonials';
      } else if (prompt.includes('contact') || prompt.includes('form')) {
        targetSection = 'contact';
      }

      return {
        targetSection,
        editType: this.detectEditType(prompt),
        complexity: this.estimateComplexity(prompt)
      };
    } catch (error) {
      logger.error('Edit analysis error:', error);
      return {
        targetSection: 'full-page',
        editType: 'modification',
        complexity: 'medium'
      };
    }
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
   * Build edit prompt for Claude API
   * @param {string} currentHTML - Current page HTML
   * @param {string} userInstruction - User's edit request
   * @returns {string} - Complete prompt for Claude
   */
  buildEditPrompt(currentHTML, userInstruction) {
    return `You are editing an existing landing page. The user wants to make changes.

CURRENT HTML CODE:
${currentHTML}

USER'S EDIT REQUEST:
${userInstruction}

CRITICAL RULES FOR EDITING:
1. PRESERVE ALL FUNCTIONALITY:
   - Keep ALL data-sento-form attributes (form handling)
   - Keep ALL IDs and classes (analytics, scripts)
   - Keep ALL existing JavaScript at bottom of page
   - Keep ALL meta tags and tracking codes

2. IMAGES - Use EXACT same format as original:
   <img src="{{IMAGE_X:[detailed 15+ word description]}}" alt="description">
   - Maintain sequential numbering
   - Keep descriptions detailed (15+ words)
   - Include: what, who, where, style

3. MAKE THE REQUESTED CHANGES:
   - Apply the user's edit precisely
   - Maintain design consistency
   - Keep responsive behavior
   - Preserve color scheme unless specifically asked to change

4. OUTPUT FORMAT:
   - Return COMPLETE modified HTML
   - Do NOT include markdown code fences
   - Do NOT include explanations
   - ONLY return the HTML code

Generate the complete modified HTML now:`;
  }

  /**
   * Validate edited HTML has required attributes
   * @param {string} html - HTML to validate
   * @param {string} originalHTML - Original HTML for comparison
   * @returns {Object} - Validation result
   */
  validateEditedHTML(html, originalHTML) {
    const issues = [];

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
      logger.log(`⚠️ Warning: Script count reduced from ${originalScripts} to ${editedScripts}`);
    }

    // Check HTML structure
    if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
      issues.push('Missing HTML document structure');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings: originalScripts > editedScripts ? ['Script count changed'] : []
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
}

export default new IterativeEditor();
