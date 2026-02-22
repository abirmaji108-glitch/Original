// src/hooks/useFeatureGate.ts
// ✅ COMPLETE VERSION - Includes ALL properties your code expects
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface FeatureGateState {
  loading: boolean;
  userTier: string;
  generationsThisMonth: number;
  projectCount: number;
  limit: number;
  canGenerate: boolean;
  canCreateProject: boolean;
  isPro: boolean;
  isFree: boolean;
  isStarter: boolean;
  generationsToday: number;
  creditsBalance: number;
  creditsUsed: number;
  userId?: string;
  tierLimits: {
    monthlyGenerations: number;
    maxProjects: number;
    customDomain: boolean;
    prioritySupport: boolean;
    credits: number;
  };
}

export function useFeatureGate() {
  const [state, setState] = useState<FeatureGateState>({
    loading: true,
    userTier: 'free',
    generationsThisMonth: 0,
    projectCount: 0,
    limit: 2,
    canGenerate: true,
    canCreateProject: true,
    isPro: false,
    isFree: true,
    isStarter: false,
    generationsToday: 0,
    creditsBalance: 20,
    creditsUsed: 0,
    tierLimits: {
      monthlyGenerations: 2,
      maxProjects: 1,
      customDomain: false,
      prioritySupport: false,
      credits: 20
    }
  });

  // ✅ FIX: Use ref to prevent infinite loops
  const isInitialized = useRef(false);
  const lastFetchTime = useRef(0);
  const isFetching = useRef(false);

  const fetchUserData = useCallback(async () => {
    // ✅ FIX #1: Prevent concurrent fetches
    if (isFetching.current) {
      return;
    }

    // ✅ FIX #2: Debounce - only fetch once per 3 seconds
    const now = Date.now();
    if (now - lastFetchTime.current < 3000) {
      return;
    }

    isFetching.current = true;
    lastFetchTime.current = now;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.id) {
        setState({
          loading: false,
          userTier: 'free',
          generationsThisMonth: 0,
          projectCount: 0,
          limit: 2,
          canGenerate: true,
          canCreateProject: true,
          isPro: false,
          isFree: true,
      isStarter: false,
      generationsToday: 0,
      creditsBalance: 0,
      creditsUsed: 0,
      tierLimits: {
        monthlyGenerations: 2,
        maxProjects: 1,
        customDomain: false,
        prioritySupport: false,
        credits: 20
      }
        });
        return;
      }

      const token = session.access_token;
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://original-lbxv.onrender.com'}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const result = await response.json();
      
      if (result.success && result.data?.profile) {
        const profile = result.data.profile;
        const tierLimitsMap: Record<string, any> = {
          'free': {
            monthlyGenerations: 2,
            maxProjects: 1,
            customDomain: false,
            prioritySupport: false,
            credits: 20
          },
          'starter': {
            monthlyGenerations: 6,
            maxProjects: 3,
            customDomain: false,
            prioritySupport: false,
            credits: 60
          },
          'basic': {
            monthlyGenerations: 13,
            maxProjects: 999,
            customDomain: true,
            prioritySupport: false,
            credits: 130
          },
          'pro': {
            monthlyGenerations: 40,
            maxProjects: 999,
            customDomain: true,
            prioritySupport: true,
            credits: 400
          }
        };
        const userTier = profile.user_tier || 'free';
        const limits = tierLimitsMap[userTier];
        const generationsThisMonth = profile.generations_this_month || 0;

        const creditsBalance = profile.credits_balance ?? 20;
        const creditsUsed = profile.credits_used_this_month ?? 0;

        const newState: FeatureGateState = {
          loading: false,
          userTier,
          generationsThisMonth,
          projectCount: profile.project_count || 0,
          limit: limits.monthlyGenerations,
          canGenerate: creditsBalance >= 10,
          canCreateProject: true,
          isPro: userTier === 'pro',
          isFree: userTier === 'free',
          isStarter: userTier === 'starter',
          generationsToday: generationsThisMonth,
          creditsBalance,
          creditsUsed,
          userId: session.user.id,
          tierLimits: limits
        };

        // Always update state to ensure UI reflects current data
        setState(newState);
        console.log('✅ useFeatureGate: State updated', newState);
      }
    } catch (error) {
      console.error('❌ Feature gate error:', error);
      setState({
        loading: false,
        userTier: 'free',
        generationsThisMonth: 0,
        projectCount: 0,
        limit: 2,
        canGenerate: true,
        canCreateProject: true,
        isPro: false,
        isFree: true,
      isStarter: false,
      generationsToday: 0,
      creditsBalance: 0,
      creditsUsed: 0,
      tierLimits: {
        monthlyGenerations: 2,
        maxProjects: 1,
        customDomain: false,
        prioritySupport: false,
        credits: 20
      }
      });
    } finally {
      isFetching.current = false;
    }
  }, []);

  // ✅ FIX: Increment generation count
  const incrementGeneration = useCallback(async () => {
    if (!state.userId) {
      return false;
    }

    try {
      setState(prev => ({
        ...prev,
        generationsThisMonth: prev.generationsThisMonth + 1,
        generationsToday: prev.generationsToday + 1
      }));
      return true;
    } catch (err) {
      console.error('❌ incrementGeneration error:', err);
      return false;
    }
  }, [state.userId]);

  // ✅ FIX #4: Only run once on mount
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      console.log('🔵 useFeatureGate: Initializing');
      fetchUserData();
    }
  }, [fetchUserData]);

  // ✅ FIX #5: Listen for auth changes (but debounced)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserData();
      } else {
        setState({
          loading: false,
          userTier: 'free',
          generationsThisMonth: 0,
          projectCount: 0,
          limit: 2,
          canGenerate: true,
          canCreateProject: true,
          isPro: false,
          isFree: true,
      isStarter: false,
      generationsToday: 0,
      creditsBalance: 0,
      creditsUsed: 0,
      tierLimits: {
        monthlyGenerations: 2,
        maxProjects: 1,
        customDomain: false,
        prioritySupport: false,
        credits: 20
      }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  return {
    ...state,
    refreshUsage: fetchUserData,
    refreshLimits: fetchUserData,
    incrementGeneration,
    creditsBalance: state.creditsBalance,
    creditsUsed: state.creditsUsed,
    isStarter: state.isStarter
  };
}
