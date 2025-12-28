/**
 * Real-time Subscriptions Hook
 * 
 * This hook initializes and manages Supabase real-time subscriptions
 * for the entire application. It should be used once at the app root level.
 * 
 * Features:
 * - Auto-connects on mount
 * - Auto-cleanup on unmount
 * - Reconnection on network issues
 * - Loading state management
 * 
 * @module hooks/useRealtimeSync
 */

import { useEffect } from 'react';
import { useResQStore } from '@/store/useResQStore';

/**
 * Initialize real-time synchronization with Supabase
 * Call this hook once at the app root (e.g., in App.tsx or Dashboard.tsx)
 */
export function useRealtimeSync() {
  const { 
    loadIncidents, 
    loadUnits, 
    loadDispatchRoutes,
    initializeRealtime,
    cleanupRealtime,
  } = useResQStore();

  useEffect(() => {
    // Initial data load
    const loadData = async () => {
      console.log('[ResQ] Loading initial data from Supabase...');
      try {
        const results = await Promise.allSettled([
          loadIncidents(),
          loadUnits(),
          loadDispatchRoutes(),
        ]);
        
        // Log detailed results
        results.forEach((result, index) => {
          const names = ['incidents', 'units', 'dispatch routes'];
          if (result.status === 'fulfilled') {
            console.log(`[ResQ] ✅ Loaded ${names[index]} successfully`);
          } else {
            console.error(`[ResQ] ❌ Failed to load ${names[index]}:`, result.reason);
          }
        });
        
        console.log('[ResQ] Initial data load complete');
      } catch (error) {
        console.error('[ResQ] Error loading initial data:', error);
      }
    };

    loadData();

    // Initialize real-time subscriptions
    try {
      console.log('[ResQ] Initializing real-time subscriptions...');
      initializeRealtime();
    } catch (error) {
      console.error('[ResQ] Error initializing real-time:', error);
    }

    // Cleanup on unmount
    return () => {
      console.log('[ResQ] Cleaning up real-time subscriptions...');
      cleanupRealtime();
    };
  }, []);

  return null;
}
