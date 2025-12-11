// src/config/tiers.ts

export const TIER_LIMITS = {
  free: {
    name: 'Free',
    generationsPerDay: 5,
    maxProjects: 3,
    maxDownloads: 0,
    features: [
      'Preview and edit websites',
      'No downloads allowed',
      '3 saved projects',
      '10+ basic templates',
      'Sento watermark',
      'Community support'
    ],
    price: 0
  },
  basic: {
    name: 'Basic',
    generationsPerDay: -1, // unlimited generation
    maxProjects: 10,
    maxDownloads: 5, // 5 downloads per month
    customDomains: 1,
    features: [
      'Download 5 websites per month',
      'Landing pages (1-3 sections)',
      '1 custom domain connection',
      'Remove watermark',
      'HTML/CSS export',
      '20+ basic templates',
      'Save up to 10 projects',
      'Basic SEO optimization',
      'Email support (48h)'
    ],
    price: 9
  },
  pro: {
    name: 'Pro',
    generationsPerDay: -1, // unlimited
    maxProjects: -1, // unlimited
    maxDownloads: -1, // unlimited
    customDomains: 3,
    features: [
      'Unlimited downloads',
      'Multi-section websites',
      '3 custom domains',
      'Remove watermark',
      'HTML/CSS/React export',
      '50+ premium templates',
      'Unlimited projects',
      'Advanced SEO tools',
      'AI design assistant',
      'Priority support (24h)',
      'Custom code injection'
    ],
    price: 22
  },
  business: {
    name: 'Business',
    generationsPerDay: -1,
    maxProjects: -1,
    maxDownloads: -1,
    customDomains: -1, // unlimited
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Unlimited custom domains',
      'White-label solution',
      'Custom templates',
      'API access',
      'Dedicated support',
      'SLA guarantee',
      'Custom integrations',
      'Priority generation queue'
    ],
    price: 49
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

export function canDownload(tier: UserTier, downloadsThisMonth: number): boolean {
  const limit = TIER_LIMITS[tier].maxDownloads;
  if (limit === -1) return true; // unlimited
  if (limit === 0) return false; // not allowed
  return downloadsThisMonth < limit;
}
