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

export type UserTier = 'free' | 'basic' | 'pro';

// ============================================
// DISPLAY LIMITS - FOR UI ONLY
// ============================================
// These MUST match server.js TIER_LIMITS exactly
// Used only for showing limits in UI components
// NOT used for validation or enforcement

export const TIER_LIMITS = {
 free: {
  // Display info only
  maxPromptLength: 500,
  monthlyGenerations: 2,
  generationsPerMonth: 2,
  templatesAccess: ['minimal', 'corporate', 'creative'],
  displayName: 'Free',
  description: 'Perfect for trying out our service',
 },
 basic: {
  // Display info only
  maxPromptLength: 1000,
  monthlyGenerations: 10,
  generationsPerMonth: 10,
  templatesAccess: ['minimal', 'corporate', 'creative', 'modern', 'elegant'],
  displayName: 'Basic',
  description: 'Great for personal projects',
 },
 pro: {
  // Display info only
  maxPromptLength: 2000,
  monthlyGenerations: 50,
  generationsPerMonth: 50,
  templatesAccess: [
   'minimal',
   'corporate',
   'creative',
   'modern',
   'elegant',
   'ultra-modern',
   'gradient-glass',
   'neo-brutalist',
  ],
  displayName: 'Pro',
  description: 'Unlimited creativity for professionals',
 },
} as const;

// ============================================
// TIER METADATA - FOR DISPLAY
// ============================================

export const TIER_PRICES = {
 free: 0,
 basic: 9.99,
 pro: 29.99,
} as const;

export const TIER_FEATURES = {
 free: [
  '2 generations per month',
  'Basic templates',
  '500 character prompts',
  'Community support',
 ],
 basic: [
  '10 generations per month',
  'Premium templates',
  '1,000 character prompts',
  'Email support',
  'Custom styling options',
 ],
 pro: [
  '50 generations per month',
  'All templates including ultra-modern',
  '2,000 character prompts',
  'Priority support',
  'Advanced customization',
  'Early access to new features',
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
 return tierLimits.templatesAccess.includes(templateId);
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
 'ultra-modern',
 'gradient-glass',
 'neo-brutalist',
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
