import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface UsageData {
  generationsUsed: number;
  generationsLimit: number;
  monthYear: string;
  canGenerate: boolean;
}

export const useUsageTracking = (userId: string | undefined) => {
  const [usage, setUsage] = useState<UsageData>({
    generationsUsed: 0,
    generationsLimit: 2,
    monthYear: new Date().toISOString().slice(0, 7),
    canGenerate: true
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchingRef = useRef(false);
  const fetchCountRef = useRef(0);
  const lastFetchRef = useRef(0);

  const fetchUsage = async () => {
    if (fetchingRef.current) {
      console.log('Already fetching usage, skipping...');
      return;
    }

    const now = Date.now();
    if (now - lastFetchRef.current < 5000) {
      console.log('Rate limited, skipping fetch...');
      return;
    }

    if (fetchCountRef.current >= 5) {
      console.error('Max fetch attempts reached');
      setLoading(false);
      return;
    }

    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      fetchingRef.current = true;
      fetchCountRef.current++;
      lastFetchRef.current = now;

      console.log(`Fetching usage (attempt ${fetchCountRef.current})...`);

      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        console.error('Session refresh failed:', sessionError);
        setLoading(false);
        return;
      }

      const response = await fetch('https://original-lbxv.onrender.com/api/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch profile:', response.statusText);
        setUsage({
          generationsUsed: 0,
          generationsLimit: 2,
          monthYear: new Date().toISOString().slice(0, 7),
          canGenerate: true
        });
        setLoading(false);
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        const profile = result.data.profile;
        setUsage({
          generationsUsed: profile.generations_this_month || 0,
          generationsLimit: profile.monthly_limit || 2,
          monthYear: profile.current_month || new Date().toISOString().slice(0, 7),
          canGenerate: (profile.remaining_generations || 0) > 0
        });

        console.log('Usage updated from /api/profile:', {
          used: profile.generations_this_month,
          limit: profile.monthly_limit,
          remaining: profile.remaining_generations,
          canGenerate: (profile.remaining_generations || 0) > 0
        });
      } else {
        console.error('Profile data error');
        setUsage({
          generationsUsed: 0,
          generationsLimit: 2,
          monthYear: new Date().toISOString().slice(0, 7),
          canGenerate: true
        });
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
      setUsage({
        generationsUsed: 0,
        generationsLimit: 2,
        monthYear: new Date().toISOString().slice(0, 7),
        canGenerate: true
      });
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  const incrementUsage = async () => {
    if (!userId) return false;

    try {
      setUsage(prev => ({
        ...prev,
        generationsUsed: prev.generationsUsed + 1,
        canGenerate: prev.generationsUsed + 1 < prev.generationsLimit
      }));

      setTimeout(() => {
        fetchUsage();
      }, 500);

      return true;
    } catch (error) {
      console.error('Error in incrementUsage:', error);
      fetchUsage();
      return false;
    }
  };

  useEffect(() => {
    if (!userId) return;

    fetchCountRef.current = 0;
    lastFetchRef.current = 0;
    fetchUsage();

    const monthCheckInterval = setInterval(() => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      if (usage.monthYear !== currentMonth) {
        console.log('Month changed, refetching usage...');
        fetchUsage();
      }
    }, 300000);

    return () => clearInterval(monthCheckInterval);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab visible, refetching usage...');
        fetchUsage();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'usage_updated') {
        console.log('Usage updated in another tab, refetching...');
        fetchUsage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [userId]);

  return {
    usage,
    loading,
    incrementUsage,
    refreshUsage: fetchUsage
  };
};

export function notifyUsageUpdate() {
  try {
    localStorage.setItem('usage_updated', Date.now().toString());
    localStorage.removeItem('usage_updated');
  } catch (err) {
    console.warn('Failed to notify other tabs:', err);
  }
}
