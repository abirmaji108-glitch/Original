// src/hooks/useFeatureGate.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TIER_LIMITS, UserTier } from '@/config/tiers';

export function useFeatureGate() {
  const { user } = useAuth();
  const [userTier, setUserTier] = useState<UserTier>('free');
  const [generationsToday, setGenerationsToday] = useState(0); // Note: variable kept as "generationsToday" for backward compatibility, but now represents monthly count
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
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_tier, generations_this_month, last_generation_reset')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      // Reset generations if it's a new month
      const currentMonth = new Date().toISOString().slice(0, 7); // "2024-12"
      const lastResetMonth = profile?.last_generation_reset || currentMonth;
      if (lastResetMonth !== currentMonth) {
        await supabase
          .from('profiles')
          .update({
            generations_this_month: 0,
            last_generation_reset: currentMonth
          })
          .eq('id', user?.id);
       
        setGenerationsToday(0); // Keep variable name for now, but it's actually "this month"
      } else {
        setGenerationsToday(profile?.generations_this_month || 0);
      }

      setUserTier((profile?.user_tier as UserTier) || 'free');

      // Get project count
      const { count } = await supabase
        .from('websites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      setProjectCount(count || 0);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
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
      console.error('Error incrementing generation:', error);
      return false;
    }
  }

  return {
    userTier,
    generationsToday,
    projectCount,
    loading,
    canGenerate: generationsToday < TIER_LIMITS[userTier].monthlyGenerations, // generationsToday = this month's count
    canCreateProject: true,
    incrementGeneration,
    tierLimits: TIER_LIMITS[userTier],
    isPro: userTier === 'pro',
    isFree: userTier === 'free'
  };
}
