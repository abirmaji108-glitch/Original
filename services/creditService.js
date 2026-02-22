// services/creditService.js
// Credit system for Sento AI — handles all credit operations
// Follows same pattern as analyticsService.js and formHandler.js

// ============================================
// CREDIT CONSTANTS — Single source of truth
// ============================================
const CREDIT_COSTS = {
  generation: 10,      // AI page generation (Kimi K2)
  edit_simple: 3,      // Text/color changes (Gemini Flash)
  edit_medium: 6,      // Section-level edits (Gemini Flash)
  edit_complex: 10,    // Multi-section or full regen (Gemini Flash)
  image_replace: 0     // Free — no AI call needed
};

const TIER_CREDITS = {
  free:    20,   // One-time, never resets
  starter: 60,   // Resets monthly
  basic:   130,  // Resets monthly
  pro:     400   // Resets monthly
};

const PAID_TIERS = ['starter', 'basic', 'pro'];

// ============================================
// GET CREDIT BALANCE
// Returns current credits_balance for a user
// ============================================
async function getCreditBalance(userId, supabase) {
  const { data, error } = await supabase
    .from('profiles')
    .select('credits_balance, credits_used_this_month, last_credit_reset, user_tier')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch credit balance: ${error.message}`);
  }

  return {
    balance: data.credits_balance || 0,
    usedThisMonth: data.credits_used_this_month || 0,
    lastReset: data.last_credit_reset,
    tier: data.user_tier
  };
}

// ============================================
// CHECK AND DEDUCT CREDITS (ATOMIC)
// Calls the safe_deduct_credits SQL function
// Returns { success, credits_after, error }
// ============================================
async function checkAndDeductCredits(userId, operationType, supabase) {
  const creditsNeeded = CREDIT_COSTS[operationType];

  if (creditsNeeded === undefined) {
    throw new Error(`Unknown operation type: ${operationType}`);
  }

  // Image replace is always free — skip deduction
  if (creditsNeeded === 0) {
    return { success: true, creditsUsed: 0, isFree: true };
  }

  // Call the atomic SQL function we created in Phase 1
  const { data, error } = await supabase.rpc('safe_deduct_credits', {
    p_user_id: userId,
    p_credits_needed: creditsNeeded,
    p_operation_type: operationType,
    p_description: `Used ${creditsNeeded} credits for ${operationType}`
  });

  if (error) {
    throw new Error(`Credit deduction failed: ${error.message}`);
  }

  // safe_deduct_credits returns a single JSONB row
  const result = data;

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Insufficient credits',
      creditsBalance: result.credits_balance || 0,
      creditsNeeded: creditsNeeded
    };
  }

  return {
    success: true,
    creditsUsed: creditsNeeded,
    creditsBefore: result.credits_before,
    creditsAfter: result.credits_after
  };
}

// ============================================
// ALLOCATE CREDITS ON TIER UPGRADE / SIGNUP
// Called by Stripe webhook on checkout.session.completed
// and also on new user signup (free tier)
// ============================================
async function allocateCreditsForTier(userId, tier, supabase) {
  const creditsToAdd = TIER_CREDITS[tier];

  if (creditsToAdd === undefined) {
    throw new Error(`Unknown tier: ${tier}`);
  }

  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-02"

  if (tier === 'free') {
    // Free tier: only allocate if balance is 0 (first time signup)
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits_balance')
      .eq('id', userId)
      .single();

    if ((profile?.credits_balance || 0) > 0) {
      // Already has credits — don't reset
      return { success: true, creditsAllocated: 0, reason: 'already_has_credits' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        credits_balance: creditsToAdd,
        credits_used_this_month: 0,
        last_credit_reset: currentMonth
      })
      .eq('id', userId);

    if (error) throw new Error(`Failed to allocate free credits: ${error.message}`);
    return { success: true, creditsAllocated: creditsToAdd };
  }

  // Paid tier: set balance to tier amount + reset monthly usage
  const { error } = await supabase
    .from('profiles')
    .update({
      credits_balance: creditsToAdd,
      credits_used_this_month: 0,
      last_credit_reset: currentMonth
    })
    .eq('id', userId);

  if (error) throw new Error(`Failed to allocate credits for ${tier}: ${error.message}`);
  return { success: true, creditsAllocated: creditsToAdd };
}

// ============================================
// MONTHLY RESET (for paid tiers)
// Called when a paid user's monthly invoice succeeds
// ============================================
async function resetMonthlyCredits(userId, tier, supabase) {
  if (!PAID_TIERS.includes(tier)) return; // Free tier never resets

  const creditsToReset = TIER_CREDITS[tier];
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { error } = await supabase
    .from('profiles')
    .update({
      credits_balance: creditsToReset,
      credits_used_this_month: 0,
      last_credit_reset: currentMonth
    })
    .eq('id', userId);

  if (error) throw new Error(`Failed to reset monthly credits: ${error.message}`);
  return { success: true, creditsReset: creditsToReset };
}

// ============================================
// DETERMINE EDIT OPERATION TYPE
// Used in the /api/edit endpoint to pick correct cost
// ============================================
function getEditOperationType(analysis) {
  // Image-only edits are free (handled by replace-image endpoint)
  if (analysis?.isImageOnly) return 'image_replace';

  const complexity = analysis?.complexity || 'medium';

  if (complexity === 'low') return 'edit_simple';
  if (complexity === 'high') return 'edit_complex';
  return 'edit_medium';
}

// ============================================
// EXPORTS
// ============================================
export default {
  CREDIT_COSTS,
  TIER_CREDITS,
  getCreditBalance,
  checkAndDeductCredits,
  allocateCreditsForTier,
  resetMonthlyCredits,
  getEditOperationType
};
