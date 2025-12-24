// src/hooks/useFeatureGate.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { TIER_LIMITS, UserTier } from '@/config/tiers';

export function useFeatureGate() {
  const { user, userTier: authTier, loading: authLoading } = useAuth();
  const [generationsThisMonth, setGenerationsThisMonth] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const userTier = (authTier || 'free') as UserTier;
  const limits = TIER_LIMITS[userTier];

  useEffect(() => {
    if (authLoading) {
      console.log('⏳ useFeatureGate: Waiting for auth...');
      return;
    }
    if (!user) {
      console.log('⚠️ useFeatureGate: No user found');
      setDataLoading(false);
      return;
    }
    console.log('✅ useFeatureGate: Auth ready, user ID:', user.id);
    fetchGenerationData();
  }, [user?.id, authLoading, fetchGenerationData]); // ✅ FIXED: Add all dependencies

  const fetchGenerationData = useCallback(async () => {
    if (!user?.id) {
      setDataLoading(false);
      return;
    }
    try {
      console.log('🔍 useFeatureGate: Fetching profile for user:', user.id);
      // ✅ FIX: Use .maybeSingle() instead of .single() to avoid 406 errors
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_tier, generations_this_month, last_generation_reset')
        .eq('id', user.id)
        .maybeSingle(); // ← This prevents 406 errors
      if (profileError) {
        console.error('❌ useFeatureGate: Profile query error:', profileError);
        setGenerationsThisMonth(0);
        setDataLoading(false);
        return;
      }
      if (!profile) {
        console.warn('⚠️ useFeatureGate: No profile found, using defaults');
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
      const currentMonth = new Date().toISOString().slice(0, 7);
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
          console.error('⚠️ useFeatureGate: Reset error:', updateError);
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
      setGenerationsThisMonth(0);
    } finally {
      setDataLoading(false);
    }
  }, [user?.id, supabase]); // ← Add useCallback wrapper

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

  const loading = authLoading || dataLoading;
  const isPro = userTier === 'pro';
  const isFree = userTier === 'free';
  // Allow generation if loading OR under limit
  const canGenerate = loading ? true : generationsThisMonth < limits.monthlyGenerations;
  const canCreateProject = true;

  console.log('🔍 useFeatureGate: Final state:', {
    loading,
    userTier,
    generationsThisMonth,
    limit: limits.monthlyGenerations,
    canGenerate
  });

  return {
    userTier,
    isPro,
    isFree,
    generationsToday: generationsThisMonth,
    projectCount,
    canGenerate,
    canCreateProject,
    loading,
    incrementGeneration,
    tierLimits: limits
  };
}
