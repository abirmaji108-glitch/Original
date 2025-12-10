// src/config/tiers.ts

export const TIER_LIMITS = {
  free: {
    name: 'Free',
    generationsPerDay: 5,
    maxProjects: 3,
    features: [
      'Basic AI generation',
      '5 generations per day',
      '3 projects max',
      'Basic templates',
      'Community support'
    ],
    price: 0
  },
  pro: {
    name: 'Pro',
    generationsPerDay: -1, // unlimited
    maxProjects: -1, // unlimited
    features: [
      'Unlimited AI generation',
      'Unlimited projects',
      'Premium templates',
      'Priority support',
      'Advanced customization',
      'Export options',
      'Remove watermark'
    ],
    price: 29
  },
  enterprise: {
    name: 'Enterprise',
    generationsPerDay: -1,
    maxProjects: -1,
    features: [
      'Everything in Pro',
      'White label solution',
      'Custom branding',
      'API access',
      'Dedicated support',
      'Custom integrations',
      'Team collaboration'
    ],
    price: 99
  }
} as const;

export type UserTier = keyof typeof TIER_LIMITS;

export function canGenerate(tier: UserTier, generationsToday: number): boolean {
  const limit = TIER_LIMITS[tier].generationsPerDay;
  if (limit === -1) return true; // unlimited
  return generationsToday < limit;
}

export function canCreateProject(tier: UserTier, projectCount: number): boolean {
  const limit = TIER_LIMITS[tier].maxProjects;
  if (limit === -1) return true; // unlimited
  return projectCount < limit;
}
