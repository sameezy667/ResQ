/**
 * Zustand Store Integration with New Supabase Hooks
 * 
 * This file shows how to integrate the new useIncidents() and useUnits() hooks
 * with your existing Zustand store pattern.
 * 
 * TWO OPTIONS:
 * 1. Replace store data loading with hooks (RECOMMENDED - simpler)
 * 2. Keep store and sync with hooks (for complex state management)
 */

import { create } from 'zustand';
import { useEffect } from 'react';
import { useIncidents } from '@/hooks/useIncidents';
import { useUnits } from '@/hooks/useUnits';
import type { Incident, EmergencyUnit } from '@/types';

/* ============================================================================
   OPTION 1: Replace Store Loading with Hooks (RECOMMENDED)
   ============================================================================ */

/**
 * Use this in components that need incidents data:
 * 
 * Instead of:
 *   const { incidents, loadIncidents } = useResQStore();
 *   useEffect(() => { loadIncidents(); }, []);
 * 
 * Use:
 *   const { incidents, loading, error } = useIncidents();
 * 
 * Benefits:
 * - Automatic real-time sync
 * - No manual loading
 * - Cleaner code
 * - Less boilerplate
 */

function MyComponentWithHooks() {
  // Replace store calls with hooks
  const { incidents, loading, error } = useIncidents();
  const { units } = useUnits();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>Incidents: {incidents.length}</h2>
      <h2>Units: {units.length}</h2>
    </div>
  );
}

/* ============================================================================
   OPTION 2: Keep Store and Sync with Hooks
   ============================================================================ */

/**
 * If you have complex state management or need to keep the store for other reasons,
 * you can sync the hooks data into the store.
 */

interface StoreState {
  // Existing store state
  incidents: Incident[];
  units: EmergencyUnit[];
  setIncidents: (incidents: Incident[]) => void;
  setUnits: (units: EmergencyUnit[]) => void;
  
  // Other store state...
  isDarkMode: boolean;
  selectedIncidentId: string | null;
  // etc...
}

const useResQStore = create<StoreState>((set) => ({
  incidents: [],
  units: [],
  setIncidents: (incidents) => set({ incidents }),
  setUnits: (units) => set({ units }),
  
  // Other store actions...
  isDarkMode: false,
  selectedIncidentId: null,
}));

/**
 * Custom hook that syncs real-time data into the store
 * 
 * Use this at the top level of your app (in Dashboard or App component)
 */
function useSyncStoreWithSupabase() {
  const { incidents } = useIncidents();
  const { units } = useUnits();
  const { setIncidents, setUnits } = useResQStore();
  
  // Sync incidents from hook into store
  useEffect(() => {
    if (incidents.length > 0) {
      setIncidents(incidents);
    }
  }, [incidents, setIncidents]);
  
  // Sync units from hook into store
  useEffect(() => {
    if (units.length > 0) {
      setUnits(units);
    }
  }, [units, setUnits]);
}

/**
 * Usage in Dashboard component:
 */
function Dashboard() {
  // Sync real-time data into store
  useSyncStoreWithSupabase();
  
  // Now you can use store as normal
  const { incidents, units, selectedIncidentId } = useResQStore();
  
  return (
    <div>
      {/* Your UI */}
    </div>
  );
}

/* ============================================================================
   OPTION 3: Hybrid Approach (Most Flexible)
   ============================================================================ */

/**
 * Use hooks for data fetching, store for UI state only
 * 
 * This is the cleanest separation of concerns:
 * - Hooks manage server state (incidents, units)
 * - Store manages UI state (selected items, filters, dark mode)
 */

interface UIState {
  // UI state only (no server data)
  isDarkMode: boolean;
  selectedIncidentId: string | null;
  activeFilter: 'all' | 'fire' | 'medical' | 'accident';
  showHeatmap: boolean;
  isSidebarOpen: boolean;
  
  // UI actions
  toggleTheme: () => void;
  setSelectedIncident: (id: string | null) => void;
  setActiveFilter: (filter: 'all' | 'fire' | 'medical' | 'accident') => void;
  toggleHeatmap: () => void;
  toggleSidebar: () => void;
}

const useUIStore = create<UIState>((set) => ({
  isDarkMode: false,
  selectedIncidentId: null,
  activeFilter: 'all',
  showHeatmap: false,
  isSidebarOpen: false,
  
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setSelectedIncident: (id) => set({ selectedIncidentId: id }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

/**
 * Usage: Separate data from UI state
 */
function ResponderView() {
  // Data from hooks (server state)
  const { incidents, loading } = useIncidents();
  const { units } = useUnits();
  
  // UI state from store (client state)
  const {
    isDarkMode,
    selectedIncidentId,
    activeFilter,
    setSelectedIncident,
  } = useUIStore();
  
  // Filter incidents based on UI state
  const filteredIncidents = activeFilter === 'all'
    ? incidents
    : incidents.filter(i => i.type === activeFilter);
  
  return (
    <div>
      {/* Render UI */}
    </div>
  );
}

/* ============================================================================
   RECOMMENDATION
   ============================================================================ */

/**
 * For the ResQ app, I recommend OPTION 3 (Hybrid):
 * 
 * 1. Use useIncidents() and useUnits() hooks directly in components
 *    → Automatic real-time sync
 *    → No manual loading needed
 *    → Less code to maintain
 * 
 * 2. Keep Zustand store for UI state only:
 *    → Dark mode toggle
 *    → Selected incident
 *    → Active filters
 *    → Sidebar open/closed
 *    → Preview routes (temporary UI state)
 * 
 * 3. Remove from store (use hooks instead):
 *    ✗ loadIncidents()
 *    ✗ loadUnits()
 *    ✗ incidents array
 *    ✗ units array
 *    ✗ Real-time subscription management
 * 
 * This gives you:
 * ✓ Automatic real-time sync (from hooks)
 * ✓ Clean separation of concerns
 * ✓ Less boilerplate code
 * ✓ Better TypeScript types
 * ✓ Easier testing
 * 
 * See the existing store (useResQStore.ts) and gradually migrate to this pattern.
 */

/* ============================================================================
   MIGRATION GUIDE
   ============================================================================ */

/**
 * Step 1: Update Dashboard.tsx
 * 
 * Remove:
 *   const { loadIncidents, loadUnits } = useResQStore();
 *   useEffect(() => {
 *     loadIncidents();
 *     loadUnits();
 *   }, []);
 * 
 * Add:
 *   const { incidents, loading: incidentsLoading } = useIncidents();
 *   const { units, loading: unitsLoading } = useUnits();
 */

/**
 * Step 2: Update components that read incidents/units
 * 
 * Remove:
 *   const { incidents, units } = useResQStore();
 * 
 * Add:
 *   const { incidents } = useIncidents();
 *   const { units } = useUnits();
 */

/**
 * Step 3: Remove real-time subscription code from store
 * 
 * Delete:
 *   - subscriptions array
 *   - initializeRealtime()
 *   - cleanupRealtime()
 * 
 * Hooks handle this automatically!
 */

/**
 * Step 4: Update mutation operations
 * 
 * Keep addIncident/updateIncident actions in store if you need them
 * for optimistic updates, OR just rely on real-time hooks to update UI.
 * 
 * When you call reportIncident() or updateIncidentStatus(),
 * the hooks will automatically re-fetch and update the UI.
 */

export {
  useSyncStoreWithSupabase,
  useUIStore,
};
