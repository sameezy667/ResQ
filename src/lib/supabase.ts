/**
 * Supabase Client Configuration
 * 
 * This module initializes and exports the Supabase client for the ResQ application.
 * The client is configured with the project URL and anonymous key from environment variables.
 * 
 * Key features:
 * - Singleton pattern: creates one client instance for the entire app
 * - Real-time subscriptions enabled by default
 * - Authentication state persistence
 * 
 * @module lib/supabase
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging (remove in production)
console.log('[Supabase] Environment check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlPrefix: supabaseUrl?.substring(0, 30),
  keyPrefix: supabaseAnonKey?.substring(0, 20),
  keyLength: supabaseAnonKey?.length,
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

/**
 * Supabase client instance
 * 
 * Configured with:
 * - Auto-refresh tokens for seamless authentication
 * - Session persistence in localStorage
 * - Real-time enabled for incidents, units, and dispatches
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Helper function to handle Supabase errors consistently
 * @param error - Error object from Supabase
 * @param context - Context string for debugging
 */
export function handleSupabaseError(error: any, context: string): never {
  console.error(`[Supabase Error - ${context}]:`, error);
  throw new Error(`${context}: ${error.message || 'Unknown error'}`);
}

/**
 * Type-safe database query helper
 * Provides autocomplete and type checking for all database operations
 */
export const db = {
  incidents: () => supabase.from('incidents'),
  units: () => supabase.from('units'),
  dispatches: () => supabase.from('dispatches'),
  profiles: () => supabase.from('profiles'),
  attachments: () => supabase.from('attachments'),
  auditLogs: () => supabase.from('audit_logs'),
};
