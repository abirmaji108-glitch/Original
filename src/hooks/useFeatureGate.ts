// src/hooks/useFeatureGate.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TIER_LIMITS, UserTier } from '@/config/tiers';

export function useFeatureGate() {
  const { user, userTier: authTier, loading: authLoading } = useAuth();
  const [generationsToday, setGenerationsToday] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  // ✅ FIX: Use tier from AuthContext
  const userTier = (authTier || 'free') as UserTier;
  const limits = TIER_LIMITS[userTier];
  const isPro = userTier === 'pro' || userTier === 'business';
  const isFree = userTier === 'free';

  // ✅ FIX: Wait for AuthContext to finish loading before fetching data
  useEffect(() => {
    // Don't fetch until auth is loaded
    if (authLoading) {
      console.log('⏳ useFeatureGate: Waiting for auth to load...');
      return;
    }

    if (!user) {
      console.log('⚠️ useFeatureGate: No user found');
      setDataLoading(false);
      return;
    }
    
    console.log('✅ useFeatureGate: Auth loaded, fetching user data for:', user.id);
    fetchUserData();
  }, [user, authLoading]);

  async function fetchUserData() {
    if (!user?.id) {
      console.error('❌ No user ID in fetchUserData');
      setDataLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching generation count for user:', user.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('generations_this_month, last_generation_reset')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        setGenerationsToday(0);
        setDataLoading(false);
        return;
      }

      if (!profile) {
        console.warn('⚠️ No profile found, using defaults');
        setGenerationsToday(0);
        setDataLoading(false);
        return;
      }

      console.log('✅ Profile data:', profile);

      // Reset generations if it's a new month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const lastResetMonth = profile.last_generation_reset || currentMonth;
      
      if (lastResetMonth !== currentMonth) {
        console.log('🔄 New month detected, resetting count');
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            generations_this_month: 0,
            last_generation_reset: currentMonth
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('❌ Error resetting count:', updateError);
        }
       
        setGenerationsToday(0);
      } else {
        setGenerationsToday(profile.generations_this_month || 0);
      }

      // Get project count
      const { count, error: countError } = await supabase
        .from('websites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error('❌ Error fetching project count:', countError);
      }

      setProjectCount(count || 0);

      console.log('✅ useFeatureGate data loaded successfully:', {
        tier: userTier,
        generations: profile.generations_this_month || 0,
        limit: limits.monthlyGenerations,
        projects: count || 0
      });

    } catch (error) {
      console.error('❌ Exception in fetchUserData:', error);
      setGenerationsToday(0);
    } finally {
      setDataLoading(false);
    }
  }

  async function incrementGeneration() {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          generations_this_month: generationsToday + 1
        })
        .eq('id', user.id);

      if (error) throw error;
      setGenerationsToday(prev => prev + 1);
      return true;
    } catch (error) {
      console.error('❌ Error incrementing generation:', error);
      return false;
    }
  }

  // ✅ CRITICAL FIX: Consider both auth loading AND data loading
  const loading = authLoading || dataLoading;
  
  // ✅ Always allow if loading or if pro tier
  const canGenerate = loading 
    ? true  // Allow while loading to prevent blocking UI
    : isPro 
    ? true  // Pro/Business unlimited
    : generationsToday < limits.monthlyGenerations;

  console.log('🔍 useFeatureGate final state:', {
    authLoading,
    dataLoading,
    loading,
    user: user?.id,
    userTier,
    generationsToday,
    limit: limits.monthlyGenerations,
    canGenerate,
    isPro
  });

  return {
    userTier,
    generationsToday,
    projectCount,
    loading,
    canGenerate,
    canCreateProject: true,
    incrementGeneration,
    tierLimits: limits,
    isPro,
    isFree
  };
}
