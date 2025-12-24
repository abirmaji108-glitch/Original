// src/hooks/useFeatureGate.ts
// ✅ FIXED: Prevents infinite re-renders and console explosion
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface FeatureGateState {
  loading: boolean;
  userTier: string;
  generationsThisMonth: number;
  limit: number;
  canGenerate: boolean;
  userId?: string;
}

export function useFeatureGate() {
  const [state, setState] = useState<FeatureGateState>({
    loading: true,
    userTier: 'free',
    generationsThisMonth: 0,
    limit: 2,
    canGenerate: true,
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
          limit: 2,
          canGenerate: true,
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
        const tierLimits: Record<string, number> = {
          'free': 2,
          'basic': 10,
          'pro': 50,
          'business': 200
        };

        const newState = {
          loading: false,
          userTier: profile.user_tier || 'free',
          generationsThisMonth: profile.generations_this_month || 0,
          limit: tierLimits[profile.user_tier] || 2,
          canGenerate: (profile.generations_this_month || 0) < (tierLimits[profile.user_tier] || 2),
          userId: session.user.id
        };

        // ✅ FIX #3: Only update if state actually changed
        setState(prevState => {
          if (
            prevState.userTier === newState.userTier &&
            prevState.generationsThisMonth === newState.generationsThisMonth &&
            prevState.limit === newState.limit &&
            prevState.canGenerate === newState.canGenerate
          ) {
            return prevState; // No change, don't trigger re-render
          }
          console.log('✅ useFeatureGate: State updated', newState);
          return newState;
        });
      }
    } catch (error) {
      console.error('❌ Feature gate error:', error);
      setState({
        loading: false,
        userTier: 'free',
        generationsThisMonth: 0,
        limit: 2,
        canGenerate: true,
      });
    } finally {
      isFetching.current = false;
    }
  }, []);

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
          limit: 2,
          canGenerate: true,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  return {
    ...state,
    refreshUsage: fetchUserData // Allow manual refresh
  };
}
