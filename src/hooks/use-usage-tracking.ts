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
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      
      if (!backendUrl) {
        console.error('❌ VITE_BACKEND_URL not configured');
        setLoading(false);
        return;
      }

      // ✅ Call secure server endpoint
      const response = await fetch(`${backendUrl}/api/usage-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId })
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch usage stats:', response.statusText);
        
        // Fallback to conservative free tier limits
        setUsage({
          generationsUsed: 0,
          generationsLimit: 2,
          monthYear: new Date().toISOString().slice(0, 7),
          canGenerate: true
        });
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.success) {
        // ✅ Server provides verified tier and limits
        setUsage({
          generationsUsed: data.used,
          generationsLimit: data.limit,
          monthYear: data.month,
          canGenerate: data.remaining > 0
        });
        
        console.log('✅ Usage fetched from server:', {
          tier: data.tier,
          used: data.used,
          limit: data.limit,
          remaining: data.remaining
        });
      } else {
        console.error('❌ Usage stats error:', data.error);
        
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
      
      // Fallback to conservative limits on error
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

export function notifyUsageUpdate() {
  try {
    localStorage.setItem('usage_updated', Date.now().toString());
    localStorage.removeItem('usage_updated');
  } catch (err) {
    console.warn('⚠️ Failed to notify other tabs:', err);
  }
}
