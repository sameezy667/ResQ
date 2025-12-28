/**
 * Units Hook with Real-time Sync
 * 
 * Custom hook for managing emergency units data with real-time updates from Supabase.
 * Automatically subscribes to database changes and keeps local state in sync.
 * 
 * Features:
 * - Initial data load on mount
 * - Real-time INSERT, UPDATE, DELETE sync
 * - Automatic cleanup on unmount
 * - Loading and error states
 * 
 * @module hooks/useUnits
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Unit } from '../types/db';

/**
 * Hook for accessing and syncing emergency units with real-time updates
 * 
 * @returns Object with units array, loading state, and error message
 */
export function useUnits() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    /**
     * Load initial units from database
     */
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('units')
          .select('*')
          .order('name', { ascending: true });  // Changed from 'label' to 'name'

        if (cancelled) return;

        if (error) {
          setError(error.message);
          console.error('Error loading units:', error);
        } else if (data) {
          setUnits(data as Unit[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load units');
          console.error('Error loading units:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    /**
     * Subscribe to real-time changes
     * 
     * Listens for INSERT, UPDATE, and DELETE events on the units table
     * and automatically updates local state to reflect database changes.
     */
    const channel = supabase
      .channel('units-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'units' },
        (payload) => {
          console.log('Unit change:', payload.eventType, payload);
          
          setUnits((prev) => {
            // Handle new unit
            if (payload.eventType === 'INSERT') {
              return [...prev, payload.new as Unit].sort((a, b) =>
                (a.name || a.label || '').localeCompare(b.name || b.label || '')  // Handle both name and label
              );
            }
            
            // Handle updated unit
            if (payload.eventType === 'UPDATE') {
              return prev.map((u) =>
                u.id === (payload.new as Unit).id ? (payload.new as Unit) : u
              );
            }
            
            // Handle deleted unit
            if (payload.eventType === 'DELETE') {
              return prev.filter((u) => u.id !== (payload.old as Unit).id);
            }
            
            return prev;
          });
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { units, loading, error };
}
