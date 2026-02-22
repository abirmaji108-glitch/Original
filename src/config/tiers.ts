// ============================================
// TIER CONFIGURATION - DISPLAY ONLY
// ============================================
// ⚠️ SECURITY NOTICE:
// This file is for UI DISPLAY purposes only.
// ALL tier enforcement happens on the server.
// Modifying this file will NOT bypass limits.
//
// Server source of truth: server.js TIER_LIMITS
// Database source of truth: profiles.user_tier
// ============================================
export type UserTier = 'free' | 'starter' | 'basic' | 'pro';
// ============================================
// DISPLAY LIMITS - FOR UI ONLY
// ============================================
// These MUST match server.js TIER_LIMITS exactly
// Used only for showing limits in UI components
// NOT used for validation or enforcement
export const TIER_LIMITS = {
  free: {
    maxPromptLength: 500,
    credits: 20,
    monthlyGenerations: 2,
    generationsPerMonth: 2,
    templatesAccess: [
      'restaurant', 'portfolio', 'agency', 'landing', 'ecommerce',
      'blog', 'gym', 'education', 'realestate', 'wedding'
    ],
    displayName: 'Free',
    description: 'Try Sento AI — no credit card required',
  },
  starter: {
    maxPromptLength: 750,
    credits: 60,
    monthlyGenerations: 6,
    generationsPerMonth: 6,
    templatesAccess: [
      'restaurant', 'portfolio', 'agency', 'landing', 'ecommerce',
      'blog', 'gym', 'education', 'realestate', 'wedding',
      'saas', 'nonprofit', 'medical', 'photography', 'hotel'
    ],
    displayName: 'Starter',
    description: 'Perfect for freelancers and small projects',
  },
  basic: {
    maxPromptLength: 1000,
    credits: 130,
    monthlyGenerations: 13,
    generationsPerMonth: 13,
    templatesAccess: [
      'restaurant', 'portfolio', 'agency', 'landing', 'ecommerce',
      'blog', 'gym', 'education', 'realestate', 'wedding',
      'saas', 'nonprofit', 'medical', 'photography', 'hotel',
      'lawyer', 'music', 'construction', 'automotive', 'coffee'
    ],
    displayName: 'Basic',
    description: 'Most popular — unlimited projects, custom domain',
  },
  pro: {
    maxPromptLength: 2000,
    credits: 400,
    monthlyGenerations: 40,
    generationsPerMonth: 40,
    templatesAccess: [
      'restaurant', 'portfolio', 'agency', 'landing', 'ecommerce',
      'blog', 'gym', 'education', 'realestate', 'wedding',
      'saas', 'nonprofit', 'medical', 'photography', 'hotel',
      'lawyer', 'music', 'construction', 'automotive', 'coffee',
      'luxury-hotel', 'tech-startup', 'crypto', 'ai-saas', 'fintech',
      'fashion-brand', 'architecture', 'gaming', 'podcast', 'space-tech',
      'wellness', 'vineyard', 'art-gallery', 'yacht', 'biotech',
      'film-production', 'eco-brand', 'metaverse', 'luxury-car', 'investment-fund',
      'space-tourism', 'quantum-computing', 'culinary-academy', 'smart-home', 'luxury-travel',
      'ai-avatar', 'mental-health', 'drone-services', 'vr-experience', 'robotics'
    ],
    displayName: 'Pro',
    description: 'For agencies and power users — white-label, API access',
  },
} as const;
// ============================================
// TIER METADATA - FOR DISPLAY
// ============================================
export const TIER_PRICES = {
  free: 0,
  starter: 5,
  basic: 10,
  pro: 25,
} as const;
export const TIER_FEATURES = {
  free: [
    '20 credits (lifetime)',
    '2 page generations',
    'Preview only — no publishing',
    'Basic templates',
    'Community support',
  ],
  starter: [
    '60 credits/month',
    '6 generations or 20 edits',
    'Publish up to 3 live pages',
    '50 form submissions/month',
    'Basic analytics',
    'Remove Sento badge',
    'Email support',
  ],
  basic: [
    '130 credits/month',
    '13 generations or 43 edits',
    'Unlimited published pages',
    'Unlimited form submissions',
    '1 custom domain',
    'Full analytics (30 days)',
    'Export HTML code',
    'Priority email support',
  ],
  pro: [
    '400 credits/month',
    '40 generations or 133 edits',
    'Everything in Basic',
    '5 custom domains',
    'Advanced analytics (90 days)',
    'White-label option',
    'API access',
    'Priority phone support',
  ],
} as const;
// ============================================
// HELPER FUNCTIONS - DISPLAY ONLY
// ============================================
/**
 * Get tier display information
 * @param tier - User tier
 * @returns Display information for the tier
 */
export function getTierInfo(tier: UserTier) {
 return {
  ...TIER_LIMITS[tier],
  price: TIER_PRICES[tier],
  features: TIER_FEATURES[tier],
 };
}
/**
 * Check if template is available for tier (DISPLAY ONLY)
 * ⚠️ This is for UI display only - server enforces actual access
 * @param templateId - Template identifier
 * @param tier - User tier
 * @returns Whether template appears available (NOT enforced)
 */
export function isTemplateAvailableForTier(
 templateId: string,
 tier: UserTier
): boolean {
 const tierLimits = TIER_LIMITS[tier];
 return tierLimits.templatesAccess.includes(templateId as any);
}
/**
 * Get next tier upgrade option
 * @param currentTier - Current user tier
 * @returns Next tier or null if already at highest
 */
export function getNextTier(currentTier: UserTier): UserTier | null {
 if (currentTier === 'free') return 'basic';
 if (currentTier === 'basic') return 'pro';
 return null;
}
/**
 * Get tier comparison data for pricing page
 * @returns Array of tier information for display
 */
export function getAllTiersComparison() {
 return (['free', 'basic', 'pro'] as const).map((tier) => ({
  tier,
  ...getTierInfo(tier),
 }));
}
// ============================================
// PREMIUM TEMPLATES LIST
// ============================================
export const PREMIUM_TEMPLATES = [
  'luxury-hotel', 'tech-startup', 'crypto', 'ai-saas', 'fintech',
  'fashion-brand', 'architecture', 'gaming', 'podcast', 'space-tech',
  'wellness', 'vineyard', 'art-gallery', 'yacht', 'biotech',
  'film-production', 'eco-brand', 'metaverse', 'luxury-car', 'investment-fund',
  'space-tourism', 'quantum-computing', 'culinary-academy', 'smart-home', 'luxury-travel',
  'ai-avatar', 'mental-health', 'drone-services', 'vr-experience', 'robotics'
] as const;
/**
 * Check if template is premium (DISPLAY ONLY)
 * @param templateId - Template identifier
 * @returns Whether template is marked as premium
 */
export function isPremiumTemplate(templateId: string): boolean {
 return PREMIUM_TEMPLATES.includes(templateId as any);
}
// ============================================
// VALIDATION HELPERS - DISPLAY ONLY
// ============================================
/**
 * Get remaining generations display text
 * @param used - Generations used
 * @param limit - Generation limit
 * @returns Formatted text for display
 */
export function getRemainingGenerationsText(used: number, limit: number): string {
 const remaining = Math.max(0, limit - used);
 if (remaining === 0) {
  return 'Limit reached';
 }
 if (remaining === 1) {
  return '1 generation remaining';
 }
 return `${remaining} generations remaining`;
}
/**
 * Get character limit warning level
 * @param currentLength - Current prompt length
 * @param maxLength - Maximum allowed length
 * @returns Warning level for UI styling
 */
export function getCharacterLimitWarning(
 currentLength: number,
 maxLength: number
): 'safe' | 'warning' | 'danger' {
 const percentage = (currentLength / maxLength) * 100;
 if (percentage >= 100) return 'danger';
 if (percentage >= 90) return 'warning';
 return 'safe';
}
// ============================================
// TYPE EXPORTS
// ============================================
export type TierLimits = typeof TIER_LIMITS;
export type TierLimit = TierLimits[UserTier];
