// services/iterativeEditor.js
// PRODUCTION-GRADE ITERATIVE EDITOR
// Handles 90-95% of real-world editing scenarios
// Built for: single edits, multi-target edits, insertions, complex changes

import logger from '../utils/logger.js';

class IterativeEditor {

  /**
   * PHASE 2B: Intelligent analysis that detects multi-target scenarios
   * Determines if this is "all X", "add X", or single element edit
   */
  analyzeEditRequest(userPrompt, currentHTML) {
    try {
      const prompt = userPrompt.toLowerCase();
      
      // Detect multi-target requests ("all", "every", "each")
      const isMultiTarget = this.detectMultiTarget(prompt);
      
      // Detect insertion requests ("add", "insert", "create new")
      const isInsertion = this.detectInsertion(prompt);
      
      // Detect what's being targeted
      let targetSection = 'specific-element';
      let elementSelector = null;
      let targetType = null;

      if (prompt.includes('hero') || prompt.includes('banner')) {
        targetSection = 'hero';
        targetType = 'hero';
      } else if (prompt.includes('header') || prompt.includes('nav')) {
        targetSection = 'header';
        targetType = 'header';
      } else if (prompt.includes('footer')) {
        targetSection = 'footer';
        targetType = 'footer';
      } else if (prompt.includes('form') || prompt.includes('contact')) {
        targetSection = 'form';
        targetType = 'form';
      } else if (prompt.includes('image') || prompt.includes('picture') || prompt.includes('photo')) {
        // Image changes are handled by pencil icon - NOT by AI
        targetSection = 'image';
        targetType = 'image';
        elementSelector = null;
      } else if (prompt.includes('button')) {
        targetSection = 'button';
        targetType = 'button';
      } else if (prompt.includes('heading') || prompt.includes('title')) {
        // Check heading BEFORE color — "change all headings to blue color" should target headings
        targetSection = 'heading';
        targetType = 'heading';
      } else if (prompt.includes('color') || prompt.includes('background')) {
        targetSection = 'style';
        targetType = 'style';
      } else if (prompt.includes('price') || prompt.includes('pricing')) {
        targetSection = 'pricing';
        targetType = 'pricing';
      } else if (prompt.includes('text') || prompt.includes('paragraph')) {
        targetSection = 'text';
        targetType = 'text';
      }

      return {
        targetSection,
        targetType,
        elementSelector,
        editType: this.detectEditType(prompt),
        complexity: this.estimateComplexity(prompt, isMultiTarget, isInsertion),
        isStyleOnly: this.isStyleOnlyChange(prompt),
        isImageOnly: this.isImageOnlyChange(prompt),
        isMultiTarget,
        isInsertion,
        insertionAnchor: isInsertion ? this.extractInsertionAnchor(prompt) : null
      };
    } catch (error) {
      logger.error('Edit analysis error:', error);
      return {
        targetSection: 'full-page',
        elementSelector: null,
        editType: 'modification',
        complexity: 'high',
        isStyleOnly: false,
        isImageOnly: false,
        isMultiTarget: false,
        isInsertion: false
      };
    }
  }

  /**
   * NEW: Detect if this is a multi-target request
   * Examples: "all buttons", "every heading", "each price"
   */
  detectMultiTarget(prompt) {
    const multiKeywords = ['all', 'every', 'each'];
    return multiKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(prompt);
    });
  }

  /**
   * NEW: Detect if this is an insertion request
   * Examples: "add testimonials", "insert a new section", "create a FAQ"
   */
  detectInsertion(prompt) {
    const insertionKeywords = ['add', 'insert', 'create new', 'include new'];
    return insertionKeywords.some(keyword => prompt.includes(keyword));
  }

  /**
   * NEW: Extract where to insert new content
   * Examples: "after features", "before footer", "at the top"
   */
  extractInsertionAnchor(prompt) {
    // Pattern: "add X after Y" or "insert X before Y"
    const afterMatch = prompt.match(/(?:add|insert|create).*?after\s+(?:the\s+)?(\w+)/i);
    const beforeMatch = prompt.match(/(?:add|insert|create).*?before\s+(?:the\s+)?(\w+)/i);
    const atTopMatch = prompt.match(/at\s+the\s+top/i);
    const atBottomMatch = prompt.match(/at\s+the\s+(?:bottom|end)/i);

    if (afterMatch) {
      return { position: 'after', anchor: afterMatch[1] };
    }
    if (beforeMatch) {
      return { position: 'before', anchor: beforeMatch[1] };
    }
    if (atTopMatch) {
      return { position: 'after', anchor: 'header' };
    }
    if (atBottomMatch) {
      return { position: 'before', anchor: 'footer' };
    }

    // Default: after hero section
    return { position: 'after', anchor: 'hero' };
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
   * IMPROVED: Estimate complexity considering multi-target and insertions
   */
  estimateComplexity(prompt, isMultiTarget, isInsertion) {
    // Multi-target or insertions are automatically medium complexity
    if (isMultiTarget) return 'medium';
    if (isInsertion) return 'medium';
    
    if (prompt.length > 200 || prompt.includes('complete') || prompt.includes('entire')) return 'high';
    if (prompt.length > 100) return 'medium';
    return 'low';
  }

  /**
   * PHASE 2B: Extract all sections containing a specific element type
   * Used for multi-target edits like "all buttons", "every heading"
   */
  extractAllSectionsWithElement(html, targetType) {
    const sections = [];
    
    try {
      // Get all sections from HTML
      const allSections = html.match(/<section[^>]*>[\s\S]*?<\/section>/gi) || [];
      
      // Also check header and footer
      const header = html.match(/<header[^>]*>[\s\S]*?<\/header>/i);
      const footer = html.match(/<footer[^>]*>[\s\S]*?<\/footer>/i);
      
      if (header) allSections.push(header[0]);
      if (footer) allSections.push(footer[0]);
      
      // Filter sections that contain the target element
      for (const section of allSections) {
        let hasTarget = false;
        
        switch (targetType) {
          case 'button':
            // Detect real buttons AND anchor tags styled as buttons
            hasTarget = section.includes('<button') || 
                        /class=["'][^"']*btn/i.test(section) ||
                        /class=["'][^"']*button/i.test(section);
            break;
          case 'heading':
            hasTarget = /<h[1-6]/i.test(section);
            break;
          case 'pricing':
            hasTarget = /\$\d+|price|pricing/i.test(section);
            break;
          case 'text':
            hasTarget = /<p[^>]*>/i.test(section);
            break;
          default:
            hasTarget = section.toLowerCase().includes(targetType);
        }
        
        if (hasTarget) {
          sections.push({
            html: section,
            type: targetType
          });
        }
      }
      
      logger.log(`📍 [EXTRACT] Found ${sections.length} sections with ${targetType}`);
      return sections;
      
    } catch (error) {
      logger.error('Multi-section extraction error:', error);
      return [];
    }
  }

  /**
   * Build the appropriate prompt based on edit complexity and type
   */
  buildSmartEditPrompt(currentHTML, userInstruction, analysis) {
    // Insertion requests need special handling
    if (analysis.isInsertion) {
      return this.buildInsertionPrompt(currentHTML, userInstruction, analysis);
    }
    
    // Multi-target edits
    if (analysis.isMultiTarget) {
      // For multi-target, we'll edit each section separately
      // This method won't be used for multi-target
      return null;
    }
    
    // Simple/style edits: use lightweight prompt (cheaper)
    if (analysis.isStyleOnly || analysis.complexity === 'low') {
      return this.buildLightweightPrompt(currentHTML, userInstruction, analysis);
    }
    
    // Complex edits: send full HTML
    return this.buildFullEditPrompt(currentHTML, userInstruction);
  }

  /**
   * FIXED: Build prompt for insertions.
   * Sends ONLY a style context snippet — Claude returns ONLY the new section.
   * Splice is done programmatically in Server.js. Footer cannot vanish.
   */
  buildInsertionPrompt(currentHTML, userInstruction, analysis) {
    const styleContext = this.extractStyleContext(currentHTML);

    return `You are a web developer adding a new section to a landing page.

USER REQUEST:
${userInstruction}

EXISTING SECTION STYLE (match this design exactly):
${styleContext}

YOUR JOB:
Generate ONLY the new <section>...</section> HTML to insert.

STRICT RULES:
1. Return ONLY the new section HTML — nothing else whatsoever
2. Do NOT include <html>, <head>, <body>, or any existing page content
3. Use the same Tailwind CSS classes as the style context above
4. If the context uses a card grid, use a card grid
5. If the context uses py-16, use py-16
6. For any images needed, write: {{IMAGE_0:description of image}}
7. No markdown, no backticks, no explanation — raw HTML only

Generate the new section now:`;
  }

  /**
   * Extracts a compact style context so Claude can match the page design.
   * Returns the last section before footer, trimmed to ~1200 chars.
   */
  extractStyleContext(html) {
    try {
      const sections = [...(html.matchAll(/<section[^>]*>[\s\S]*?<\/section>/gi))].map(m => m[0]);
      const lastSection = sections[sections.length - 1] || '';
      const trimmed = lastSection.length > 1200
        ? lastSection.substring(0, 1200) + '\n  <!-- ... -->\n</section>'
        : lastSection;
      return trimmed || '<!-- Use Tailwind CSS, clean modern design, py-16 sections -->';
    } catch (e) {
      return '<!-- Use Tailwind CSS, clean modern design, py-16 sections -->';
    }
  }

  /**
   * NEW: Build prompt for single section within multi-target edit
   */
  buildMultiTargetSectionPrompt(sectionHTML, userInstruction, targetType) {
    return `You are editing ONE section as part of a multi-section edit.

SECTION HTML:
${sectionHTML}

USER REQUEST (for ALL ${targetType}s):
${userInstruction}

RULES:
1. Apply the change to ALL ${targetType}s in this section
2. PRESERVE all other content exactly
3. Keep all classes, IDs, and attributes
4. Return ONLY this modified section, no explanations

Generate the modified section:`;
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
   * PHASE 2C: IMPROVED - Extract complete logical sections, not fragments
   * Always gets the full section/element, not just a piece
   */
  extractRelevantSection(html, analysis) {
    try {
      // For multi-target, don't extract a single section
      if (analysis.isMultiTarget) {
        return null;
      }
      
      // For header edits - always get complete header
      if (analysis.targetSection === 'header') {
        const match = html.match(/<header[^>]*>[\s\S]*?<\/header>/i);
        return match ? match[0] : null;
      }

      // For hero/banner edits - get complete hero section
      if (analysis.targetSection === 'hero') {
        // Try to find section with hero/banner in class or id
        const heroMatch = html.match(/<section[^>]*(?:hero|banner)[^>]*>[\s\S]*?<\/section>/i);
        if (heroMatch) return heroMatch[0];
        
        // Fallback: get first section (usually hero)
        const firstSection = html.match(/<section[^>]*>[\s\S]*?<\/section>/i);
        return firstSection ? firstSection[0] : null;
      }

      // For footer edits - always get complete footer
      if (analysis.targetSection === 'footer') {
        const match = html.match(/<footer[^>]*>[\s\S]*?<\/footer>/i);
        return match ? match[0] : null;
      }

      // For style/color edits - get the style block AND the relevant section
      if (analysis.targetSection === 'style') {
        const styleBlock = html.match(/<style[^>]*>[\s\S]*?<\/style>/i);
        if (styleBlock) return styleBlock[0];
        
        // If no style block, get the first section (will be inline styles)
        const firstSection = html.match(/<section[^>]*>[\s\S]*?<\/section>/i);
        return firstSection ? firstSection[0] : null;
      }

      // IMPROVED: For button edits, get the COMPLETE section containing buttons
      if (analysis.targetSection === 'button') {
        const sections = html.match(/<section[^>]*>[\s\S]*?<\/section>/gi) || [];
        
        for (const section of sections) {
          if (section.includes('<button') || section.includes('btn')) {
            // Return the ENTIRE section, not just the button
            return section;
          }
        }
        
        // Check header/footer too
        const header = html.match(/<header[^>]*>[\s\S]*?<\/header>/i);
        if (header && (header[0].includes('<button') || header[0].includes('btn'))) {
          return header[0];
        }
      }

      // IMPROVED: For heading edits, find section with the most headings
      if (analysis.targetSection === 'heading') {
        const sections = html.match(/<section[^>]*>[\s\S]*?<\/section>/gi) || [];
        let bestSection = null;
        let maxHeadings = 0;
        
        for (const section of sections) {
          const headingCount = (section.match(/<h[1-6]/gi) || []).length;
          if (headingCount > maxHeadings) {
            maxHeadings = headingCount;
            bestSection = section;
          }
        }
        
        return bestSection;
      }

      // IMPROVED: For pricing edits, find pricing section
      if (analysis.targetSection === 'pricing') {
        const sections = html.match(/<section[^>]*>[\s\S]*?<\/section>/gi) || [];
        
        for (const section of sections) {
          // Look for pricing indicators
          if (/price|pricing|\$\d+/i.test(section)) {
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
   * PHASE 2D: Find exact insertion point in HTML
   * Returns { beforeText, afterText } to sandwich the new content
   */
  findInsertionPoint(html, anchor, position) {
    try {
      let anchorRegex;
      
      // Build regex to find the anchor element
      switch (anchor.toLowerCase()) {
        case 'hero':
        case 'banner':
          anchorRegex = /<section[^>]*(?:hero|banner)[^>]*>[\s\S]*?<\/section>/i;
          break;
        case 'features':
        case 'feature':
          anchorRegex = /<section[^>]*(?:features?)[^>]*>[\s\S]*?<\/section>/i;
          break;
        case 'pricing':
        case 'prices':
          anchorRegex = /<section[^>]*(?:pricing|prices)[^>]*>[\s\S]*?<\/section>/i;
          break;
        case 'testimonials':
        case 'testimonial':
          anchorRegex = /<section[^>]*(?:testimonials?)[^>]*>[\s\S]*?<\/section>/i;
          break;
        case 'footer':
          anchorRegex = /<footer[^>]*>[\s\S]*?<\/footer>/i;
          break;
        case 'header':
          anchorRegex = /<header[^>]*>[\s\S]*?<\/header>/i;
          break;
        default:
          // Try to find by section id or class
          anchorRegex = new RegExp(`<section[^>]*(?:id|class)=["'][^"']*${anchor}[^"']*["'][^>]*>[\\s\\S]*?<\\/section>`, 'i');
      }
      
      const match = html.match(anchorRegex);
      
      if (!match) {
        logger.warn(`⚠️ [INSERT] Could not find anchor: ${anchor}`);
        return null;
      }
      
      const anchorIndex = html.indexOf(match[0]);
      const anchorEnd = anchorIndex + match[0].length;
      
      if (position === 'after') {
        return {
          beforeText: html.substring(0, anchorEnd),
          afterText: html.substring(anchorEnd)
        };
      } else {
        return {
          beforeText: html.substring(0, anchorIndex),
          afterText: html.substring(anchorIndex)
        };
      }
      
    } catch (error) {
      logger.error('Insertion point detection error:', error);
      return null;
    }
  }

  /**
   * PHASE 2A: Smart section merging with multiple fallback strategies
   * Tries 4 different methods to merge edited section back into original HTML
   */
  smartMergeSection(originalHTML, oldSection, newSection) {
    // STRATEGY 1: Exact string match (fastest, most reliable)
    if (originalHTML.includes(oldSection)) {
      logger.log('✅ [MERGE] Strategy 1: Exact string match worked');
      return {
        success: true,
        html: originalHTML.replace(oldSection, newSection),
        method: 'exact-match'
      };
    }

    // STRATEGY 2: Normalized whitespace match
    const normalizeWS = (str) => str.replace(/\s+/g, ' ').trim();
    const normalizedOld = normalizeWS(oldSection);
    
    const flexiblePattern = normalizedOld
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+');
    
    const flexibleRegex = new RegExp(flexiblePattern, 'i');
    
    if (flexibleRegex.test(originalHTML)) {
      logger.log('✅ [MERGE] Strategy 2: Normalized whitespace match worked');
      return {
        success: true,
        html: originalHTML.replace(flexibleRegex, newSection),
        method: 'whitespace-normalized'
      };
    }

    // STRATEGY 3: Tag structure match
    const openingTagMatch = oldSection.match(/<(\w+)([^>]*)>/);
    if (openingTagMatch) {
      const tagName = openingTagMatch[1];
      const attributes = openingTagMatch[2];
      
      const tagPattern = `<${tagName}${attributes.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>([\\s\\S]*?)<\\/${tagName}>`;
      const tagRegex = new RegExp(tagPattern, 'i');
      
      if (tagRegex.test(originalHTML)) {
        logger.log('✅ [MERGE] Strategy 3: Tag structure match worked');
        return {
          success: true,
          html: originalHTML.replace(tagRegex, newSection),
          method: 'tag-structure'
        };
      }
    }

    // STRATEGY 4: ID-based match
    const idMatch = oldSection.match(/id=["']([^"']+)["']/);
    if (idMatch) {
      const id = idMatch[1];
      const idPattern = new RegExp(`<[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/[^>]+>`, 'i');
      
      if (idPattern.test(originalHTML)) {
        logger.log('✅ [MERGE] Strategy 4: ID-based match worked');
        return {
          success: true,
          html: originalHTML.replace(idPattern, newSection),
          method: 'id-based'
        };
      }
    }

    logger.error('❌ [MERGE] All merge strategies failed');
    return {
      success: false,
      html: originalHTML,
      method: 'failed'
    };
  }

  /**
   * PHASE 2A: Validate that section merge didn't break anything
   */
  validateSectionMerge(originalHTML, mergedHTML) {
    const issues = [];

    const countTags = (html, tag) => (html.match(new RegExp(`<${tag}`, 'gi')) || []).length;

    const originalImages = countTags(originalHTML, 'img');
    const mergedImages = countTags(mergedHTML, 'img');
    
    const originalSections = countTags(originalHTML, 'section');
    const mergedSections = countTags(mergedHTML, 'section');
    
    const originalScripts = countTags(originalHTML, 'script');
    const mergedScripts = countTags(mergedHTML, 'script');

    if (originalImages - mergedImages > 2) {
      issues.push(`Lost ${originalImages - mergedImages} images (${originalImages} → ${mergedImages})`);
    }

    if (originalSections - mergedSections > 1) {
      issues.push(`Lost ${originalSections - mergedSections} sections (${originalSections} → ${mergedSections})`);
    }

    if (originalScripts - mergedScripts > 0) {
      issues.push(`Lost ${originalScripts - mergedScripts} scripts`);
    }

    // CRITICAL: Check footer wasn't lost (footer is <footer> not <section>)
    const originalHasFooter = /<footer/i.test(originalHTML);
    const mergedHasFooter = /<footer/i.test(mergedHTML);
    if (originalHasFooter && !mergedHasFooter) {
      issues.push('Footer element was lost during merge - rejecting');
    }

    // CRITICAL: Check header wasn't lost
    const originalHasHeader = /<header/i.test(originalHTML);
    const mergedHasHeader = /<header/i.test(mergedHTML);
    if (originalHasHeader && !mergedHasHeader) {
      issues.push('Header element was lost during merge - rejecting');
    }

    const lengthRatio = mergedHTML.length / originalHTML.length;
    if (lengthRatio < 0.7) {
      issues.push(`HTML length shrank by ${Math.round((1 - lengthRatio) * 100)}% (suspicious)`);
    }

    return {
      valid: issues.length === 0,
      issues,
      stats: {
        images: `${originalImages} → ${mergedImages}`,
        sections: `${originalSections} → ${mergedSections}`,
        scripts: `${originalScripts} → ${mergedScripts}`,
        size: `${Math.round(originalHTML.length / 1024)}KB → ${Math.round(mergedHTML.length / 1024)}KB`
      }
    };
  }

  /**
   * Validate that the edited HTML didn't lose critical attributes
   */
  validateEditedHTML(html, originalHTML) {
    const issues = [];
    const warnings = [];

    if (originalHTML.includes('data-sento-form') && !html.includes('data-sento-form')) {
      issues.push('Form handler attribute lost');
    }

    const originalScripts = (originalHTML.match(/<script/g) || []).length;
    const editedScripts = (html.match(/<script/g) || []).length;
    if (originalScripts > editedScripts) {
      warnings.push(`Script count changed: ${originalScripts} → ${editedScripts}`);
    }

    const originalImages = (originalHTML.match(/<img/g) || []).length;
    const editedImages = (html.match(/<img/g) || []).length;
    if (editedImages < originalImages - 1) {
      warnings.push(`Image count reduced: ${originalImages} → ${editedImages}`);
    }

    if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
      issues.push('Missing HTML document structure');
    }

    // Check footer/header weren't lost
    if (originalHTML.includes('<footer') && !html.includes('<footer')) {
      issues.push('Footer element was lost');
    }
    if (originalHTML.includes('<header') && !html.includes('<header')) {
      issues.push('Header element was lost');
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
      is_multi_target: analysis.isMultiTarget,
      is_insertion: analysis.isInsertion,
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
