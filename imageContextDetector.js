// imageContextDetector.js - Lovable-level image context detection
// This analyzes HTML to understand WHAT each image should be

export function analyzeImageContexts(html, prompt) {
  const contexts = [];
  
  // Extract all image placeholders and their surrounding context
  const placeholderRegex = /\{\{IMAGE_(\d+)\}\}/g;
  let match;
  
  while ((match = placeholderRegex.exec(html)) !== null) {
    const index = parseInt(match[1]);
    const startPos = Math.max(0, match.index - 300);
    const endPos = Math.min(html.length, match.index + 300);
    const surroundingText = html.substring(startPos, endPos);
    
    const context = detectSpecificContext(surroundingText, prompt, index);
    contexts.push({
      index,
      placeholder: match[0],
      context,
      searchQuery: generateSearchQuery(context, prompt)
    });
  }
  
  return contexts;
}

function detectSpecificContext(text, prompt, index) {
  const lowerText = text.toLowerCase();
  
  // PERSON DETECTION (Team members, testimonials, profiles)
  if (lowerText.includes('team') || 
      lowerText.includes('member') || 
      lowerText.includes('ceo') ||
      lowerText.includes('founder') ||
      lowerText.includes('director') ||
      lowerText.includes('manager') ||
      lowerText.includes('testimonial') ||
      lowerText.includes('review') ||
      /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(text) || // Names like "John Smith"
      lowerText.includes('customer') ||
      lowerText.includes('client')) {
    return {
      type: 'person',
      gender: detectGender(text),
      age: detectAge(text),
      profession: detectProfession(text),
      setting: detectSetting(prompt)
    };
  }
  
  // PRODUCT DETECTION
  if (lowerText.includes('product') || 
      lowerText.includes('item') ||
      lowerText.includes('merchandise') ||
      lowerText.includes('good') ||
      /\$\d+(\.\d{2})?/.test(text) || // Prices like $29.99
      lowerText.includes('buy') ||
      lowerText.includes('shop') ||
      lowerText.includes('store')) {
    return {
      type: 'product',
      category: detectProductCategory(text, prompt),
      style: 'professional'
    };
  }
  
  // FOOD/DRINK DETECTION
  if (lowerText.includes('food') || 
      lowerText.includes('dish') ||
      lowerText.includes('meal') ||
      lowerText.includes('drink') ||
      lowerText.includes('coffee') ||
      lowerText.includes('tea') ||
      lowerText.includes('wine') ||
      lowerText.includes('beer') ||
      lowerText.includes('cocktail') ||
      lowerText.includes('restaurant') ||
      lowerText.includes('cafe') ||
      lowerText.includes('menu') ||
      lowerText.includes('ingredient')) {
    return {
      type: 'food',
      category: detectFoodCategory(text),
      style: 'appetizing'
    };
  }
  
  // LOCATION/PLACE DETECTION
  if (lowerText.includes('location') || 
      lowerText.includes('place') ||
      lowerText.includes('venue') ||
      lowerText.includes('address') ||
      lowerText.includes('map') ||
      lowerText.includes('visit') ||
      lowerText.includes('storefront') ||
      lowerText.includes('exterior') ||
      lowerText.includes('building')) {
    return {
      type: 'place',
      category: detectPlaceCategory(prompt),
      style: 'architectural'
    };
  }
  
  // INTERIOR DETECTION
  if (lowerText.includes('interior') || 
      lowerText.includes('inside') ||
      lowerText.includes('decor') ||
      lowerText.includes('furniture') ||
      lowerText.includes('design') ||
      lowerText.includes('space') ||
      lowerText.includes('room')) {
    return {
      type: 'interior',
      style: detectInteriorStyle(prompt),
      category: detectTopic(prompt)
    };
  }
  
  // NATURE/SCENERY DETECTION
  if (lowerText.includes('nature') || 
      lowerText.includes('scenery') ||
      lowerText.includes('view') ||
      lowerText.includes('landscape') ||
      lowerText.includes('outdoor') ||
      lowerText.includes('garden') ||
      lowerText.includes('park') ||
      lowerText.includes('beach') ||
      lowerText.includes('mountain')) {
    return {
      type: 'nature',
      category: detectNatureType(prompt),
      style: 'serene'
    };
  }
  
  // LOGO/ICON DETECTION
  if (lowerText.includes('logo') || 
      lowerText.includes('brand') ||
      lowerText.includes('icon') ||
      lowerText.includes('badge') ||
      lowerText.includes('emblem') ||
      lowerText.includes('symbol')) {
    return {
      type: 'logo',
      style: 'minimal',
      category: detectTopic(prompt)
    };
  }
  
  // DEFAULT: Use topic-based but with enhanced context
  const topic = detectTopic(prompt);
  return {
    type: 'generic',
    category: topic,
    style: 'professional',
    description: getDefaultDescription(topic, index)
  };
}

// Helper functions for detailed context detection
function detectGender(text) {
  const lower = text.toLowerCase();
  // You can add more sophisticated gender detection if needed
  return 'person'; // Unsplash handles this well with just 'person'
}

function detectAge(text) {
  // Return age range for better search
  if (text.includes('young') || text.includes('student')) return '20s';
  if (text.includes('professional') || text.includes('business')) return '30s-40s';
  return 'adult';
}

function detectProfession(text) {
  const lower = text.toLowerCase();
  if (lower.includes('chef') || lower.includes('cook')) return 'chef';
  if (lower.includes('doctor') || lower.includes('medical')) return 'doctor';
  if (lower.includes('engineer') || lower.includes('developer')) return 'engineer';
  if (lower.includes('designer') || lower.includes('artist')) return 'designer';
  if (lower.includes('business') || lower.includes('executive')) return 'business';
  return 'professional';
}

function detectProductCategory(text, prompt) {
  const topic = detectTopic(prompt);
  return topic;
}

function detectFoodCategory(text) {
  const lower = text.toLowerCase();
  if (lower.includes('coffee') || lower.includes('espresso')) return 'coffee';
  if (lower.includes('wine') || lower.includes('drink')) return 'beverage';
  if (lower.includes('pastry') || lower.includes('bakery')) return 'bakery';
  if (lower.includes('restaurant')) return 'restaurant food';
  return 'food';
}

function detectPlaceCategory(prompt) {
  const topic = detectTopic(prompt);
  return `${topic} building exterior`;
}

function detectInteriorStyle(prompt) {
  const topic = detectTopic(prompt);
  if (['restaurant', 'cafe', 'coffee'].includes(topic)) return 'cozy interior';
  if (['hotel', 'spa', 'resort'].includes(topic)) return 'luxury interior';
  if (['gym', 'fitness'].includes(topic)) return 'modern gym interior';
  if (['office', 'business'].includes(topic)) return 'office interior';
  return 'professional interior';
}

function detectNatureType(prompt) {
  const topic = detectTopic(prompt);
  if (['hotel', 'resort', 'spa'].includes(topic)) return 'beach landscape';
  if (['wedding', 'event'].includes(topic)) return 'garden landscape';
  return 'nature landscape';
}

function getDefaultDescription(topic, index) {
  const descriptions = {
    'restaurant': ['restaurant food', 'restaurant interior', 'chef cooking', 'dining experience'],
    'coffee': ['coffee shop interior', 'coffee cup', 'barista', 'coffee beans'],
    'gym': ['gym interior', 'fitness equipment', 'person exercising', 'modern gym'],
    'business': ['office interior', 'business meeting', 'professional workspace', 'corporate building']
  };
  
  const descs = descriptions[topic] || ['professional', 'business', 'modern', 'quality'];
  return descs[index % descs.length];
}

function generateSearchQuery(context, prompt) {
  const topic = detectTopic(prompt);
  
  switch (context.type) {
    case 'person':
      if (context.profession && context.profession !== 'professional') {
        return `${context.profession} ${context.age} ${context.gender} portrait professional`;
      }
      return `${topic} ${context.gender} portrait professional smiling`;
    
    case 'food':
      return `${context.category} ${context.style} professional photography`;
    
    case 'product':
      return `${topic} ${context.category} product professional shot`;
    
    case 'place':
      return `${topic} ${context.category} ${context.style}`;
    
    case 'interior':
      return `${topic} ${context.style} interior design`;
    
    case 'nature':
      return `${context.category} ${context.style} beautiful`;
    
    case 'logo':
      return `${topic} logo minimalist design`;
    
    default:
      return `${topic} ${context.description || 'professional'}`;
  }
}

// Import detectTopic from your existing library
import { detectTopic } from './imageLibrary.js';
