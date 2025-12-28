/**
 * Property-Based Tests for Incident Filtering and Selection
 * 
 * Tests Properties 9 and 10 from the design document:
 * - Property 9: Incident Filtering by Type
 * - Property 10: Incident Selection and Detail Display
 * 
 * @module store/incidentFiltering.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { useResQStore } from './useResQStore';
import type { Incident, IncidentType } from '@/types';

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

describe('Incident Filtering and Selection - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state before each test
    useResQStore.setState({
      incidents: [],
      activeFilter: 'all',
      selectedIncidentId: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Property 9: Incident Filtering by Type', () => {
    // Feature: resq-emergency-response-system, Property 9: Incident Filtering by Type
    it('should filter incidents to only matching type when specific filter is selected', () => {
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
            { minLength: 5, maxLength: 20 }
          ),
          fc.constantFrom('fire', 'medical', 'accident', 'crime') as fc.Arbitrary<'fire' | 'medical' | 'accident' | 'crime'>,
          (incidentData, filterType) => {
            // Clear state for this iteration
            useResQStore.setState({ incidents: [], activeFilter: 'all' });
            
            // Add all incidents to state
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

            // Set filter to specific type
            useResQStore.getState().setActiveFilter(filterType);

            // Get filtered incidents (simulating what the UI does)
            const state = useResQStore.getState();
            const filteredIncidents = state.activeFilter === 'all' 
              ? state.incidents 
              : state.incidents.filter(i => i.type === state.activeFilter);

            // Verify all filtered incidents match the selected type
            filteredIncidents.forEach((incident) => {
              expect(incident.type).toBe(filterType);
            });

            // Verify count matches expected
            const expectedCount = incidentData.filter(i => i.type === filterType).length;
            expect(filteredIncidents).toHaveLength(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 9: Incident Filtering by Type
    it('should return all incidents when "all" filter is selected', () => {
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
            { minLength: 1, maxLength: 20 }
          ),
          (incidentData) => {
            // Clear state for this iteration
            useResQStore.setState({ incidents: [], activeFilter: 'all' });
            
            // Add all incidents to state
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

            // Set filter to 'all'
            useResQStore.getState().setActiveFilter('all');

            // Get filtered incidents
            const state = useResQStore.getState();
            const filteredIncidents = state.activeFilter === 'all' 
              ? state.incidents 
              : state.incidents.filter(i => i.type === state.activeFilter);

            // Verify all incidents are returned
            expect(filteredIncidents).toHaveLength(incidentData.length);
            
            // Verify all incident IDs are present
            incidentData.forEach((incident) => {
              expect(filteredIncidents.find(i => i.id === incident.id)).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 9: Incident Filtering by Type
    it('should work correctly with empty incident list', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('all', 'fire', 'medical', 'accident', 'crime') as fc.Arbitrary<'all' | 'fire' | 'medical' | 'accident' | 'crime'>,
          (filterType) => {
            // Clear state for this iteration
            useResQStore.setState({ incidents: [], activeFilter: 'all' });

            // Set filter
            useResQStore.getState().setActiveFilter(filterType);

            // Get filtered incidents
            const state = useResQStore.getState();
            const filteredIncidents = state.activeFilter === 'all' 
              ? state.incidents 
              : state.incidents.filter(i => i.type === state.activeFilter);

            // Verify empty array is returned
            expect(filteredIncidents).toHaveLength(0);
            expect(Array.isArray(filteredIncidents)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 9: Incident Filtering by Type
    it('should maintain filter state across incident additions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('fire', 'medical', 'accident', 'crime') as fc.Arbitrary<'fire' | 'medical' | 'accident' | 'crime'>,
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
            { minLength: 1, maxLength: 10 }
          ),
          (filterType, incidentData) => {
            // Clear state for this iteration
            useResQStore.setState({ incidents: [], activeFilter: 'all' });
            
            // Set filter first
            useResQStore.getState().setActiveFilter(filterType);

            // Add incidents one by one
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

            // Verify filter state is maintained
            const state = useResQStore.getState();
            expect(state.activeFilter).toBe(filterType);

            // Verify filtering still works correctly
            const filteredIncidents = state.activeFilter === 'all' 
              ? state.incidents 
              : state.incidents.filter(i => i.type === state.activeFilter);

            filteredIncidents.forEach((incident) => {
              expect(incident.type).toBe(filterType);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Incident Selection and Detail Display', () => {
    // Feature: resq-emergency-response-system, Property 10: Incident Selection and Detail Display
    it('should update selected incident ID when incident is selected', () => {
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
            { minLength: 1, maxLength: 20 }
          ),
          fc.integer({ min: 0, max: 19 }),
          (incidentData, selectIndex) => {
            // Ensure we have at least one incident
            if (incidentData.length === 0) return;
            
            // Clear state for this iteration
            useResQStore.setState({ incidents: [], selectedIncidentId: null });
            
            // Add all incidents to state
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

            // Select an incident
            const actualSelectIndex = selectIndex % incidentData.length;
            const incidentToSelect = incidentData[actualSelectIndex];
            useResQStore.getState().setSelectedIncident(incidentToSelect.id);

            // Verify selected incident ID is updated
            const state = useResQStore.getState();
            expect(state.selectedIncidentId).toBe(incidentToSelect.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 10: Incident Selection and Detail Display
    it('should allow deselection by setting selected incident to null', () => {
      fc.assert(
        fc.property(
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
          (incidentData) => {
            // Clear state for this iteration
            useResQStore.setState({ incidents: [], selectedIncidentId: null });
            
            // Add incident to state
            useResQStore.getState().addIncident({
              id: incidentData.id,
              type: incidentData.type,
              status: incidentData.status,
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

            // Select the incident
            useResQStore.getState().setSelectedIncident(incidentData.id);
            expect(useResQStore.getState().selectedIncidentId).toBe(incidentData.id);

            // Deselect the incident
            useResQStore.getState().setSelectedIncident(null);

            // Verify selected incident ID is null
            const state = useResQStore.getState();
            expect(state.selectedIncidentId).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 10: Incident Selection and Detail Display
    it('should provide all required information for selected incident', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 10, maxLength: 20 }),
            type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other') as fc.Arbitrary<IncidentType>,
            status: fc.constantFrom('pending', 'responding', 'resolved'),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            description: fc.string({ minLength: 10, maxLength: 500 }),
            lat: fc.double({ min: -90, max: 90, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
            address: fc.string({ minLength: 10, maxLength: 100 }),
            reported_by_name: fc.string({ minLength: 3, maxLength: 50 }),
            assigned_unit_ids: fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
          }),
          (incidentData) => {
            // Clear state for this iteration
            useResQStore.setState({ incidents: [], selectedIncidentId: null });
            
            // Add incident to state
            const reportedAt = new Date();
            useResQStore.getState().addIncident({
              id: incidentData.id,
              type: incidentData.type,
              status: incidentData.status,
              severity: incidentData.severity,
              description: incidentData.description,
              location: {
                lat: incidentData.lat,
                lng: incidentData.lng,
                address: incidentData.address,
              },
              reportedBy: incidentData.reported_by_name,
              reportedAt: reportedAt,
              isVerified: false,
              assignedUnits: incidentData.assigned_unit_ids,
            });

            // Select the incident
            useResQStore.getState().setSelectedIncident(incidentData.id);

            // Get the selected incident from state
            const state = useResQStore.getState();
            const selectedIncident = state.incidents.find(i => i.id === state.selectedIncidentId);

            // Verify all required information is present
            expect(selectedIncident).toBeDefined();
            expect(selectedIncident?.description).toBe(incidentData.description);
            expect(selectedIncident?.location.lat).toBeCloseTo(incidentData.lat, 10);
            expect(selectedIncident?.location.lng).toBeCloseTo(incidentData.lng, 10);
            expect(selectedIncident?.location.address).toBe(incidentData.address);
            expect(selectedIncident?.reportedBy).toBe(incidentData.reported_by_name);
            expect(selectedIncident?.reportedAt).toEqual(reportedAt);
            expect(selectedIncident?.assignedUnits).toEqual(incidentData.assigned_unit_ids);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 10: Incident Selection and Detail Display
    it('should maintain selection state when incidents are updated', () => {
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
            useResQStore.setState({ incidents: [], selectedIncidentId: null });
            
            // Add incident to state
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

            // Select the incident
            useResQStore.getState().setSelectedIncident(incidentData.id);
            expect(useResQStore.getState().selectedIncidentId).toBe(incidentData.id);

            // Update the incident
            useResQStore.getState().updateIncident(incidentData.id, {
              status: incidentData.updatedStatus,
            });

            // Verify selection is maintained
            const state = useResQStore.getState();
            expect(state.selectedIncidentId).toBe(incidentData.id);
            
            // Verify incident was updated
            const updatedIncident = state.incidents.find(i => i.id === incidentData.id);
            expect(updatedIncident?.status).toBe(incidentData.updatedStatus);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 10: Incident Selection and Detail Display
    it('should handle selection of non-existent incident gracefully', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 20 }),
          (nonExistentId) => {
            // Clear state for this iteration
            useResQStore.setState({ incidents: [], selectedIncidentId: null });

            // Try to select a non-existent incident
            useResQStore.getState().setSelectedIncident(nonExistentId);

            // Verify selected incident ID is set (even if incident doesn't exist)
            const state = useResQStore.getState();
            expect(state.selectedIncidentId).toBe(nonExistentId);
            
            // Verify finding the incident returns undefined
            const selectedIncident = state.incidents.find(i => i.id === state.selectedIncidentId);
            expect(selectedIncident).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
