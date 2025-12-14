// Tier-based prompt length limits
export const PROMPT_LIMITS = {
  free: {
    maxPromptLength: 1000,
    displayName: 'Free',
    upgradeMessage: 'Upgrade to Basic for 2000 characters!'
  },
  basic: {
    maxPromptLength: 2000,
    displayName: 'Basic',
    upgradeMessage: 'Upgrade to Pro for 5000 characters!'
  },
  pro: {
    maxPromptLength: 5000,
    displayName: 'Pro',
    upgradeMessage: 'Upgrade to Business for 10000 characters!'
  },
  business: {
    maxPromptLength: 10000,
    displayName: 'Business',
    upgradeMessage: 'You have the maximum character limit!'
  }
} as const;

export type UserTier = keyof typeof PROMPT_LIMITS;

export function getPromptLimit(tier: UserTier): number {
  return PROMPT_LIMITS[tier].maxPromptLength;
}

export function isPromptTooLong(prompt: string, tier: UserTier): boolean {
  return prompt.length > PROMPT_LIMITS[tier].maxPromptLength;
}

export function getUpgradeMessage(tier: UserTier): string {
  return PROMPT_LIMITS[tier].upgradeMessage;
}
