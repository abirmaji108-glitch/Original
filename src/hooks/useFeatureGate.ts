// src/hooks/useFeatureGate.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TIER_LIMITS, UserTier, canGenerate, canCreateProject } from '@/config/tiers';

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
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_tier, generations_today, last_generation_date')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      // Reset generations if it's a new day
      const today = new Date().toISOString().split('T')[0];
      const lastGenDate = profile?.last_generation_date || today;
      
      if (lastGenDate !== today) {
        await supabase
          .from('profiles')
          .update({ 
            generations_today: 0, 
            last_generation_date: today 
          })
          .eq('id', user?.id);
        
        setGenerationsToday(0);
      } else {
        setGenerationsToday(profile?.generations_today || 0);
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
          generations_today: generationsToday + 1 
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
    canGenerate: canGenerate(userTier, generationsToday),
    canCreateProject: canCreateProject(userTier, projectCount),
    incrementGeneration,
    tierLimits: TIER_LIMITS[userTier],
    isPro: userTier === 'pro' || userTier === 'enterprise',
    isFree: userTier === 'free'
  };
}
