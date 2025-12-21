// src/hooks/useFeatureGate.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TIER_LIMITS, UserTier } from '@/config/tiers';

/**
 * PERMANENT FIX - Feature Gate Hook
 * 
 * This hook:
 * 1. Waits for AuthContext to load the user
 * 2. Fetches generation count from profiles table (with proper RLS)
 * 3. Returns whether user can generate more websites
 * 
 * WHY THIS WORKS:
 * - No session checks (AuthContext handles that)
 * - Direct query to profiles (RLS is properly configured)
 * - Simple, single responsibility
 */

export function useFeatureGate() {
  const { user, userTier: authTier, loading: authLoading } = useAuth();
  
  const [generationsThisMonth, setGenerationsThisMonth] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userTier = (authTier || 'free') as UserTier;
  const limits = TIER_LIMITS[userTier];

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      console.log('⏳ useFeatureGate: Waiting for auth...');
      return;
    }

    // If no user after auth loads, we're done
    if (!user) {
      console.log('⚠️ useFeatureGate: No user found');
      setDataLoading(false);
      return;
    }

    console.log('✅ useFeatureGate: Auth ready, user ID:', user.id);
    fetchGenerationData();
  }, [user, authLoading]);

  async function fetchGenerationData() {
    if (!user?.id) {
      setDataLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('🔍 useFeatureGate: Fetching profile for user:', user.id);

      // ✅ Direct query - RLS will handle permissions
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_tier, generations_this_month, last_generation_reset')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ useFeatureGate: Profile query error:', profileError);
        setError('Failed to load profile');
        setGenerationsThisMonth(0);
        setDataLoading(false);
        return;
      }

      if (!profile) {
        console.error('❌ useFeatureGate: No profile found for user:', user.id);
        setError('Profile not found');
        setGenerationsThisMonth(0);
        setDataLoading(false);
        return;
      }

      console.log('✅ useFeatureGate: Profile loaded:', {
        user_tier: profile.user_tier,
        generations: profile.generations_this_month,
        last_reset: profile.last_generation_reset
      });

      // Check if we need to reset for new month
      const currentMonth = new Date().toISOString().slice(0, 7); // "2025-12"
      const lastResetMonth = profile.last_generation_reset || currentMonth;

      if (lastResetMonth !== currentMonth) {
        console.log('🔄 useFeatureGate: New month detected, resetting count');
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            generations_this_month: 0,
            last_generation_reset: currentMonth
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('❌ useFeatureGate: Reset error:', updateError);
        }

        setGenerationsThisMonth(0);
      } else {
        setGenerationsThisMonth(profile.generations_this_month || 0);
      }

      // Fetch project count
      const { count, error: countError } = await supabase
        .from('websites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error('⚠️ useFeatureGate: Count error:', countError);
      } else {
        setProjectCount(count || 0);
      }

      console.log('✅ useFeatureGate: Data loaded successfully:', {
        tier: userTier,
        generations: profile.generations_this_month || 0,
        limit: limits.monthlyGenerations,
        projects: count || 0
      });

    } catch (err) {
      console.error('❌ useFeatureGate: Exception:', err);
      setError('Unexpected error');
      setGenerationsThisMonth(0);
    } finally {
      setDataLoading(false);
    }
  }

  /**
   * Increments the generation count after a successful generation
   */
  async function incrementGeneration() {
    if (!user?.id) {
      console.error('❌ incrementGeneration: No user ID');
      return false;
    }

    try {
      const newCount = generationsThisMonth + 1;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ generations_this_month: newCount })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ incrementGeneration: Update error:', updateError);
        return false;
      }

      setGenerationsThisMonth(newCount);
      console.log('✅ incrementGeneration: Count updated to', newCount);
      return true;

    } catch (err) {
      console.error('❌ incrementGeneration: Exception:', err);
      return false;
    }
  }

  // Calculate final values
  const loading = authLoading || dataLoading;
  const isPro = userTier === 'pro';
  const isFree = userTier === 'free';
  
  // ✅ CRITICAL: Allow generation if:
  // 1. Still loading (don't block during load)
  // 2. Pro user (unlimited)
  // 3. Under monthly limit
  const canGenerate = loading 
    ? true 
    : isPro 
      ? true 
      : generationsThisMonth < limits.monthlyGenerations;

  // Always allow project creation (backend will enforce limits)
  const canCreateProject = true;

  // Debug log final state
  console.log('🔍 useFeatureGate: Final state:', {
    loading,
    userTier,
    generationsThisMonth,
    limit: limits.monthlyGenerations,
    canGenerate,
    error
  });

  return {
    // User info
    userTier,
    isPro,
    isFree,
    
    // Usage stats
    generationsToday: generationsThisMonth, // Keep old name for compatibility
    projectCount,
    
    // Permissions
    canGenerate,
    canCreateProject,
    
    // State
    loading,
    error,
    
    // Actions
    incrementGeneration,
    
    // Limits info
    tierLimits: limits
  };
}
