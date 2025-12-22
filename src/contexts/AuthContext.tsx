<DOCUMENT filename="AuthContext.tsx">
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

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

  const fetchUserTier = async (userId: string) => {
    try {
      console.log(`🔍 Fetching tier for user ${userId}...`);

      // ✅ FIX: Query profiles table instead of user_tiers
      const { data, error } = await supabase
        .from('profiles')
        .select('user_tier')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Failed to fetch user tier:', error);
        setUserTier('free');
        return;
      }

      const tier = data?.user_tier || 'free';
      setUserTier(tier);
      
      console.log(`✅ User tier verified from database: ${tier}`);
    } catch (error) {
      console.error('❌ Error fetching tier:', error);
      setUserTier('free');
    }
  };

  const refreshUserTier = async () => {
    if (!user?.id) {
      console.warn('⚠️ Cannot refresh tier: no user logged in');
      return;
    }
    console.log('🔄 Refreshing user tier...');
    await fetchUserTier(user.id);
  };

  const initializeAuth = async () => {
    try {
      setLoading(true);
      
      // Try to get current session
      let { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      // If no session, try to refresh it
      if (!currentSession && !error) {
        console.log('⚠️ No session found, attempting refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshData?.session) {
          currentSession = refreshData.session;
          console.log('✅ Session refreshed successfully');
        } else {
          console.log('ℹ️ No active session after refresh attempt');
        }
      }
      
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

  const signIn = async (email: string, password: string) => {
    try {
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
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
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
        setUser(data.user);
        setSession(data.session);
       
        // ✅ FIX: Create tier entry for new user
        await fetchUserTier(data.user.id);
        toast({
          title: 'Account Created!',
          description: 'Welcome to Sento AI!',
        });
      }
    } catch (error) {
      console.error('❌ Sign up error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: 'Sign Out Failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
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
    }
  };

  // ✅ FIX: Simplified auth listener - no infinite loops
  useEffect(() => {
    initializeAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔔 Auth state changed:', event);
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setUserTier('free');
        }
        // Other events handled by signIn/signUp functions
      }
    );
    return () => {
      subscription.unsubscribe();
    };
  }, []); // ✅ Empty deps - only run once

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

export const useAuth = () => {
  const context = useContext(AuthContext);
 
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
 
  return context;
};

export function notifyTierUpdate() {
  try {
    localStorage.setItem('tier_updated', Date.now().toString());
    localStorage.removeItem('tier_updated');
  } catch (err) {
    console.warn('⚠️ Failed to notify other tabs:', err);
  }
}
</DOCUMENT>
