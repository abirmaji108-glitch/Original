// src/hooks/useFeatureGate.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TIER_LIMITS, UserTier } from '@/config/tiers';

export function useFeatureGate() {
  const { user } = useAuth();
  const [userTier, setUserTier] = useState<UserTier>('free');
  const [generationsToday, setGenerationsToday] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchUserData();
  }, [user]);

  async function fetchUserData() {
    try {
      console.log('🔍 useFeatureGate: Fetching data for user:', user?.id);
      
      // ✅ FIX: Get the actual authenticated session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ No valid session in useFeatureGate:', sessionError);
        setUserTier('free');
        setGenerationsToday(0);
        setLoading(false);
        return;
      }

      console.log('✅ Session found, user ID:', session.user.id);

      // ✅ FIX: Use session.user.id instead of user?.id
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_tier, generations_this_month, last_generation_reset')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        // Don't throw - allow user to proceed with defaults
        setUserTier('free');
        setGenerationsToday(0);
        setLoading(false);
        return;
      }

      if (!profile) {
        console.warn('⚠️ No profile found for user, using defaults');
        setUserTier('free');
        setGenerationsToday(0);
        setLoading(false);
        return;
      }

      console.log('✅ Profile found:', profile);

      // Reset generations if it's a new month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const lastResetMonth = profile.last_generation_reset || currentMonth;
      
      if (lastResetMonth !== currentMonth) {
        console.log('🔄 Resetting generations for new month');
        await supabase
          .from('profiles')
          .update({
            generations_this_month: 0,
            last_generation_reset: currentMonth
          })
          .eq('id', session.user.id);
       
        setGenerationsToday(0);
      } else {
        setGenerationsToday(profile.generations_this_month || 0);
      }

      setUserTier((profile.user_tier as UserTier) || 'free');

      // Get project count
      const { count } = await supabase
        .from('websites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      setProjectCount(count || 0);

      console.log('✅ useFeatureGate data loaded:', {
        tier: profile.user_tier,
        generations: profile.generations_this_month,
        projects: count
      });

    } catch (error) {
      console.error('❌ Exception in fetchUserData:', error);
      setUserTier('free');
      setGenerationsToday(0);
    } finally {
      setLoading(false);
    }
  }

  async function incrementGeneration() {
    if (!user) return false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const { error } = await supabase
        .from('profiles')
        .update({
          generations_this_month: generationsToday + 1
        })
        .eq('id', session.user.id);

      if (error) throw error;
      setGenerationsToday(prev => prev + 1);
      return true;
    } catch (error) {
      console.error('❌ Error incrementing generation:', error);
      return false;
    }
  }

  // ✅ CRITICAL FIX: Default to true if still loading to prevent blocking
  const canGenerate = loading 
    ? true 
    : generationsToday < TIER_LIMITS[userTier].monthlyGenerations;

  console.log('🔍 useFeatureGate state:', {
    userTier,
    generationsToday,
    limit: TIER_LIMITS[userTier].monthlyGenerations,
    canGenerate,
    loading
  });

  return {
    userTier,
    generationsToday,
    projectCount,
    loading,
    canGenerate,
    canCreateProject: true,
    incrementGeneration,
    tierLimits: TIER_LIMITS[userTier],
    isPro: userTier === 'pro',
    isFree: userTier === 'free'
  };
}
