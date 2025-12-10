// src/utils/featureGating.ts

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'business';

export interface TierLimits {
  websitesPerMonth: number;
  maxPages: number;
  exportFormats: string[];
  customDomains: number;
  removeWatermark: boolean;
  githubSync: boolean;
  aiIterations: number | 'unlimited';
  priorityGeneration: boolean;
  advancedTemplates: boolean;
  whiteLabel: boolean;
}

// Define what each tier can do
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    websitesPerMonth: 2,
    maxPages: 0, // Preview only, can't download
    exportFormats: [],
    customDomains: 0,
    removeWatermark: false,
    githubSync: false,
    aiIterations: 0,
    priorityGeneration: false,
    advancedTemplates: false,
    whiteLabel: false,
  },
  basic: {
    websitesPerMonth: 5,
    maxPages: 3, // Simple 1-3 section landing pages
    exportFormats: ['html', 'css'],
    customDomains: 1,
    removeWatermark: true,
    githubSync: false,
    aiIterations: 0, // Manual editing only
    priorityGeneration: false,
    advancedTemplates: false,
    whiteLabel: false,
  },
  pro: {
    websitesPerMonth: 12,
    maxPages: 8,
    exportFormats: ['html', 'css', 'react', 'vue', 'nextjs'],
    customDomains: 3,
    removeWatermark: true,
    githubSync: true,
    aiIterations: 10, // 10 AI iterations per site
    priorityGeneration: true,
    advancedTemplates: true,
    whiteLabel: false,
  },
  business: {
    websitesPerMonth: 40,
    maxPages: 20,
    exportFormats: ['html', 'css', 'react', 'vue', 'nextjs', 'angular'],
    customDomains: 10,
    removeWatermark: true,
    githubSync: true,
    aiIterations: 'unlimited',
    priorityGeneration: true,
    advancedTemplates: true,
    whiteLabel: true,
  },
};

// Pricing information
export const TIER_PRICING = {
  basic: { monthly: 9, annual: 89 },
  pro: { monthly: 22, annual: 219 },
  business: { monthly: 49, annual: 489 },
};

// Check if user can perform an action
export function canUserAccessFeature(
  userTier: SubscriptionTier,
  feature: keyof TierLimits
): boolean {
  const limits = TIER_LIMITS[userTier];
  const value = limits[feature];
  
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value === 'unlimited') return true;
  
  return false;
}

// Check if user has reached their monthly limit
export function hasReachedMonthlyLimit(
  websitesUsed: number,
  userTier: SubscriptionTier
): boolean {
  return websitesUsed >= TIER_LIMITS[userTier].websitesPerMonth;
}

// Get required tier for a feature
export function getRequiredTierForFeature(
  feature: keyof TierLimits
): SubscriptionTier | null {
  const tiers: SubscriptionTier[] = ['basic', 'pro', 'business'];
  
  for (const tier of tiers) {
    if (canUserAccessFeature(tier, feature)) {
      return tier;
    }
  }
  
  return null;
}

// Check if user can download website
export function canDownloadWebsite(
  userTier: SubscriptionTier,
  websitesUsed: number
): { canDownload: boolean; reason?: string } {
  if (userTier === 'free') {
    return {
      canDownload: false,
      reason: 'Free users cannot download websites. Upgrade to Basic ($9/mo) to download.',
    };
  }
  
  if (hasReachedMonthlyLimit(websitesUsed, userTier)) {
    const limit = TIER_LIMITS[userTier].websitesPerMonth;
    return {
      canDownload: false,
      reason: `You've reached your monthly limit of ${limit} websites. Upgrade to get more!`,
    };
  }
  
  return { canDownload: true };
}

// Check if user can export in specific format
export function canExportFormat(
  userTier: SubscriptionTier,
  format: string
): { canExport: boolean; reason?: string } {
  const allowedFormats = TIER_LIMITS[userTier].exportFormats;
  
  if (!allowedFormats.includes(format.toLowerCase())) {
    const requiredTier = getRequiredTierForExportFormat(format);
    return {
      canExport: false,
      reason: `${format.toUpperCase()} export requires ${requiredTier} plan. Upgrade to unlock!`,
    };
  }
  
  return { canExport: true };
}

function getRequiredTierForExportFormat(format: string): string {
  if (['html', 'css'].includes(format.toLowerCase())) return 'Basic';
  if (['react', 'vue', 'nextjs'].includes(format.toLowerCase())) return 'Pro';
  return 'Business';
}

// Format tier name for display
export function formatTierName(tier: SubscriptionTier): string {
  const names = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Pro',
    business: 'Business',
  };
  return names[tier];
}

// Get upgrade message
export function getUpgradeMessage(
  currentTier: SubscriptionTier,
  requiredTier: SubscriptionTier
): string {
  const currentName = formatTierName(currentTier);
  const requiredName = formatTierName(requiredTier);
  const price = TIER_PRICING[requiredTier as keyof typeof TIER_PRICING];
  
  if (!price) return `Upgrade to ${requiredName} to unlock this feature!`;
  
  return `Upgrade from ${currentName} to ${requiredName} ($${price.monthly}/mo) to unlock this feature!`;
}
