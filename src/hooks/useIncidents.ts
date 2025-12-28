/**
 * Incidents Hook with Real-time Sync
 * 
 * Custom hook for managing incidents data with real-time updates from Supabase.
 * Automatically subscribes to database changes and keeps local state in sync.
 * 
 * Features:
 * - Initial data load on mount
 * - Real-time INSERT, UPDATE, DELETE sync
 * - Automatic cleanup on unmount
 * - Loading and error states
 * 
 * @module hooks/useIncidents
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Incident } from '../types/db';

/**
 * Hook for accessing and syncing incidents with real-time updates
 * 
 * @returns Object with incidents array, loading state, and error message
 */
export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    /**
     * Load initial incidents from database
     */
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .order('created_at', { ascending: false });

        if (cancelled) return;

        if (error) {
          setError(error.message);
          console.error('Error loading incidents:', error);
        } else if (data) {
          setIncidents(data as Incident[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load incidents');
          console.error('Error loading incidents:', err);
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
     * Listens for INSERT, UPDATE, and DELETE events on the incidents table
     * and automatically updates local state to reflect database changes.
     */
    const channel = supabase
      .channel('incidents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          console.log('Incident change:', payload.eventType, payload);
          
          setIncidents((prev) => {
            // Handle new incident
            if (payload.eventType === 'INSERT') {
              return [payload.new as Incident, ...prev];
            }
            
            // Handle updated incident
            if (payload.eventType === 'UPDATE') {
              return prev.map((i) =>
                i.id === (payload.new as Incident).id ? (payload.new as Incident) : i
              );
            }
            
            // Handle deleted incident
            if (payload.eventType === 'DELETE') {
              return prev.filter((i) => i.id !== (payload.old as Incident).id);
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

  return { incidents, loading, error };
}
