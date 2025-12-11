// src/config/pricing.ts
// COMPLETE PRICING CONFIGURATION - Based on Your Detailed Plan

export const PRICING_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    tagline: 'The Perfect Hook',
    price: 0,
    yearlyPrice: 0,
    priceId: null,
    description: 'Try it out - Experience everything',
    features: [
      { text: '2 website previews per month', included: true },
      { text: 'Generate landing pages (3-5 sections max)', included: true },
      { text: 'All basic templates (preview mode)', included: true },
      { text: 'Manual editing (text, colors, themes)', included: true },
      { text: 'Drag & drop section rearrange', included: true },
      { text: 'Mobile/Desktop/Tablet preview', included: true },
      { text: 'Save 2 projects', included: true },
      { text: 'Download/Export code', included: false, locked: true },
      { text: 'Deploy/Publish website', included: false, locked: true },
      { text: 'Remove watermark', included: false, locked: true },
      { text: 'Custom domain', included: false, locked: true },
      { text: 'AI chat iterations', included: false, locked: true },
      { text: 'Multi-page websites', included: false, locked: true },
    ],
    limits: {
      previewsPerMonth: 2,
      websitesDownloadPerMonth: 0,
      maxSections: 5,
      maxPages: 1,
      savedProjects: 2,
      customDomains: 0,
      aiIterations: 0,
      canDownload: false,
      canDeploy: false,
      canRemoveWatermark: false,
      exportFormats: [],
      advancedTemplates: false,
      priorityQueue: false,
      githubSync: false,
      versionHistory: 0,
    },
    cta: 'Current Plan',
    popular: false,
  },

  BASIC: {
    id: 'basic',
    name: 'Basic',
    tagline: 'The Money Maker',
    price: 9,
    yearlyPrice: 89,
    savings: 19,
    priceId: process.env.VITE_STRIPE_BASIC_PRICE_ID,
    description: 'Perfect for solo entrepreneurs & small businesses',
    features: [
      { text: 'Download 5 websites per month', included: true, highlight: true },
      { text: 'Landing pages (1-3 sections, single page)', included: true },
      { text: '1 custom domain connection', included: true },
      { text: 'Remove "Made with Revenue Rocket" watermark', included: true, highlight: true },
      { text: 'HTML/CSS export (production-ready)', included: true },
      { text: '20+ basic templates', included: true },
      { text: 'Manual editing (text, images, themes, colors)', included: true },
      { text: 'Mobile responsive (auto-generated)', included: true },
      { text: 'Save up to 10 projects', included: true },
      { text: 'Basic SEO optimization (meta tags)', included: true },
      { text: 'Email support (48-hour response)', included: true },
      { text: 'Multi-page websites', included: false, locked: true },
      { text: 'React/Vue/Next.js export', included: false, locked: true },
      { text: 'AI chat iterations', included: false, locked: true },
      { text: 'GitHub sync', included: false, locked: true },
      { text: 'Advanced templates', included: false, locked: true },
    ],
    limits: {
      websitesDownloadPerMonth: 5,
      maxSections: 3,
      maxPages: 1,
      savedProjects: 10,
      customDomains: 1,
      aiIterations: 0,
      canDownload: true,
      canDeploy: true,
      canRemoveWatermark: true,
      exportFormats: ['html', 'css'],
      advancedTemplates: false,
      priorityQueue: false,
      githubSync: false,
      versionHistory: 0,
    },
    cta: 'Get Basic',
    popular: false,
    costToYou: 1.25,
    profit: 7.75,
    margin: 86,
  },

  PRO: {
    id: 'pro',
    name: 'Pro',
    tagline: 'The Sweet Spot',
    price: 22,
    yearlyPrice: 219,
    savings: 45,
    priceId: process.env.VITE_STRIPE_PRO_PRICE_ID,
    description: 'Most popular for freelancers & small agencies',
    features: [
      { text: 'Download 12 websites per month', included: true, highlight: true },
      { text: 'Multi-page websites (up to 8 pages)', included: true, highlight: true },
      { text: '3 custom domain connections', included: true },
      { text: 'React/Vue/Next.js export', included: true, highlight: true },
      { text: 'GitHub sync (auto-deploy)', included: true },
      { text: 'AI chat support (10 iterations per website)', included: true, highlight: true },
      { text: '50+ advanced templates', included: true },
      { text: 'Priority generation (2x faster)', included: true },
      { text: 'Version history (3 versions per site)', included: true },
      { text: 'All export formats (HTML/CSS/React/Vue/Next/Tailwind)', included: true },
      { text: 'Save up to 30 projects', included: true },
      { text: 'Advanced SEO tools (structured data, OG tags)', included: true },
      { text: 'Analytics integration (Google Analytics, Plausible)', included: true },
      { text: 'Form builder (contact forms, newsletter)', included: true },
      { text: 'Email support (24-hour response)', included: true },
      { text: 'White label', included: false, locked: true },
      { text: 'API access', included: false, locked: true },
      { text: 'Team collaboration', included: false, locked: true },
      { text: 'Unlimited AI iterations', included: false, locked: true },
    ],
    limits: {
      websitesDownloadPerMonth: 12,
      maxPages: 8,
      savedProjects: 30,
      customDomains: 3,
      aiIterations: 10,
      canDownload: true,
      canDeploy: true,
      canRemoveWatermark: true,
      exportFormats: ['html', 'css', 'react', 'vue', 'nextjs', 'tailwind'],
      advancedTemplates: true,
      priorityQueue: true,
      githubSync: true,
      versionHistory: 3,
      formBuilder: true,
      seoTools: 'advanced',
      analyticsIntegration: true,
    },
    cta: 'Get Pro',
    popular: true,
    costToYou: 9,
    profit: 13,
    margin: 59,
  },

  BUSINESS: {
    id: 'business',
    name: 'Business',
    tagline: 'High Margin',
    price: 49,
    yearlyPrice: 489,
    savings: 99,
    priceId: process.env.VITE_STRIPE_BUSINESS_PRICE_ID,
    description: 'For agencies & businesses with high volume needs',
    features: [
      { text: 'Download 40 websites per month', included: true, highlight: true },
      { text: 'Complex websites (up to 20 pages)', included: true, highlight: true },
      { text: '10 custom domain connections', included: true },
      { text: 'Full white label (remove ALL branding)', included: true, highlight: true },
      { text: 'API access (100 API calls/month)', included: true, highlight: true },
      { text: 'Team collaboration (3 users)', included: true, highlight: true },
      { text: 'Unlimited AI iterations', included: true, highlight: true },
      { text: 'Priority support (12-hour response)', included: true },
      { text: 'Custom integrations (Zapier, Make, Webhooks)', included: true },
      { text: 'Advanced analytics dashboard', included: true },
      { text: 'Save unlimited projects', included: true },
      { text: 'Custom CSS/JS injection', included: true },
      { text: 'Database schema export', included: true },
      { text: 'Payment gateway templates', included: true },
      { text: 'Export to Figma/Webflow/WordPress', included: true },
      { text: 'Role-based permissions', included: true },
      { text: 'Activity log & comments', included: true },
    ],
    limits: {
      websitesDownloadPerMonth: 40,
      maxPages: 20,
      savedProjects: -1, // unlimited
      customDomains: 10,
      aiIterations: -1, // unlimited
      apiCalls: 100,
      teamMembers: 3,
      canDownload: true,
      canDeploy: true,
      canRemoveWatermark: true,
      exportFormats: ['html', 'css', 'react', 'vue', 'nextjs', 'tailwind', 'angular', 'svelte', 'figma', 'webflow', 'wordpress'],
      advancedTemplates: true,
      priorityQueue: true,
      githubSync: true,
      versionHistory: -1, // unlimited
      formBuilder: true,
      seoTools: 'advanced',
      analyticsIntegration: true,
      whiteLabel: true,
      apiAccess: true,
      teamCollaboration: true,
      customIntegrations: true,
      customCssJs: true,
    },
    cta: 'Get Business',
    popular: false,
    costToYou: 30,
    profit: 19,
    margin: 39,
  },
};

// Helper: Get tier by ID
export function getTier(tierId: string) {
  return PRICING_TIERS[tierId.toUpperCase()] || PRICING_TIERS.FREE;
}

// Helper: Get tier limits
export function getTierLimits(tier: string) {
  return getTier(tier).limits;
}

// Helper: Check if user can download website
export function canDownloadWebsite(tier: string, websitesDownloaded: number): {
  canDownload: boolean;
  reason?: string;
  upgradeToTier?: string;
} {
  const tierData = getTier(tier);
  const limits = tierData.limits;

  // Check if tier allows downloads at all
  if (!limits.canDownload) {
    return {
      canDownload: false,
      reason: 'Download feature is not available in Free plan',
      upgradeToTier: 'basic',
    };
  }

  // Check if monthly limit reached
  if (limits.websitesDownloadPerMonth !== -1 && 
      websitesDownloaded >= limits.websitesDownloadPerMonth) {
    return {
      canDownload: false,
      reason: `You've reached your monthly limit of ${limits.websitesDownloadPerMonth} downloads`,
      upgradeToTier: tier === 'basic' ? 'pro' : 'business',
    };
  }

  return { canDownload: true };
}

// Helper: Check if user can create multi-page website
export function canCreateMultiPageWebsite(tier: string, pageCount: number): {
  canCreate: boolean;
  reason?: string;
  maxPages: number;
} {
  const limits = getTierLimits(tier);

  if (limits.maxPages === -1) {
    return { canCreate: true, maxPages: -1 };
  }

  if (pageCount > limits.maxPages) {
    return {
      canCreate: false,
      reason: `Your ${tier} plan supports up to ${limits.maxPages} pages. Upgrade to create multi-page websites.`,
      maxPages: limits.maxPages,
    };
  }

  return { canCreate: true, maxPages: limits.maxPages };
}

// Helper: Check if user can use AI chat
export function canUseAIChat(tier: string, iterationsUsed: number): {
  canUse: boolean;
  remaining: number;
  reason?: string;
} {
  const limits = getTierLimits(tier);

  if (limits.aiIterations === 0) {
    return {
      canUse: false,
      remaining: 0,
      reason: 'AI chat is not available in Free plan. Upgrade to Pro to unlock AI iterations.',
    };
  }

  if (limits.aiIterations === -1) {
    return { canUse: true, remaining: -1 }; // unlimited
  }

  const remaining = limits.aiIterations - iterationsUsed;

  if (remaining <= 0) {
    return {
      canUse: false,
      remaining: 0,
      reason: `You've used all ${limits.aiIterations} AI iterations for this website. Upgrade to Business for unlimited iterations.`,
    };
  }

  return { canUse: true, remaining };
}

// Helper: Check export format access
export function canExportFormat(tier: string, format: string): {
  canExport: boolean;
  reason?: string;
} {
  const limits = getTierLimits(tier);

  if (!limits.exportFormats.includes(format.toLowerCase())) {
    const availableFormats = limits.exportFormats.join(', ');
    return {
      canExport: false,
      reason: availableFormats 
        ? `Your ${tier} plan only supports: ${availableFormats}. Upgrade for more export formats.`
        : 'Export is not available in Free plan. Upgrade to download code.',
    };
  }

  return { canExport: true };
}

// Helper: Check if user can remove watermark
export function canRemoveWatermark(tier: string): boolean {
  return getTierLimits(tier).canRemoveWatermark;
}

// Helper: Check if user has GitHub sync
export function hasGitHubSync(tier: string): boolean {
  return getTierLimits(tier).githubSync;
}

// Helper: Check if user has API access
export function hasAPIAccess(tier: string): boolean {
  return getTierLimits(tier).apiAccess || false;
}

// Helper: Check if user has white label
export function hasWhiteLabel(tier: string): boolean {
  return getTierLimits(tier).whiteLabel || false;
}

// Helper: Get priority queue status
export function hasPriorityQueue(tier: string): boolean {
  return getTierLimits(tier).priorityQueue;
}

// Helper: Check saved projects limit
export function canSaveProject(tier: string, currentProjects: number): {
  canSave: boolean;
  reason?: string;
  limit: number;
} {
  const limits = getTierLimits(tier);

  if (limits.savedProjects === -1) {
    return { canSave: true, limit: -1 }; // unlimited
  }

  if (currentProjects >= limits.savedProjects) {
    return {
      canSave: false,
      reason: `You've reached your limit of ${limits.savedProjects} saved projects. Delete old projects or upgrade.`,
      limit: limits.savedProjects,
    };
  }

  return { canSave: true, limit: limits.savedProjects };
}
