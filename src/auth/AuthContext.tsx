/**
 * Authentication Context Provider
 * 
 * Manages global authentication state and provides it to all components.
 * Automatically syncs with Supabase auth state changes and ensures
 * user profiles are created/updated on login.
 * 
 * Usage:
 * - Wrap your app with <AuthProvider>
 * - Access auth state with useAuth() hook in any component
 * 
 * @module auth/AuthContext
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { ensureProfile } from './supabaseAuth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

/**
 * Auth Provider Component
 * 
 * Provides authentication context to the entire application.
 * Listens for auth state changes and automatically ensures
 * user profiles are synced with the database.
 * 
 * @param children - Child components to wrap
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state on mount
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          setUser(data.session.user);
          // Ensure profile exists for authenticated user
          await ensureProfile(data.session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Subscribe to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      // Ensure profile exists when user signs in
      if (session?.user) {
        try {
          await ensureProfile(session.user.id);
        } catch (error) {
          console.error('Error ensuring profile:', error);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

/**
 * Hook to access authentication context
 * 
 * Must be used within an AuthProvider component.
 * 
 * @returns Authentication context with user and loading state
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
