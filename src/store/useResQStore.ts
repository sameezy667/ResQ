/**
 * ResQ Global State Store (Zustand + Supabase Real-time)
 * 
 * This store manages the entire application state with real-time synchronization:
 * - Incidents, units, and dispatch routes synced with Supabase
 * - Real-time subscriptions for automatic updates
 * - Optimistic UI updates for better UX
 * - Automatic conflict resolution
 * 
 * @module store/useResQStore
 */

import { create } from 'zustand';
import { Incident, EmergencyUnit, DispatchRoute, UserMode } from '@/types';
import {
  getIncidents,
  getUnits,
  getDispatchRoutes,
  createIncident as createIncidentService,
  updateIncident as updateIncidentService,
  previewDispatch,
  commitDispatch,
} from '@/services/incidentService';
import { supabase } from '@/lib/supabase';
import { extractLatLngFromRow, isFiniteLatLng } from '@/utils/geo';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ResQState {
  // Theme
  isDarkMode: boolean;
  toggleTheme: () => void;

  // User Mode
  userMode: UserMode;
  setUserMode: (mode: UserMode) => void;

  // Mobile UI State
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Incidents
  incidents: Incident[];
  setIncidents: (incidents: Incident[]) => void;
  addIncident: (incident: Incident) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  loadIncidents: () => Promise<void>;
  
  // Units
  units: EmergencyUnit[];
  setUnits: (units: EmergencyUnit[] | ((prev: EmergencyUnit[]) => EmergencyUnit[])) => void;
  loadUnits: () => Promise<void>;
  
  // Dispatch Routes
  dispatchRoutes: DispatchRoute[];
  addDispatchRoute: (route: DispatchRoute) => void;
  clearDispatchRoute: (incidentId: string) => void;
  loadDispatchRoutes: () => Promise<void>;
  
  // Active dispatch preview (for showing connections before confirm)
  selectedUnitsForDispatch: string[];
  setSelectedUnitsForDispatch: (unitIds: string[]) => void;
  clearSelectedUnitsForDispatch: () => void;
  previewRoutes: DispatchRoute[];
  setPreviewRoutes: (routes: DispatchRoute[]) => void;
  
  // Dispatch operations
  performPreviewDispatch: (incidentId: string, unitIds: string[]) => Promise<void>;
  performCommitDispatch: (incidentId: string, unitIds: string[]) => Promise<void>;

  // Real-time subscriptions
  subscriptions: RealtimeChannel[];
  initializeRealtime: () => void;
  cleanupRealtime: () => void;

  // Filters
  activeFilter: 'all' | 'fire' | 'medical' | 'accident' | 'crime';
  setActiveFilter: (filter: 'all' | 'fire' | 'medical' | 'accident' | 'crime') => void;

  // Selected Incident
  selectedIncidentId: string | null;
  setSelectedIncident: (id: string | null) => void;

  // Heatmap Toggle
  showHeatmap: boolean;
  toggleHeatmap: () => void;
  
  // Loading states
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useResQStore = create<ResQState>((set, get) => ({
  // Theme - Initialize from localStorage
  isDarkMode: typeof window !== 'undefined' && localStorage.getItem('resq-theme') === 'dark',
  toggleTheme: () => {
    set((state) => {
      const newMode = !state.isDarkMode;
      // Update DOM
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('resq-theme', newMode ? 'dark' : 'light');
      }
      return { isDarkMode: newMode };
    });
  },

  // User Mode
  userMode: (typeof window !== 'undefined' && localStorage.getItem('resq-user-mode') === 'responder') ? 'responder' : 'citizen',
  setUserMode: (mode) => {
    set({ userMode: mode });
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('resq-user-mode', mode);
    }
  },

  // Mobile UI State - sidebar closed by default on mobile
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  // Incidents
  incidents: [],
  setIncidents: (incidents) => set({ incidents }),
  addIncident: (incident) => set((state) => ({ 
    incidents: [incident, ...state.incidents] 
  })),
  updateIncident: (id, updates) => set((state) => ({
    incidents: state.incidents.map((incident) =>
      incident.id === id ? { ...incident, ...updates } : incident
    ),
  })),
  loadIncidents: async () => {
    try {
      console.log('[Store] Loading incidents from database...');
      set({ isLoading: true });
      const incidents = await getIncidents();
      console.log(`[Store] Loaded ${incidents.length} incidents:`, incidents);
      set({ incidents, isLoading: false });
    } catch (error) {
      console.error('[Store] Failed to load incidents:', error);
      // Don't throw - just set empty array and stop loading
      set({ incidents: [], isLoading: false });
    }
  },

  // Units
  units: [],
  setUnits: (units) => set((state) => {
    const unitsToSet = typeof units === 'function' ? units(state.units) : units;
    // Filter out units with invalid coordinates to prevent Leaflet errors
    const validUnits = unitsToSet.filter(unit => 
      unit.location && 
      typeof unit.location.lat === 'number' && 
      typeof unit.location.lng === 'number' &&
      !isNaN(unit.location.lat) &&
      !isNaN(unit.location.lng)
    );
    if (validUnits.length < unitsToSet.length) {
      console.warn(`[Store] Filtered out ${unitsToSet.length - validUnits.length} units with invalid coordinates`);
    }
    return { units: validUnits };
  }),
  loadUnits: async () => {
    try {
      const units = await getUnits();
      set({ units });
    } catch (error) {
      console.error('Failed to load units:', error);
      set({ units: [] });
    }
  },

  // Dispatch Routes
  dispatchRoutes: [],
  addDispatchRoute: (route) => set((state) => ({
    dispatchRoutes: [...state.dispatchRoutes, route],
  })),
  clearDispatchRoute: (incidentId) => set((state) => ({
    dispatchRoutes: state.dispatchRoutes.filter((r) => r.incidentId !== incidentId),
  })),
  loadDispatchRoutes: async () => {
    try {
      const routes = await getDispatchRoutes();
      set({ dispatchRoutes: routes });
    } catch (error) {
      console.error('Failed to load dispatch routes:', error);
      // Set empty array on error so app doesn't crash
      set({ dispatchRoutes: [] });
    }
  },
  
  // Active dispatch preview
  selectedUnitsForDispatch: [],
  setSelectedUnitsForDispatch: (unitIds) => set({ selectedUnitsForDispatch: unitIds }),
  clearSelectedUnitsForDispatch: () => set({ selectedUnitsForDispatch: [], previewRoutes: [] }),
  previewRoutes: [],
  setPreviewRoutes: (routes) => set({ previewRoutes: routes }),
  
  // Dispatch operations
  performPreviewDispatch: async (incidentId, unitIds) => {
    try {
      const routes = await previewDispatch(incidentId, unitIds);
      set({ previewRoutes: routes, selectedUnitsForDispatch: unitIds });
    } catch (error) {
      console.error('Failed to preview dispatch:', error);
    }
  },
  performCommitDispatch: async (incidentId, unitIds) => {
    try {
      set({ isLoading: true });
      const routes = await commitDispatch(incidentId, unitIds);
      
      // Add routes to state
      set((state) => ({
        dispatchRoutes: [...state.dispatchRoutes, ...routes],
        previewRoutes: [],
        selectedUnitsForDispatch: [],
        isLoading: false,
      }));
      
      // Update incident status to responding
      get().updateIncident(incidentId, { 
        status: 'responding',
        assignedUnits: unitIds,
      });
      
      // Update unit statuses to dispatched
      set((state) => ({
        units: state.units.map((unit) =>
          unitIds.includes(unit.id) ? { ...unit, status: 'dispatched' as const } : unit
        ),
      }));
    } catch (error) {
      console.error('Failed to commit dispatch:', error);
      set({ isLoading: false });
    }
  },

  // Real-time subscriptions
  subscriptions: [],
  initializeRealtime: () => {
    try {
      const { subscriptions } = get();
      
      // Clean up existing subscriptions
      subscriptions.forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (err) {
          console.error('Error unsubscribing:', err);
        }
      });
      
      // Subscribe to incidents table
      const incidentsChannel = supabase
        .channel('incidents_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'incidents' },
          (payload) => {
            console.log('Incident change:', payload);
            
            try {
              if (payload.eventType === 'INSERT') {
                // Add new incident to state
                const newIncident = payload.new as any;
                
                // Validate coordinates before adding
                const coords = extractLatLngFromRow(newIncident);
                if (!coords) {
                  console.warn('[Realtime] Dropped incident INSERT with invalid coordinates:', newIncident);
                  return;
                }
                
                get().addIncident({
                  id: newIncident.id,
                  type: newIncident.type,
                  status: newIncident.status,
                  severity: newIncident.severity,
                  description: newIncident.description,
                  location: {
                    lat: coords.lat,
                    lng: coords.lng,
                    address: newIncident.address || '',
                  },
                  reportedBy: newIncident.reported_by_name || 'Anonymous',
                  reportedAt: new Date(newIncident.reported_at || newIncident.created_at),
                  isVerified: newIncident.is_verified,
                  assignedUnits: newIncident.assigned_unit_ids,
                });
              } else if (payload.eventType === 'UPDATE') {
                // Update existing incident
                const updated = payload.new as any;
                
                // Validate coordinates even though we don't update them
                // This is defensive programming to catch data quality issues
                const coords = extractLatLngFromRow(updated);
                if (!coords) {
                  console.warn('[Realtime] Dropped incident UPDATE with invalid coordinates:', updated);
                  return;
                }
                
                get().updateIncident(updated.id, {
                  status: updated.status,
                  severity: updated.severity,
                  isVerified: updated.is_verified,
                  assignedUnits: updated.assigned_unit_ids,
                });
              } else if (payload.eventType === 'DELETE') {
                // Remove deleted incident
                const deleted = payload.old as any;
                set((state) => ({
                  incidents: state.incidents.filter(i => i.id !== deleted.id),
                }));
              }
            } catch (err) {
              console.error('Error processing incident change:', err);
            }
          }
        )
        .subscribe((status) => {
          console.log('Incidents channel status:', status);
        });
      
      // Subscribe to units table
      const unitsChannel = supabase
        .channel('units_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'units' },
          (payload) => {
            console.log('Unit change:', payload);
            
            try {
              if (payload.eventType === 'UPDATE') {
                const updated = payload.new as any;
                
                // Extract and validate coordinates using robust geo utility
                const coords = extractLatLngFromRow(updated);
                if (!coords) {
                  console.warn('[Realtime] Dropped unit UPDATE with invalid coordinates:', updated);
                  return;
                }
                
                // Update unit in store with validated coordinates
                set((state) => ({
                  units: state.units.map(unit =>
                    unit.id === String(updated.id)
                      ? {
                          ...unit,
                          status: updated.status || (updated.is_available === true ? 'available' : 'dispatched'),
                          location: coords,
                        }
                      : unit
                  ),
                }));
              }
            } catch (err) {
              console.error('Error processing unit change:', err);
            }
          }
        )
        .subscribe((status) => {
          console.log('Units channel status:', status);
        });
      
      // Subscribe to dispatches table
      const dispatchesChannel = supabase
        .channel('dispatches_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'dispatches' },
          (payload) => {
            console.log('Dispatch change:', payload);
            
            try {
              if (payload.eventType === 'INSERT') {
                const newDispatch = payload.new as any;
                get().addDispatchRoute({
                  id: newDispatch.id,
                  incidentId: newDispatch.incident_id,
                  unitId: newDispatch.unit_id,
                  coordinates: newDispatch.route_geojson?.coordinates || [],
                  eta: newDispatch.eta_minutes,
                });
              }
            } catch (err) {
              console.error('Error processing dispatch change:', err);
            }
          }
        )
        .subscribe((status) => {
          console.log('Dispatches channel status:', status);
        });
      
      set({ subscriptions: [incidentsChannel, unitsChannel, dispatchesChannel] });
    } catch (error) {
      console.error('Error initializing realtime subscriptions:', error);
      set({ subscriptions: [] });
    }
  },
  cleanupRealtime: () => {
    try {
      const { subscriptions } = get();
      subscriptions.forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (err) {
          console.error('Error unsubscribing from channel:', err);
        }
      });
      set({ subscriptions: [] });
    } catch (error) {
      console.error('Error cleaning up realtime subscriptions:', error);
    }
  },

  // Filters
  activeFilter: 'all',
  setActiveFilter: (filter) => set({ activeFilter: filter }),

  // Selected Incident
  selectedIncidentId: null,
  setSelectedIncident: (id) => set({ selectedIncidentId: id }),

  // Heatmap
  showHeatmap: false,
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
  
  // Loading
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}));
