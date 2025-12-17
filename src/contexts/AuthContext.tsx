import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============================================
// SECURE AUTH CONTEXT
// ============================================
// Fixes Issues: #37, #38, #39, #40, #41
// Tier is NEVER stored in user_metadata
// All tier data comes from server verification

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userTier: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserTier: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userTier, setUserTier] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // ============================================
  // FIX #37, #38: FETCH TIER FROM DATABASE
  // ============================================
  // NEVER trust user_metadata - always fetch from profiles table
  // Server verification prevents client manipulation
  
  const fetchUserTier = async (userId: string) => {
    try {
      console.log(`🔍 Fetching tier for user ${userId}...`);

      const { data, error } = await supabase
        .from('profiles')
        .select('user_tier')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Failed to fetch user tier:', error);
        setUserTier('free'); // Fallback to free tier
        return;
      }

      const tier = data?.user_tier || 'free';
      setUserTier(tier);
      
      console.log(`✅ User tier verified from database: ${tier}`);
    } catch (error) {
      console.error('❌ Error fetching tier:', error);
      setUserTier('free'); // Fallback to free tier
    }
  };

  // ============================================
  // FIX #40: REFRESH TIER MECHANISM
  // ============================================
  // Public function to refresh tier (called after payment, upgrades, etc.)
  
  const refreshUserTier = async () => {
    if (!user?.id) {
      console.warn('⚠️ Cannot refresh tier: no user logged in');
      return;
    }

    console.log('🔄 Refreshing user tier...');
    await fetchUserTier(user.id);
  };

  // ============================================
  // FIX #41: SESSION VALIDATION WITH TIER REFRESH
  // ============================================
  // Re-verify tier from database on every session check
  
  const initializeAuth = async () => {
    try {
      setLoading(true);

      // Check for existing session
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ Session error:', error);
        setUser(null);
        setSession(null);
        setUserTier('free');
        return;
      }

      if (currentSession?.user) {
        console.log('✅ Session found, verifying tier...');
        
        setUser(currentSession.user);
        setSession(currentSession);
        
        // ✅ FIX #41: Always re-verify tier from database
        await fetchUserTier(currentSession.user.id);
      } else {
        console.log('ℹ️ No active session');
        setUser(null);
        setSession(null);
        setUserTier('free');
      }
    } catch (error) {
      console.error('❌ Auth initialization error:', error);
      setUser(null);
      setSession(null);
      setUserTier('free');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SIGN IN WITH TIER VERIFICATION
  // ============================================
  
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: 'Sign In Failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        
        // ✅ FIX #38: Verify tier from database on login
        await fetchUserTier(data.user.id);

        toast({
          title: 'Welcome Back!',
          description: 'Successfully signed in.',
        });
      }
    } catch (error) {
      console.error('❌ Sign in error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SIGN UP WITH AUTOMATIC PROFILE CREATION
  // ============================================
  
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast({
          title: 'Sign Up Failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      if (data.user) {
        // Profile is automatically created via database trigger
        // Default tier is 'free' from database schema
        
        setUser(data.user);
        setSession(data.session);
        setUserTier('free'); // New users start as free

        toast({
          title: 'Account Created!',
          description: 'Please check your email to verify your account.',
        });
      }
    } catch (error) {
      console.error('❌ Sign up error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SIGN OUT
  // ============================================
  
  const signOut = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        toast({
          title: 'Sign Out Failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      // Clear state
      setUser(null);
      setSession(null);
      setUserTier('free');

      toast({
        title: 'Signed Out',
        description: 'Successfully signed out.',
      });
    } catch (error) {
      console.error('❌ Sign out error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // AUTH STATE CHANGE LISTENER
  // ============================================
  // Listen for auth changes and re-verify tier
  
  useEffect(() => {
    // Initialize auth on mount
    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔔 Auth state changed:', event);

        if (event === 'SIGNED_IN' && currentSession?.user) {
          setUser(currentSession.user);
          setSession(currentSession);
          
          // ✅ FIX #38, #41: Re-verify tier on auth change
          await fetchUserTier(currentSession.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setUserTier('free');
        } else if (event === 'TOKEN_REFRESHED' && currentSession?.user) {
          setSession(currentSession);
          
          // ✅ FIX #41: Re-verify tier on token refresh
          await fetchUserTier(currentSession.user.id);
        } else if (event === 'USER_UPDATED' && currentSession?.user) {
          setUser(currentSession.user);
          
          // ✅ FIX #39: Re-verify tier on user update
          await fetchUserTier(currentSession.user.id);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ============================================
  // FIX #40: PERIODIC TIER REFRESH
  // ============================================
  // Poll for tier changes every 2 minutes (catches webhook updates)
  
  useEffect(() => {
    if (!user?.id) return;

    // Refresh tier every 2 minutes to catch webhook updates
    const tierRefreshInterval = setInterval(() => {
      console.log('🔄 Periodic tier refresh...');
      fetchUserTier(user.id);
    }, 120000); // 2 minutes

    return () => clearInterval(tierRefreshInterval);
  }, [user?.id]);

  // ============================================
  // FIX #40: VISIBILITY-BASED TIER REFRESH
  // ============================================
  // Refresh tier when user returns to tab (catches upgrades from other tabs)
  
  useEffect(() => {
    if (!user?.id) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Tab visible, refreshing tier...');
        fetchUserTier(user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  // ============================================
  // FIX #40: CROSS-TAB TIER SYNC
  // ============================================
  // Listen for tier updates from other tabs
  
  useEffect(() => {
    if (!user?.id) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tier_updated') {
        console.log('🔄 Tier updated in another tab, refreshing...');
        fetchUserTier(user.id);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user?.id]);

  const value: AuthContextType = {
    user,
    session,
    userTier,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUserTier,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================
// HOOK TO USE AUTH CONTEXT
// ============================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// ============================================
// HELPER: NOTIFY OTHER TABS OF TIER UPDATE
// ============================================
// Call this after successful payment/upgrade

export function notifyTierUpdate() {
  try {
    localStorage.setItem('tier_updated', Date.now().toString());
    localStorage.removeItem('tier_updated');
  } catch (err) {
    console.warn('⚠️ Failed to notify other tabs:', err);
  }
}
