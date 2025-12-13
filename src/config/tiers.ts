// src/config/tiers.ts
export type UserTier = 'free' | 'basic' | 'pro' | 'business';

export interface TierLimits {
  name: string;
  generationsPerMonth: number;
  maxProjects: number;
  maxPagesPerSite: number;
  canDownload: boolean;
  canExportReact: boolean;
  canUseAIChat: boolean;
  aiChatIterations: number;
  customDomains: number;
  teamMembers: number;
  hasWhiteLabel: boolean;
  hasGitHubSync: boolean;
  hasAdvancedTemplates: boolean;
  hasPrioritySupport: boolean;
  hasVersionHistory: boolean;
  versionHistoryCount: number;
}

export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    name: 'Free',
    generationsPerMonth: 2, // 2 previews per month
    maxProjects: 2, // Can only save 2 projects
    maxPagesPerSite: 1, // Single page only (3-5 sections)
    canDownload: false, // ❌ Cannot download/export
    canExportReact: false,
    canUseAIChat: false, // ❌ No AI chat iterations
    aiChatIterations: 0,
    customDomains: 0,
    teamMembers: 1,
    hasWhiteLabel: false,
    hasGitHubSync: false,
    hasAdvancedTemplates: false,
    hasPrioritySupport: false,
    hasVersionHistory: false,
    versionHistoryCount: 0
  },
  basic: {
    name: 'Basic',
    generationsPerMonth: 5, // 5 downloads per month
    maxProjects: 10, // Can save up to 10 projects
    maxPagesPerSite: 3, // 1-3 sections
    canDownload: true, // ✅ HTML/CSS export
    canExportReact: false, // ❌ Only HTML/CSS
    canUseAIChat: false, // ❌ Manual editing only
    aiChatIterations: 0,
    customDomains: 1,
    teamMembers: 1,
    hasWhiteLabel: false,
    hasGitHubSync: false,
    hasAdvancedTemplates: false,
    hasPrioritySupport: false,
    hasVersionHistory: false,
    versionHistoryCount: 0
  },
  pro: {
    name: 'Pro',
    generationsPerMonth: 12, // 12 downloads per month
    maxProjects: 30, // Can save up to 30 projects
    maxPagesPerSite: 8, // Up to 8 pages per site
    canDownload: true, // ✅ React/Vue/Next.js export
    canExportReact: true, // ✅ Modern frameworks
    canUseAIChat: true, // ✅ 10 iterations per site
    aiChatIterations: 10,
    customDomains: 3,
    teamMembers: 1,
    hasWhiteLabel: false,
    hasGitHubSync: true,
    hasAdvancedTemplates: true,
    hasPrioritySupport: true,
    hasVersionHistory: true,
    versionHistoryCount: 3
  },
  business: {
    name: 'Business',
    generationsPerMonth: 40, // 40 downloads per month
    maxProjects: -1, // Unlimited projects
    maxPagesPerSite: 20, // Up to 20 pages per site
    canDownload: true,
    canExportReact: true,
    canUseAIChat: true, // ✅ Unlimited AI iterations
    aiChatIterations: -1, // -1 = unlimited
    customDomains: 10,
    teamMembers: 3,
    hasWhiteLabel: true, // ✅ Full white label
    hasGitHubSync: true,
    hasAdvancedTemplates: true,
    hasPrioritySupport: true,
    hasVersionHistory: true,
    versionHistoryCount: -1 // -1 = unlimited
  }
};

// Helper functions
export function canGenerate(tier: UserTier, generationsThisMonth: number): boolean {
  const limit = TIER_LIMITS[tier].generationsPerMonth;
  return generationsThisMonth < limit;
}

export function canCreateProject(tier: UserTier, projectCount: number): boolean {
  const maxProjects = TIER_LIMITS[tier].maxProjects;
  if (maxProjects === -1) return true; // Unlimited
  return projectCount < maxProjects;
}

export function canDownload(tier: UserTier): boolean {
  return TIER_LIMITS[tier].canDownload;
}

export function canExportReact(tier: UserTier): boolean {
  return TIER_LIMITS[tier].canExportReact;
}

export function canUseAIChat(tier: UserTier, iterationsUsed: number): boolean {
  const limit = TIER_LIMITS[tier].aiChatIterations;
  if (limit === -1) return true; // Unlimited
  if (limit === 0) return false; // Not allowed
  return iterationsUsed < limit;
}
