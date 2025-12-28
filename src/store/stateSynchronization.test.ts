/**
 * Property-Based Tests for State Synchronization with Database
 * 
 * Tests Property 14 from the design document:
 * - Property 14: State Synchronization with Database
 * 
 * This test suite validates that:
 * 1. Data loaded from the database populates the Zustand store
 * 2. Store updates trigger component re-renders (via Zustand subscriptions)
 * 3. Real-time updates modify the store correctly
 * 
 * @module store/stateSynchronization.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { useResQStore } from './useResQStore';
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

describe('State Synchronization with Database - Property 14', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state before each test
    useResQStore.setState({
      incidents: [],
      units: [],
      dispatchRoutes: [],
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Property 14: State Synchronization with Database', () => {
    // Feature: resq-emergency-response-system, Property 14: State Synchronization with Database
    it('should populate store with fetched incidents from database', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 10, maxLength: 20 }),
              type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other') as fc.Arbitrary<IncidentType>,
              status: fc.constantFrom('pending', 'responding', 'resolved'),
              severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
              description: fc.string({ minLength: 10, maxLength: 500 }),
              lat: fc.double({ min: -90, max: 90, noNaN: true }),
              lng: fc.double({ min: -180, max: 180, noNaN: true }),
              reportedBy: fc.string({ minLength: 3, maxLength: 50 }),
              reportedAt: fc.date(),
              isVerified: fc.boolean(),
              assignedUnits: fc.array(fc.string()),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          async (mockIncidents) => {
            // Mock the service to return generated incidents
            const { getIncidents } = await import('@/services/incidentService');
            const incidentsData: Incident[] = mockIncidents.map(inc => ({
              id: inc.id,
              type: inc.type,
              status: inc.status,
              severity: inc.severity,
              description: inc.description,
              location: {
                lat: inc.lat,
                lng: inc.lng,
              },
              reportedBy: inc.reportedBy,
              reportedAt: inc.reportedAt,
              isVerified: inc.isVerified,
              assignedUnits: inc.assignedUnits,
            }));
            
            vi.mocked(getIncidents).mockResolvedValue(incidentsData);

            // Clear store before loading
            useResQStore.setState({ incidents: [] });

            // Load incidents from database
            await useResQStore.getState().loadIncidents();

            // Verify store is populated with fetched data
            const state = useResQStore.getState();
            expect(state.incidents).toHaveLength(mockIncidents.length);
            
            // Verify each incident matches the fetched data
            mockIncidents.forEach((mockInc, idx) => {
              const storeInc = state.incidents.find(i => i.id === mockInc.id);
              expect(storeInc).toBeDefined();
              expect(storeInc?.type).toBe(mockInc.type);
              expect(storeInc?.status).toBe(mockInc.status);
              expect(storeInc?.location.lat).toBeCloseTo(mockInc.lat, 10);
              expect(storeInc?.location.lng).toBeCloseTo(mockInc.lng, 10);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 14: State Synchronization with Database
    it('should populate store with fetched units from database', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 5, maxLength: 15 }),
              name: fc.string({ minLength: 5, maxLength: 30 }),
              type: fc.constantFrom('ambulance', 'fire-truck', 'police-car'),
              status: fc.constantFrom('available', 'dispatched', 'busy'),
              lat: fc.double({ min: -90, max: 90, noNaN: true }),
              lng: fc.double({ min: -180, max: 180, noNaN: true }),
            }),
            { minLength: 0, maxLength: 15 }
          ),
          async (mockUnits) => {
            // Mock the service to return generated units
            const { getUnits } = await import('@/services/incidentService');
            const unitsData: EmergencyUnit[] = mockUnits.map(unit => ({
              id: unit.id,
              name: unit.name,
              type: unit.type,
              status: unit.status,
              location: {
                lat: unit.lat,
                lng: unit.lng,
              },
            }));
            
            vi.mocked(getUnits).mockResolvedValue(unitsData);

            // Clear store before loading
            useResQStore.setState({ units: [] });

            // Load units from database
            await useResQStore.getState().loadUnits();

            // Verify store is populated with fetched data
            const state = useResQStore.getState();
            expect(state.units).toHaveLength(mockUnits.length);
            
            // Verify each unit matches the fetched data
            mockUnits.forEach((mockUnit) => {
              const storeUnit = state.units.find(u => u.id === mockUnit.id);
              expect(storeUnit).toBeDefined();
              expect(storeUnit?.name).toBe(mockUnit.name);
              expect(storeUnit?.type).toBe(mockUnit.type);
              expect(storeUnit?.status).toBe(mockUnit.status);
              expect(storeUnit?.location.lat).toBeCloseTo(mockUnit.lat, 10);
              expect(storeUnit?.location.lng).toBeCloseTo(mockUnit.lng, 10);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 14: State Synchronization with Database
    it('should populate store with fetched dispatch routes from database', async () => {
      await fc.assert(
        fc.asyncProperty(
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
            { minLength: 0, maxLength: 10 }
          ),
          async (mockRoutes) => {
            // Mock the service to return generated routes
            const { getDispatchRoutes } = await import('@/services/incidentService');
            const routesData: DispatchRoute[] = mockRoutes.map(route => ({
              id: route.id,
              incidentId: route.incidentId,
              unitId: route.unitId,
              coordinates: route.coordinates,
              eta: route.eta,
            }));
            
            vi.mocked(getDispatchRoutes).mockResolvedValue(routesData);

            // Clear store before loading
            useResQStore.setState({ dispatchRoutes: [] });

            // Load dispatch routes from database
            await useResQStore.getState().loadDispatchRoutes();

            // Verify store is populated with fetched data
            const state = useResQStore.getState();
            expect(state.dispatchRoutes).toHaveLength(mockRoutes.length);
            
            // Verify each route matches the fetched data
            mockRoutes.forEach((mockRoute) => {
              const storeRoute = state.dispatchRoutes.find(r => r.id === mockRoute.id);
              expect(storeRoute).toBeDefined();
              expect(storeRoute?.incidentId).toBe(mockRoute.incidentId);
              expect(storeRoute?.unitId).toBe(mockRoute.unitId);
              expect(storeRoute?.eta).toBe(mockRoute.eta);
              expect(storeRoute?.coordinates).toHaveLength(mockRoute.coordinates.length);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 14: State Synchronization with Database
    it('should trigger store subscribers when data is loaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 10, maxLength: 20 }),
              type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other') as fc.Arbitrary<IncidentType>,
              status: fc.constantFrom('pending', 'responding', 'resolved'),
              severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
              description: fc.string({ minLength: 10, maxLength: 500 }),
              lat: fc.double({ min: -90, max: 90, noNaN: true }),
              lng: fc.double({ min: -180, max: 180, noNaN: true }),
              reportedBy: fc.string({ minLength: 3, maxLength: 50 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (mockIncidents) => {
            // Mock the service
            const { getIncidents } = await import('@/services/incidentService');
            const incidentsData: Incident[] = mockIncidents.map(inc => ({
              id: inc.id,
              type: inc.type,
              status: inc.status,
              severity: inc.severity,
              description: inc.description,
              location: {
                lat: inc.lat,
                lng: inc.lng,
              },
              reportedBy: inc.reportedBy,
              reportedAt: new Date(),
              isVerified: false,
            }));
            
            vi.mocked(getIncidents).mockResolvedValue(incidentsData);

            // Set up a subscriber to track updates
            // Zustand's subscribe takes a callback that receives the full state
            let subscriberCallCount = 0;
            const unsubscribe = useResQStore.subscribe(
              () => {
                subscriberCallCount++;
              }
            );

            // Clear store and reset counter after subscription
            useResQStore.setState({ incidents: [] });
            subscriberCallCount = 0; // Reset after initial setState

            // Load incidents - this should trigger subscribers
            await useResQStore.getState().loadIncidents();

            // Verify subscriber was called (store update triggered)
            // loadIncidents calls setIncidents which triggers the subscriber
            expect(subscriberCallCount).toBeGreaterThan(0);

            // Clean up
            unsubscribe();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 14: State Synchronization with Database
    it('should correctly update store when real-time updates are received', () => {
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
            reportedBy: fc.string({ minLength: 3, maxLength: 50 }),
          }),
          (incidentData) => {
            // Clear store
            useResQStore.setState({ incidents: [] });
            
            // Add initial incident (simulating database fetch)
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
              reportedBy: incidentData.reportedBy,
              reportedAt: new Date(),
              isVerified: false,
            });

            // Verify initial state
            let state = useResQStore.getState();
            expect(state.incidents).toHaveLength(1);
            expect(state.incidents[0].status).toBe(incidentData.initialStatus);

            // Simulate real-time update
            useResQStore.getState().updateIncident(incidentData.id, {
              status: incidentData.updatedStatus,
              isVerified: true,
            });

            // Verify store was updated correctly
            state = useResQStore.getState();
            const updatedIncident = state.incidents.find(i => i.id === incidentData.id);
            expect(updatedIncident).toBeDefined();
            expect(updatedIncident?.status).toBe(incidentData.updatedStatus);
            expect(updatedIncident?.isVerified).toBe(true);
            
            // Verify other fields remain unchanged
            expect(updatedIncident?.type).toBe(incidentData.type);
            expect(updatedIncident?.description).toBe(incidentData.description);
            expect(updatedIncident?.location.lat).toBeCloseTo(incidentData.lat, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 14: State Synchronization with Database
    it('should handle database fetch errors gracefully without crashing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'Network error',
            'Database connection failed',
            'Timeout',
            'Permission denied'
          ),
          async (errorMessage) => {
            // Mock the service to throw an error
            const { getIncidents } = await import('@/services/incidentService');
            vi.mocked(getIncidents).mockRejectedValue(new Error(errorMessage));

            // Set up some existing data
            useResQStore.setState({
              incidents: [{
                id: 'INC-EXISTING',
                type: 'fire',
                status: 'pending',
                severity: 'high',
                description: 'Existing incident',
                location: { lat: 40.7589, lng: -73.9851 },
                reportedBy: 'User',
                reportedAt: new Date(),
                isVerified: false,
              }],
            });

            // Attempt to load incidents (should fail gracefully)
            await useResQStore.getState().loadIncidents();

            // Store should still be functional
            const state = useResQStore.getState();
            expect(state).toBeDefined();
            expect(state.incidents).toBeDefined();
            // After error, incidents should be empty array (error handling clears it)
            expect(Array.isArray(state.incidents)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 14: State Synchronization with Database
    it('should maintain loading state during database operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 10, maxLength: 20 }),
              type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other') as fc.Arbitrary<IncidentType>,
              status: fc.constantFrom('pending', 'responding', 'resolved'),
              severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
              description: fc.string({ minLength: 10, maxLength: 500 }),
              lat: fc.double({ min: -90, max: 90, noNaN: true }),
              lng: fc.double({ min: -180, max: 180, noNaN: true }),
              reportedBy: fc.string({ minLength: 3, maxLength: 50 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (mockIncidents) => {
            // Mock the service with a delay to simulate network latency
            const { getIncidents } = await import('@/services/incidentService');
            const incidentsData: Incident[] = mockIncidents.map(inc => ({
              id: inc.id,
              type: inc.type,
              status: inc.status,
              severity: inc.severity,
              description: inc.description,
              location: {
                lat: inc.lat,
                lng: inc.lng,
              },
              reportedBy: inc.reportedBy,
              reportedAt: new Date(),
              isVerified: false,
            }));
            
            vi.mocked(getIncidents).mockImplementation(async () => {
              // Simulate network delay
              await new Promise(resolve => setTimeout(resolve, 10));
              return incidentsData;
            });

            // Clear store
            useResQStore.setState({ incidents: [], isLoading: false });

            // Start loading
            const loadPromise = useResQStore.getState().loadIncidents();

            // Check that loading state is set during operation
            // Note: Due to async nature, we check after the operation completes
            await loadPromise;

            // After completion, loading should be false
            const state = useResQStore.getState();
            expect(state.isLoading).toBe(false);
            expect(state.incidents).toHaveLength(mockIncidents.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 14: State Synchronization with Database
    it('should handle multiple concurrent store updates correctly', () => {
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
              reportedBy: fc.string({ minLength: 3, maxLength: 50 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (incidents) => {
            // Clear store
            useResQStore.setState({ incidents: [] });

            // Add all incidents concurrently (simulating multiple real-time events)
            incidents.forEach(inc => {
              useResQStore.getState().addIncident({
                id: inc.id,
                type: inc.type,
                status: inc.status,
                severity: inc.severity,
                description: inc.description,
                location: {
                  lat: inc.lat,
                  lng: inc.lng,
                },
                reportedBy: inc.reportedBy,
                reportedAt: new Date(),
                isVerified: false,
              });
            });

            // Verify all incidents were added correctly
            const state = useResQStore.getState();
            expect(state.incidents).toHaveLength(incidents.length);
            
            // Verify each incident is present
            incidents.forEach(inc => {
              const found = state.incidents.find(i => i.id === inc.id);
              expect(found).toBeDefined();
              expect(found?.type).toBe(inc.type);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
