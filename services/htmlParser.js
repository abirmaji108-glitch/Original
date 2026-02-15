// services/htmlParser.js
// Safe HTML parsing and manipulation utilities

class HTMLParser {
  /**
   * Extract specific section from HTML
   * @param {string} html - Full HTML document
   * @param {string} sectionType - Type of section to extract (header, hero, footer, etc.)
   * @returns {string|null} - Extracted HTML section or null
   */
  extractSection(html, sectionType) {
    try {
      switch (sectionType) {
        case 'header':
          return this.extractBetweenTags(html, '<header', '</header>');
        case 'hero':
          // Try to find hero section (usually first main section or div with hero class)
          const heroByClass = this.extractBySelector(html, 'class=".*hero.*"');
          if (heroByClass) return heroByClass;
          // Fallback to first section after header
          return this.extractFirstSection(html);
        case 'footer':
          return this.extractBetweenTags(html, '<footer', '</footer>');
        case 'pricing':
          return this.extractBySelector(html, 'class=".*pricing.*"') ||
                 this.extractBySelector(html, 'id=".*pricing.*"');
        case 'testimonials':
          return this.extractBySelector(html, 'class=".*testimonial.*"') ||
                 this.extractBySelector(html, 'id=".*testimonial.*"');
        case 'contact':
          return this.extractBySelector(html, 'class=".*contact.*"') ||
                 this.extractBySelector(html, 'id=".*contact.*"') ||
                 this.extractBetweenTags(html, '<form', '</form>');
        default:
          return null;
      }
    } catch (error) {
      console.error('Section extraction error:', error);
      return null;
    }
  }

  /**
   * Extract content between HTML tags
   */
  extractBetweenTags(html, startTag, endTag) {
    const startIndex = html.indexOf(startTag);
    if (startIndex === -1) return null;

    const endIndex = html.indexOf(endTag, startIndex);
    if (endIndex === -1) return null;

    return html.substring(startIndex, endIndex + endTag.length);
  }

  /**
   * Extract element by selector pattern
   */
  extractBySelector(html, selectorPattern) {
    const regex = new RegExp(`<[^>]*${selectorPattern}[^>]*>`, 'i');
    const match = html.match(regex);
    
    if (!match) return null;

    const startIndex = match.index;
    const tagName = match[0].match(/<(\w+)/)[1];
    const endTag = `</${tagName}>`;
    
    let depth = 1;
    let currentIndex = startIndex + match[0].length;
    
    while (depth > 0 && currentIndex < html.length) {
      const nextOpen = html.indexOf(`<${tagName}`, currentIndex);
      const nextClose = html.indexOf(endTag, currentIndex);
      
      if (nextClose === -1) break;
      
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        currentIndex = nextOpen + tagName.length + 1;
      } else {
        depth--;
        currentIndex = nextClose + endTag.length;
      }
    }
    
    return html.substring(startIndex, currentIndex);
  }

  /**
   * Extract first main section after header
   */
  extractFirstSection(html) {
    const headerEnd = html.indexOf('</header>');
    if (headerEnd === -1) return null;

    const sectionStart = html.indexOf('<section', headerEnd);
    if (sectionStart === -1) {
      // Try div as fallback
      const divStart = html.indexOf('<div', headerEnd);
      if (divStart === -1) return null;
      return this.extractBetweenTags(html.substring(divStart), '<div', '</div>');
    }

    return this.extractBetweenTags(html.substring(sectionStart), '<section', '</section>');
  }

  /**
   * Replace section in full HTML
   * @param {string} fullHTML - Complete HTML document
   * @param {string} oldSection - Section to replace
   * @param {string} newSection - New section content
   * @returns {string} - Modified HTML
   */
  replaceSection(fullHTML, oldSection, newSection) {
    if (!oldSection || !newSection) return fullHTML;
    
    // Find and replace the section
    const index = fullHTML.indexOf(oldSection);
    if (index === -1) {
      console.warn('Could not find section to replace');
      return fullHTML;
    }

    return fullHTML.substring(0, index) + 
           newSection + 
           fullHTML.substring(index + oldSection.length);
  }

  /**
   * Ensure critical attributes are preserved
   */
  preserveCriticalAttributes(newHTML, originalHTML) {
    let preserved = newHTML;

    // Preserve form handlers
    const formRegex = /<form[^>]*>/gi;
    const originalForms = originalHTML.match(formRegex) || [];
    const newForms = newHTML.match(formRegex) || [];

    originalForms.forEach((originalForm, index) => {
      if (newForms[index] && originalForm.includes('data-sento-form')) {
        if (!newForms[index].includes('data-sento-form')) {
          // Add back the attribute
          preserved = preserved.replace(
            newForms[index],
            newForms[index].replace('<form', '<form data-sento-form="true"')
          );
        }
      }
    });

    return preserved;
  }

  /**
   * Validate HTML structure
   */
  isValidHTML(html) {
    if (!html || typeof html !== 'string') return false;
    
    // Basic validation
    const hasDoctype = html.includes('<!DOCTYPE') || html.includes('<!doctype');
    const hasHtmlTag = html.includes('<html') || html.includes('<HTML');
    const hasBody = html.includes('<body') || html.includes('<BODY');
    
    return hasDoctype && hasHtmlTag && hasBody;
  }

  /**
   * Clean and normalize HTML
   */
  cleanHTML(html) {
    return html
      .replace(/```html\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/^\s+|\s+$/g, '')
      .trim();
  }
}

export default new HTMLParser();
