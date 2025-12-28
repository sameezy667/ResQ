/**
 * Supabase Authentication Utilities
 * 
 * Helper functions for managing user authentication with Supabase.
 * Provides OTP (magic link) email authentication and profile management.
 * 
 * @module auth/supabaseAuth
 */

import { supabase } from '../lib/supabase';
import type { Profile } from '../types/db';

/**
 * Sign in user with email using OTP (magic link)
 * 
 * Sends a one-time password link to the user's email.
 * User clicks the link to complete authentication.
 * 
 * @param email - User's email address
 * @returns Auth response data
 * @throws Error if sign-in fails
 */
export async function signInWithEmail(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
  return data;
}

/**
 * Get the currently authenticated user
 * 
 * @returns Current user object or null if not authenticated
 * @throws Error if request fails
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

/**
 * Sign out the current user
 * 
 * @throws Error if sign-out fails
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Ensure a profile exists for the user
 * 
 * Creates or updates the user's profile in the profiles table.
 * Called automatically after authentication to ensure data consistency.
 * 
 * @param userId - User's ID from auth.users
 * @param fullName - Optional full name for the profile
 * @returns Profile object or null if operation fails
 * @throws Error if database operation fails
 */
export async function ensureProfile(userId: string, fullName?: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, full_name: fullName ?? null } as any,
      { onConflict: 'id' }
    )
    .select()
    .single();
  
  if (error) throw error;
  return data as Profile | null;
}

/**
 * Get a user's profile by ID
 * 
 * @param userId - User's ID
 * @returns Profile object or null if not found
 * @throws Error if database query fails
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  return data as Profile | null;
}

/**
 * Update a user's profile
 * 
 * @param userId - User's ID
 * @param updates - Profile fields to update
 * @throws Error if update fails
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at'>>
) {
  // @ts-ignore - Type mismatch with generated types, using runtime casting
  const { error } = await (supabase as any)
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  
  if (error) throw error;
}
