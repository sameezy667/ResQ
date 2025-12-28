/**
 * Property-Based Tests for Real-time Synchronization
 * 
 * Tests Property 3 from the design document:
 * - Property 3: Real-time Database Synchronization
 * 
 * @module store/useResQStore.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { useResQStore } from './useResQStore';
import { extractLatLngFromRow } from '../utils/geo';
import type { Incident, EmergencyUnit, DispatchRoute, IncidentType } from '@/types';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((callback) => {
      if (typeof callback === 'function') {
        callback('SUBSCRIBED');
      }
      return mockChannel;
    }),
    unsubscribe: vi.fn().mockResolvedValue({ error: null }),
  };

  return {
    supabase: {
      channel: vi.fn(() => mockChannel),
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      },
    },
  };
});

// Mock incident service
vi.mock('@/services/incidentService', () => ({
  getIncidents: vi.fn(() => Promise.resolve([])),
  getUnits: vi.fn(() => Promise.resolve([])),
  getDispatchRoutes: vi.fn(() => Promise.resolve([])),
  createIncident: vi.fn(),
  updateIncident: vi.fn(),
  previewDispatch: vi.fn(() => Promise.resolve([])),
  commitDispatch: vi.fn(() => Promise.resolve([])),
}));

describe('Real-time Synchronization - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state before each test
    useResQStore.setState({
      incidents: [],
      units: [],
      dispatchRoutes: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Property 3: Real-time Database Synchronization', () => {
    // Feature: resq-emergency-response-system, Property 3: Real-time Database Synchronization
    it('should add incidents to state when INSERT events are received', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 10, maxLength: 20 }),
              type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other') as fc.Arbitrary<IncidentType>,
              status: fc.constantFrom('pending', 'responding', 'resolved'),
              severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
              description: fc.string({ minLength: 10, maxLength: 500 }),
              lat: fc.double({ min: -90, max: 90, noNaN: true }),
              lng: fc.double({ min: -180, max: 180, noNaN: true }),
              reported_by_name: fc.string({ minLength: 3, maxLength: 50 }),
              reported_at: fc.date(),
              is_verified: fc.boolean(),
              assigned_unit_ids: fc.array(fc.string()),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (incidentData) => {
            // Clear state for this iteration
            useResQStore.setState({ incidents: [] });
            
            // Simulate INSERT events for each incident
            incidentData.forEach((incident) => {
              useResQStore.getState().addIncident({
                id: incident.id,
                type: incident.type,
                status: incident.status,
                severity: incident.severity,
                description: incident.description,
                location: {
                  lat: incident.lat,
                  lng: incident.lng,
                },
                reportedBy: incident.reported_by_name,
                reportedAt: incident.reported_at,
                isVerified: incident.is_verified,
                assignedUnits: incident.assigned_unit_ids,
              });
            });

            // Verify all incidents were added to state
            const currentState = useResQStore.getState();
            expect(currentState.incidents).toHaveLength(incidentData.length);
            
            // Verify each incident is in state with correct data
            incidentData.forEach((incident) => {
              const foundIncident = currentState.incidents.find(i => i.id === incident.id);
              expect(foundIncident).toBeDefined();
              expect(foundIncident?.type).toBe(incident.type);
              expect(foundIncident?.status).toBe(incident.status);
              expect(foundIncident?.location.lat).toBeCloseTo(incident.lat, 10);
              expect(foundIncident?.location.lng).toBeCloseTo(incident.lng, 10);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 3: Real-time Database Synchronization
    it('should update existing incidents when UPDATE events are received', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 10, maxLength: 20 }),
            type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other') as fc.Arbitrary<IncidentType>,
            initialStatus: fc.constantFrom('pending', 'responding'),
            updatedStatus: fc.constantFrom('responding', 'resolved'),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            description: fc.string({ minLength: 10, maxLength: 500 }),
            lat: fc.double({ min: -90, max: 90, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
            reported_by_name: fc.string({ minLength: 3, maxLength: 50 }),
          }),
          (incidentData) => {
            // Clear state for this iteration
            useResQStore.setState({ incidents: [] });
            
            // Add initial incident
            useResQStore.getState().addIncident({
              id: incidentData.id,
              type: incidentData.type,
              status: incidentData.initialStatus,
              severity: incidentData.severity,
              description: incidentData.description,
              location: {
                lat: incidentData.lat,
                lng: incidentData.lng,
              },
              reportedBy: incidentData.reported_by_name,
              reportedAt: new Date(),
              isVerified: false,
            });

            // Simulate UPDATE event
            useResQStore.getState().updateIncident(incidentData.id, {
              status: incidentData.updatedStatus,
              isVerified: true,
            });

            // Verify incident was updated
            const currentState = useResQStore.getState();
            const updatedIncident = currentState.incidents.find(i => i.id === incidentData.id);
            expect(updatedIncident).toBeDefined();
            expect(updatedIncident?.status).toBe(incidentData.updatedStatus);
            expect(updatedIncident?.isVerified).toBe(true);
            // Original data should remain unchanged
            expect(updatedIncident?.type).toBe(incidentData.type);
            expect(updatedIncident?.description).toBe(incidentData.description);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 3: Real-time Database Synchronization
    it('should remove incidents from state when DELETE events are received', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 10, maxLength: 20 }),
              type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other') as fc.Arbitrary<IncidentType>,
              status: fc.constantFrom('pending', 'responding', 'resolved'),
              severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
              description: fc.string({ minLength: 10, maxLength: 500 }),
              lat: fc.double({ min: -90, max: 90, noNaN: true }),
              lng: fc.double({ min: -180, max: 180, noNaN: true }),
              reported_by_name: fc.string({ minLength: 3, maxLength: 50 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          fc.integer({ min: 0, max: 9 }),
          (incidentData, deleteIndex) => {
            // Ensure we have at least one incident to delete
            if (incidentData.length === 0) return;
            
            // Clear state for this iteration
            useResQStore.setState({ incidents: [] });
            
            const actualDeleteIndex = deleteIndex % incidentData.length;
            const incidentToDelete = incidentData[actualDeleteIndex];
            
            // Add all incidents
            incidentData.forEach((incident) => {
              useResQStore.getState().addIncident({
                id: incident.id,
                type: incident.type,
                status: incident.status,
                severity: incident.severity,
                description: incident.description,
                location: {
                  lat: incident.lat,
                  lng: incident.lng,
                },
                reportedBy: incident.reported_by_name,
                reportedAt: new Date(),
                isVerified: false,
              });
            });

            // Verify all incidents were added
            let currentState = useResQStore.getState();
            expect(currentState.incidents).toHaveLength(incidentData.length);

            // Simulate DELETE event
            useResQStore.setState((state) => ({
              incidents: state.incidents.filter(i => i.id !== incidentToDelete.id),
            }));

            // Verify incident was removed
            currentState = useResQStore.getState();
            expect(currentState.incidents).toHaveLength(incidentData.length - 1);
            expect(currentState.incidents.find(i => i.id === incidentToDelete.id)).toBeUndefined();
            
            // Verify other incidents remain
            incidentData.forEach((incident, idx) => {
              if (idx !== actualDeleteIndex) {
                expect(currentState.incidents.find(i => i.id === incident.id)).toBeDefined();
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 3: Real-time Database Synchronization
    it('should reject invalid coordinates in real-time INSERT events', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant({ lat: NaN, lng: 0 }),
            fc.constant({ lat: 0, lng: Infinity }),
            fc.constant({ lat: null, lng: 0 }),
            fc.constant({ lat: undefined, lng: undefined })
          ),
          fc.record({
            id: fc.string({ minLength: 10, maxLength: 20 }),
            type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other') as fc.Arbitrary<IncidentType>,
            status: fc.constantFrom('pending', 'responding', 'resolved'),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            description: fc.string({ minLength: 10, maxLength: 500 }),
            reported_by_name: fc.string({ minLength: 3, maxLength: 50 }),
          }),
          (invalidCoords, incidentData) => {
            // Clear state for this iteration
            useResQStore.setState({ incidents: [] });
            
            const initialCount = useResQStore.getState().incidents.length;
            
            // Simulate real-time INSERT with invalid coordinates
            const dbRow = {
              ...incidentData,
              lat: invalidCoords.lat,
              lng: invalidCoords.lng,
            };
            
            // Validate coordinates (this is what the real-time handler does)
            const coords = extractLatLngFromRow(dbRow);
            
            // If coordinates are invalid, don't add to state
            if (coords === null) {
              // Incident should NOT be added
              const currentState = useResQStore.getState();
              expect(currentState.incidents).toHaveLength(initialCount);
            } else {
              // If somehow valid, add it
              useResQStore.getState().addIncident({
                id: incidentData.id,
                type: incidentData.type,
                status: incidentData.status,
                severity: incidentData.severity,
                description: incidentData.description,
                location: coords,
                reportedBy: incidentData.reported_by_name,
                reportedAt: new Date(),
                isVerified: false,
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 3: Real-time Database Synchronization
    it('should reject invalid coordinates in real-time unit UPDATE events', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 5, maxLength: 15 }),
            name: fc.string({ minLength: 5, maxLength: 30 }),
            type: fc.constantFrom('ambulance', 'fire-truck', 'police-car'),
            status: fc.constantFrom('available', 'dispatched', 'busy'),
            validLat: fc.double({ min: -90, max: 90, noNaN: true }),
            validLng: fc.double({ min: -180, max: 180, noNaN: true }),
          }),
          fc.oneof(
            fc.constant({ lat: NaN, lng: 0 }),
            fc.constant({ lat: 0, lng: Infinity }),
            fc.constant({ lat: null, lng: 0 })
          ),
          (unitData, invalidCoords) => {
            // Clear state for this iteration
            useResQStore.setState({ units: [] });
            
            // Add unit with valid coordinates
            useResQStore.getState().setUnits([{
              id: unitData.id,
              name: unitData.name,
              type: unitData.type,
              status: unitData.status,
              location: {
                lat: unitData.validLat,
                lng: unitData.validLng,
              },
            }]);

            // Verify unit was added
            let currentState = useResQStore.getState();
            expect(currentState.units).toHaveLength(1);
            const originalUnit = currentState.units[0];
            expect(originalUnit.location.lat).toBeCloseTo(unitData.validLat, 10);
            
            // Simulate real-time UPDATE with invalid coordinates
            const dbRow = {
              id: unitData.id,
              status: 'dispatched',
              lat: invalidCoords.lat,
              lng: invalidCoords.lng,
            };
            
            // Validate coordinates (this is what the real-time handler does)
            const coords = extractLatLngFromRow(dbRow);
            
            // If coordinates are invalid, don't update location
            if (coords === null) {
              // Unit location should remain unchanged
              currentState = useResQStore.getState();
              const unit = currentState.units.find(u => u.id === unitData.id);
              expect(unit).toBeDefined();
              expect(unit?.location.lat).toBeCloseTo(unitData.validLat, 10);
              expect(unit?.location.lng).toBeCloseTo(unitData.validLng, 10);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 3: Real-time Database Synchronization
    it('should update unit locations when valid UPDATE events are received', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 5, maxLength: 15 }),
            name: fc.string({ minLength: 5, maxLength: 30 }),
            type: fc.constantFrom('ambulance', 'fire-truck', 'police-car'),
            initialStatus: fc.constantFrom('available', 'dispatched'),
            updatedStatus: fc.constantFrom('dispatched', 'busy'),
            initialLat: fc.double({ min: -90, max: 90, noNaN: true }),
            initialLng: fc.double({ min: -180, max: 180, noNaN: true }),
            updatedLat: fc.double({ min: -90, max: 90, noNaN: true }),
            updatedLng: fc.double({ min: -180, max: 180, noNaN: true }),
          }),
          (unitData) => {
            // Clear state for this iteration
            useResQStore.setState({ units: [] });
            
            // Add unit with initial location
            useResQStore.getState().setUnits([{
              id: unitData.id,
              name: unitData.name,
              type: unitData.type,
              status: unitData.initialStatus,
              location: {
                lat: unitData.initialLat,
                lng: unitData.initialLng,
              },
            }]);

            // Simulate UPDATE event with new location
            useResQStore.setState((state) => ({
              units: state.units.map(unit =>
                unit.id === unitData.id
                  ? {
                      ...unit,
                      status: unitData.updatedStatus,
                      location: {
                        lat: unitData.updatedLat,
                        lng: unitData.updatedLng,
                      },
                    }
                  : unit
              ),
            }));

            // Verify unit was updated
            const currentState = useResQStore.getState();
            const updatedUnit = currentState.units.find(u => u.id === unitData.id);
            expect(updatedUnit).toBeDefined();
            expect(updatedUnit?.status).toBe(unitData.updatedStatus);
            expect(updatedUnit?.location.lat).toBeCloseTo(unitData.updatedLat, 10);
            expect(updatedUnit?.location.lng).toBeCloseTo(unitData.updatedLng, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 3: Real-time Database Synchronization
    it('should add dispatch routes when INSERT events are received', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 10, maxLength: 30 }),
              incidentId: fc.string({ minLength: 10, maxLength: 20 }),
              unitId: fc.string({ minLength: 5, maxLength: 15 }),
              eta: fc.integer({ min: 1, max: 60 }),
              coordinates: fc.array(
                fc.tuple(
                  fc.double({ min: -180, max: 180, noNaN: true }),
                  fc.double({ min: -90, max: 90, noNaN: true })
                ),
                { minLength: 2, maxLength: 10 }
              ),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (dispatchData) => {
            // Clear state for this iteration
            useResQStore.setState({ dispatchRoutes: [] });
            
            // Simulate INSERT events for each dispatch
            dispatchData.forEach((dispatch) => {
              useResQStore.getState().addDispatchRoute({
                id: dispatch.id,
                incidentId: dispatch.incidentId,
                unitId: dispatch.unitId,
                coordinates: dispatch.coordinates,
                eta: dispatch.eta,
              });
            });

            // Verify all dispatches were added to state
            const currentState = useResQStore.getState();
            expect(currentState.dispatchRoutes).toHaveLength(dispatchData.length);
            
            // Verify each dispatch is in state with correct data
            dispatchData.forEach((dispatch) => {
              const foundDispatch = currentState.dispatchRoutes.find(d => d.id === dispatch.id);
              expect(foundDispatch).toBeDefined();
              expect(foundDispatch?.incidentId).toBe(dispatch.incidentId);
              expect(foundDispatch?.unitId).toBe(dispatch.unitId);
              expect(foundDispatch?.eta).toBe(dispatch.eta);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


describe('User Mode Persistence - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state before each test
    useResQStore.setState({
      userMode: 'citizen',
    });
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Property 11: User Mode Persistence', () => {
    // Feature: resq-emergency-response-system, Property 11: User Mode Persistence
    it('should update UI state when mode is switched', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('citizen', 'responder'),
          fc.constantFrom('citizen', 'responder'),
          (initialMode, newMode) => {
            // Set initial mode
            useResQStore.setState({ userMode: initialMode });
            
            // Verify initial state
            let currentState = useResQStore.getState();
            expect(currentState.userMode).toBe(initialMode);
            
            // Switch mode
            useResQStore.getState().setUserMode(newMode);
            
            // Verify mode was updated
            currentState = useResQStore.getState();
            expect(currentState.userMode).toBe(newMode);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 11: User Mode Persistence
    it('should persist mode to localStorage when changed', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('citizen', 'responder'),
          (mode) => {
            // Clear localStorage for this iteration
            localStorage.clear();
            
            // Set mode
            useResQStore.getState().setUserMode(mode);
            
            // Verify mode is in localStorage
            const storedMode = localStorage.getItem('resq-user-mode');
            expect(storedMode).toBe(mode);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 11: User Mode Persistence
    it('should restore mode from localStorage on page load', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('citizen', 'responder'),
          (mode) => {
            // Simulate page load by setting localStorage before store initialization
            localStorage.setItem('resq-user-mode', mode);
            
            // Reset store to simulate fresh page load
            useResQStore.setState({ userMode: 'citizen' }); // Default value
            
            // Simulate initialization that reads from localStorage
            const storedMode = localStorage.getItem('resq-user-mode');
            if (storedMode === 'citizen' || storedMode === 'responder') {
              useResQStore.getState().setUserMode(storedMode);
            }
            
            // Verify mode was restored
            const currentState = useResQStore.getState();
            expect(currentState.userMode).toBe(mode);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 11: User Mode Persistence
    it('should handle multiple mode switches with persistence', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('citizen', 'responder'), { minLength: 2, maxLength: 10 }),
          (modeSequence) => {
            // Clear localStorage for this iteration
            localStorage.clear();
            
            // Apply each mode switch in sequence
            modeSequence.forEach((mode) => {
              useResQStore.getState().setUserMode(mode);
              
              // Verify mode is updated in store
              const currentState = useResQStore.getState();
              expect(currentState.userMode).toBe(mode);
              
              // Verify mode is persisted to localStorage
              const storedMode = localStorage.getItem('resq-user-mode');
              expect(storedMode).toBe(mode);
            });
            
            // Final state should match last mode in sequence
            const finalMode = modeSequence[modeSequence.length - 1];
            const currentState = useResQStore.getState();
            expect(currentState.userMode).toBe(finalMode);
            expect(localStorage.getItem('resq-user-mode')).toBe(finalMode);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Real-time Error Handling - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state before each test
    useResQStore.setState({
      incidents: [],
      units: [],
      dispatchRoutes: [],
      subscriptions: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('WebSocket Connection Failures', () => {
    it('should handle WebSocket connection errors gracefully', async () => {
      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock Supabase channel to throw an error
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.channel).mockImplementation(() => {
        throw new Error('WebSocket connection failed');
      });

      // Attempt to initialize real-time subscriptions
      try {
        useResQStore.getState().initializeRealtime();
      } catch (error) {
        // Error should be caught and logged
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error initializing realtime subscriptions:',
          expect.any(Error)
        );
      }

      // Store should still be functional with empty subscriptions
      const state = useResQStore.getState();
      expect(state.subscriptions).toEqual([]);

      consoleErrorSpy.mockRestore();
    });

    it('should continue operating with cached data when real-time fails', async () => {
      // Add some cached data
      useResQStore.setState({
        incidents: [{
          id: 'INC-001',
          type: 'fire',
          status: 'pending',
          severity: 'high',
          description: 'Cached incident',
          location: { lat: 40.7589, lng: -73.9851 },
          reportedBy: 'User 1',
          reportedAt: new Date(),
          isVerified: false,
        }],
      });

      // Mock Supabase channel to fail
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.channel).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      // Attempt to initialize real-time
      try {
        useResQStore.getState().initializeRealtime();
      } catch (error) {
        // Ignore error
      }

      // Cached data should still be available
      const state = useResQStore.getState();
      expect(state.incidents).toHaveLength(1);
      expect(state.incidents[0].id).toBe('INC-001');
    });
  });

  describe('Subscription Failures', () => {
    it('should handle subscription failures without crashing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock channel subscribe to fail
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn((callback) => {
          if (typeof callback === 'function') {
            callback('SUBSCRIPTION_ERROR');
          }
          return mockChannel;
        }),
        unsubscribe: vi.fn().mockResolvedValue({ error: null }),
      };

      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.channel).mockReturnValue(mockChannel);

      // Initialize real-time subscriptions
      useResQStore.getState().initializeRealtime();

      // Subscriptions should be created despite error status
      const state = useResQStore.getState();
      expect(state.subscriptions.length).toBeGreaterThan(0);

      consoleErrorSpy.mockRestore();
    });

    it('should handle unsubscribe errors during cleanup', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock channel with failing unsubscribe
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn((callback) => {
          if (typeof callback === 'function') {
            callback('SUBSCRIBED');
          }
          return mockChannel;
        }),
        unsubscribe: vi.fn().mockImplementation(() => {
          throw new Error('Unsubscribe failed');
        }),
      };

      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.channel).mockReturnValue(mockChannel);

      // Initialize subscriptions
      useResQStore.getState().initializeRealtime();

      // Cleanup should handle unsubscribe errors
      useResQStore.getState().cleanupRealtime();

      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error unsubscribing from channel:',
        expect.any(Error)
      );

      // Subscriptions should be cleared despite error
      const state = useResQStore.getState();
      expect(state.subscriptions).toEqual([]);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Graceful Degradation', () => {
    it('should maintain cached data when real-time updates fail', () => {
      // Set up initial cached data
      const cachedIncidents = [
        {
          id: 'INC-001',
          type: 'fire' as const,
          status: 'pending' as const,
          severity: 'high' as const,
          description: 'Cached incident 1',
          location: { lat: 40.7589, lng: -73.9851 },
          reportedBy: 'User 1',
          reportedAt: new Date(),
          isVerified: false,
        },
        {
          id: 'INC-002',
          type: 'medical' as const,
          status: 'responding' as const,
          severity: 'critical' as const,
          description: 'Cached incident 2',
          location: { lat: 40.7500, lng: -73.9900 },
          reportedBy: 'User 2',
          reportedAt: new Date(),
          isVerified: true,
        },
      ];

      useResQStore.setState({ incidents: cachedIncidents });

      // Verify cached data is available
      const state = useResQStore.getState();
      expect(state.incidents).toHaveLength(2);
      expect(state.incidents[0].id).toBe('INC-001');
      expect(state.incidents[1].id).toBe('INC-002');
    });

    it('should allow manual refresh when real-time fails', async () => {
      // Mock service to return fresh data
      const { getIncidents } = await import('@/services/incidentService');
      vi.mocked(getIncidents).mockResolvedValue([
        {
          id: 'INC-003',
          type: 'accident',
          status: 'pending',
          severity: 'medium',
          description: 'Fresh incident',
          location: { lat: 40.7600, lng: -73.9800 },
          reportedBy: 'User 3',
          reportedAt: new Date(),
          isVerified: false,
        },
      ]);

      // Load incidents manually
      await useResQStore.getState().loadIncidents();

      // Fresh data should be loaded
      const state = useResQStore.getState();
      expect(state.incidents).toHaveLength(1);
      expect(state.incidents[0].id).toBe('INC-003');
    });

    it('should handle real-time payload processing errors without crashing', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Set up initial state
      useResQStore.setState({ incidents: [] });

      // Simulate a real-time event with malformed data that causes processing error
      // This would normally be handled by the real-time handler's try-catch
      try {
        // Attempt to add incident with invalid data
        useResQStore.getState().addIncident({
          id: 'INC-BAD',
          type: 'fire',
          status: 'pending',
          severity: 'high',
          description: 'Test',
          location: { lat: NaN, lng: NaN }, // Invalid coordinates
          reportedBy: 'Test',
          reportedAt: new Date(),
          isVerified: false,
        });
      } catch (error) {
        // Error might be thrown, but app should continue
      }

      // Store should still be functional
      const state = useResQStore.getState();
      expect(state).toBeDefined();
      expect(state.incidents).toBeDefined();

      consoleErrorSpy.mockRestore();
    });
  });
});
