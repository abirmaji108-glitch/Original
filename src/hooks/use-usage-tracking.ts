import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TIER_LIMITS, UserTier } from '@/config/tiers';

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

  // ============================================
  // FIX #32, #33, #34: SERVER-VERIFIED USAGE
  // ============================================
  // Changed from direct Supabase queries to server endpoint
  // Server verifies tier from database (prevents client manipulation)
  const fetchUsage = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // ✅ FIX: Always refresh session to get valid token
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        console.error('❌ Session refresh failed:', sessionError);
        setLoading(false);
        return;
      }

      // ✅ Call /api/profile which exists in your Server.js
      const response = await fetch('https://original-lbxv.onrender.com/api/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch profile:', response.statusText);
      
        // Fallback to conservative limits
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
        // ✅ FIX: Your backend returns these exact field names
        const profile = result.data.profile;
        // Backend returns: generations_this_month, monthly_limit, remaining_generations, current_month
        setUsage({
          generationsUsed: profile.generations_this_month || 0,
          generationsLimit: profile.monthly_limit || 2,
          monthYear: profile.current_month || new Date().toISOString().slice(0, 7),
          canGenerate: (profile.remaining_generations || 0) > 0
        });

        console.log('✅ Usage updated from /api/profile:', {
          used: profile.generations_this_month,
          limit: profile.monthly_limit,
          remaining: profile.remaining_generations,
          canGenerate: (profile.remaining_generations || 0) > 0
        });
      } else {
        console.error('❌ Profile data error');
      
        // Fallback
        setUsage({
          generationsUsed: 0,
          generationsLimit: 2,
          monthYear: new Date().toISOString().slice(0, 7),
          canGenerate: true
        });
      }
    } catch (error) {
      console.error('❌ Error fetching usage:', error);
    
      // Fallback
      setUsage({
        generationsUsed: 0,
        generationsLimit: 2,
        monthYear: new Date().toISOString().slice(0, 7),
        canGenerate: true
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // KEEP incrementUsage FOR BACKWARD COMPATIBILITY
  // ============================================
  // Your Index.tsx calls this - keep it working
  // Server already increments via atomic RPC in /api/generate
  // This just updates local state optimistically
  // ✅ CHANGE 7: Removed free-tier skip logic (already applied: only checks !userId)
  const incrementUsage = async () => {
    if (!userId) return false;

    try {
      // ✅ Optimistically update local state
      setUsage(prev => ({
        ...prev,
        generationsUsed: prev.generationsUsed + 1,
        canGenerate: prev.generationsUsed + 1 < prev.generationsLimit
      }));

      // ✅ Refetch from server to get authoritative count
      // This handles race conditions and ensures consistency
      setTimeout(() => {
        fetchUsage();
      }, 500);

      return true;
    } catch (error) {
      console.error('Error in incrementUsage:', error);
    
      // Refetch on error to get accurate state
      fetchUsage();
      return false;
    }
  };

  // ============================================
  // FIX #35: MONTHLY RESET DETECTION
  // ============================================
  // Automatically refetch when month changes
  useEffect(() => {
    if (!userId) return;

    fetchUsage();

    // Check for month change every minute
    const monthCheckInterval = setInterval(() => {
      const currentMonth = new Date().toISOString().slice(0, 7);
    
      if (usage.monthYear !== currentMonth) {
        console.log('📅 Month changed, refetching usage...');
        fetchUsage();
      }
    }, 60000); // 1 minute

    return () => clearInterval(monthCheckInterval);
  }, [userId, usage.monthYear]);

  // ============================================
  // FIX #36: POLLING FOR REAL-TIME UPDATES
  // ============================================
  // Poll server every 30 seconds to catch updates
  useEffect(() => {
    if (!userId) return;

    const pollInterval = setInterval(() => {
      fetchUsage();
    }, 30000); // 30 seconds

    return () => clearInterval(pollInterval);
  }, [userId]);

  // ============================================
  // FIX #36: VISIBILITY-BASED REFETCH
  // ============================================
  // Refetch when user returns to tab
  useEffect(() => {
    if (!userId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Tab visible, refetching usage...');
        fetchUsage();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  // ============================================
  // FIX #36: CROSS-TAB SYNCHRONIZATION
  // ============================================
  // Listen for updates from other tabs
  useEffect(() => {
    if (!userId) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'usage_updated') {
        console.log('🔄 Usage updated in another tab, refetching...');
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

// ============================================
// HELPER: NOTIFY OTHER TABS OF UPDATES
// ============================================
// This is exported but NOT required for basic functionality
// Index.tsx can call it optionally for cross-tab sync
// ✅ CHANGE 8: Retained for Index.tsx post-success calls (no changes needed here)
export function notifyUsageUpdate() {
  try {
    localStorage.setItem('usage_updated', Date.now().toString());
    localStorage.removeItem('usage_updated');
  } catch (err) {
    console.warn('⚠️ Failed to notify other tabs:', err);
  }
}
