import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth event:', event); // ✅ ADD LOGGING
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // ✅ ADD EVENT HANDLING
      if (event === 'SIGNED_OUT') {
        console.log('🔓 User signed out - clearing cache');
        localStorage.removeItem('user_tier');
        localStorage.removeItem('generations_today');
      }
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('✅ Token refreshed successfully');
      }
      
      if (event === 'USER_UPDATED') {
        console.log('👤 User profile updated');
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]); // ✅ ADD toast dependency

  const signUp = async (email: string, password: string) => {
    try {
      // ✅ VALIDATION BEFORE API CALL
      
      // Email validation
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive"
        });
        return { error: new Error('Invalid email format') };
      }
      
      // Password strength validation
      if (password.length < 8) {
        toast({
          title: "Weak Password",
          description: "Password must be at least 8 characters long.",
          variant: "destructive"
        });
        return { error: new Error('Password too short') };
      }
      
      if (!/[A-Z]/.test(password)) {
        toast({
          title: "Weak Password",
          description: "Password must contain at least one uppercase letter.",
          variant: "destructive"
        });
        return { error: new Error('Password needs uppercase') };
      }
      
      if (!/[0-9]/.test(password)) {
        toast({
          title: "Weak Password",
          description: "Password must contain at least one number.",
          variant: "destructive"
        });
        return { error: new Error('Password needs number') };
      }
      
      // Now call Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "Success!",
        description: "Please check your email to verify your account.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // ✅ ADD VALIDATION
      if (!email || !password) {
        toast({
          title: "Missing Fields",
          description: "Please enter both email and password.",
          variant: "destructive"
        });
        return { error: new Error('Missing credentials') };
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // ✅ BETTER ERROR MESSAGES
        let errorMsg = error.message;
        
        if (error.message.includes('Invalid login credentials')) {
          errorMsg = 'Incorrect email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMsg = 'Please verify your email before signing in.';
        }
        
        toast({
          title: "Sign In Failed",
          description: errorMsg,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Signed Out",
        description: "You've been successfully signed out.",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
