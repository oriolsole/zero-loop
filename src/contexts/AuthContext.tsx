
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { enhancedProfileService, EnhancedUserProfile } from '@/services/enhancedProfileService';
import { getAllScopes } from '@/types/googleScopes';
import { enhancedGoogleOAuthService } from '@/services/enhancedGoogleOAuthService';

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  profile: EnhancedUserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  hasGoogleTokens: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  connectGoogleServices: () => Promise<void>;
  checkGoogleTokens: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<EnhancedUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasGoogleTokens, setHasGoogleTokens] = useState(false);

  const checkGoogleTokens = async () => {
    if (user) {
      const status = await enhancedGoogleOAuthService.getConnectionStatus();
      setHasGoogleTokens(status.connected);
      
      // If user is logged in with Google but no API tokens, show helpful message
      if (user.app_metadata?.provider === 'google' && !status.connected) {
        console.log('Google auth detected but no API tokens found');
      }
    } else {
      setHasGoogleTokens(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await enhancedProfileService.getProfile();
      setProfile(userProfile);
    } else {
      setProfile(null);
    }
  };

  const connectGoogleServices = async () => {
    try {
      setIsLoading(true);
      await enhancedGoogleOAuthService.connectWithPopup();
      await refreshProfile();
      await checkGoogleTokens();
      toast.success('Google services connected successfully!');
    } catch (error: any) {
      console.error('Failed to connect Google services:', error);
      toast.error(`Failed to connect Google services: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Load profile and check Google tokens when user signs in
        if (newSession?.user) {
          setTimeout(async () => {
            await refreshProfile();
            await checkGoogleTokens();
          }, 0);
        } else {
          setProfile(null);
          setHasGoogleTokens(false);
        }
        
        if (event === 'SIGNED_IN') {
          toast.success('Signed in successfully');
        } else if (event === 'SIGNED_OUT') {
          toast.info('Signed out');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        console.log('User authenticated on init:', currentSession.user.id);
        await refreshProfile();
        await checkGoogleTokens();
      } else {
        console.log('No user authenticated on init');
      }
      
      setIsLoading(false);
      setIsInitialized(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast.error(`Sign in failed: ${error.message}`);
        throw error;
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) {
        toast.error(`Sign up failed: ${error.message}`);
        throw error;
      }
      
      toast.success('Signup successful! Please check your email for confirmation.');
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      const redirectUrl = `${window.location.origin}/`;
      
      // Request basic Google scopes for authentication only
      const basicScopes = ['openid', 'email', 'profile'];
      const scopesString = basicScopes.join(' ');
      
      console.log('🔄 Requesting Google OAuth for authentication only:', basicScopes);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes: scopesString
        }
      });
      
      if (error) {
        toast.error(`Google sign in failed: ${error.message}`);
        throw error;
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    session,
    user,
    profile,
    isLoading,
    isInitialized,
    hasGoogleTokens,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
    connectGoogleServices,
    checkGoogleTokens
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
