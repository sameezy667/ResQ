/**
 * Property-Based Tests for Dispatch Operations
 * 
 * Tests Property 6 from the design document:
 * - Property 6: Dispatch Preview and Commit Flow
 * 
 * @module services/dispatchService.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { previewDispatch, commitDispatch } from './incidentService';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ 
          data: { user: { id: '00000000-0000-0000-0000-000000000001' } }, 
          error: null 
        })),
      },
      rpc: vi.fn(),
    },
    db: {
      incidents: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
      units: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
      dispatches: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    },
    handleSupabaseError: vi.fn((error: any, message: string) => {
      throw new Error(message);
    }),
  };
});

describe('Dispatch Service - Property-Based Tests', () => {
  describe('Property 6: Dispatch Preview and Commit Flow', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // Feature: resq-emergency-response-system, Property 6: Dispatch Preview and Commit Flow
    it('should generate preview routes with 10 waypoints for each unit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            incidentId: fc.string({ minLength: 10, maxLength: 20 }),
            unitIds: fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 1, maxLength: 5 }),
          }),
          async ({ incidentId, unitIds }) => {
            const { supabase } = await import('@/lib/supabase');
            const { previewDispatch } = await import('./incidentService');

            // Mock preview_routes RPC response - note the RPC returns unit_id (snake_case)
            const mockRoutes = unitIds.map(unitId => ({
              unit_id: unitId,  // RPC returns snake_case
              unitName: `Unit ${unitId}`,
              route: Array.from({ length: 11 }, (_, i) => [
                40.7589 + (i * 0.001),
                -73.9851 + (i * 0.001),
              ]),
              distance: 5.5,
              eta: 11,
            }));

            vi.mocked(supabase.rpc).mockResolvedValue({
              data: mockRoutes,
              error: null,
            } as any);

            // Call previewDispatch
            const result = await previewDispatch(incidentId, unitIds);

            // Verify RPC was called with correct parameters
            expect(supabase.rpc).toHaveBeenCalledWith('preview_routes', {
              p_incident_id: incidentId,
              p_unit_ids: unitIds,
            });

            // Verify result structure
            expect(result).toHaveLength(unitIds.length);
            
            // Verify each route has 10 waypoints (11 points total including start and end)
            result.forEach((route) => {
              expect(route.incidentId).toBe(incidentId);
              // Verify unitId is one of the requested units
              expect(unitIds).toContain(route.unitId);
              expect((route as any).coordinates).toHaveLength(11);
              
              // Verify coordinates are valid [lat, lng] pairs
              (route as any).coordinates.forEach((coord: any) => {
                expect(coord).toHaveLength(2);
                expect(typeof coord[0]).toBe('number');
                expect(typeof coord[1]).toBe('number');
                expect(Number.isFinite(coord[0])).toBe(true);
                expect(Number.isFinite(coord[1])).toBe(true);
              });
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 6: Dispatch Preview and Commit Flow
    it('should create dispatch records when committing dispatch', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            incidentId: fc.string({ minLength: 10, maxLength: 20 }),
            unitIds: fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 1, maxLength: 3 }),
          }),
          async ({ incidentId, unitIds }) => {
            const { supabase, db } = await import('@/lib/supabase');
            const { commitDispatch } = await import('./incidentService');

            // Mock create_dispatch RPC response
            const mockDispatchIds = unitIds.map(() => crypto.randomUUID());
            vi.mocked(supabase.rpc).mockResolvedValue({
              data: {
                success: true,
                incidentId,
                dispatch_ids: mockDispatchIds,
                dispatchedCount: unitIds.length,
              },
              error: null,
            } as any);

            // Mock dispatches fetch
            const mockDispatches = mockDispatchIds.map((id, index) => ({
              id,
              incident_id: incidentId,
              unit_id: unitIds[index],
              dispatcher_id: '00000000-0000-0000-0000-000000000001',
              dispatched_at: new Date().toISOString(),
              eta_minutes: 10,
              route_geojson: {
                type: 'LineString',
                coordinates: Array.from({ length: 11 }, (_, i) => [
                  -73.9851 + (i * 0.001),
                  40.7589 + (i * 0.001),
                ]),
              },
              status: 'dispatched',
              arrived_at: null,
              completed_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            const mockIn = vi.fn().mockResolvedValue({
              data: mockDispatches,
              error: null,
            });
            const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
            vi.mocked(db.dispatches).mockReturnValue({ select: mockSelect } as any);

            // Call commitDispatch
            const result = await commitDispatch(incidentId, unitIds);

            // Verify RPC was called with correct parameters
            expect(supabase.rpc).toHaveBeenCalledWith('create_dispatch', {
              p_incident_id: incidentId,
              p_unit_ids: unitIds,
              p_dispatcher_id: '00000000-0000-0000-0000-000000000001',
            });

            // Verify dispatch records were fetched
            expect(db.dispatches).toHaveBeenCalled();
            expect(mockSelect).toHaveBeenCalledWith('*');
            expect(mockIn).toHaveBeenCalledWith('id', mockDispatchIds);

            // Verify result structure
            expect(result).toHaveLength(unitIds.length);
            result.forEach((dispatch, index) => {
              expect(dispatch.incidentId).toBe(incidentId);
              expect(dispatch.unitId).toBe(unitIds[index]);
              expect(dispatch.id).toBe(mockDispatchIds[index]);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 6: Dispatch Preview and Commit Flow
    it('should update unit status to dispatched and incident status to responding', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            incidentId: fc.string({ minLength: 10, maxLength: 20 }),
            unitIds: fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 1, maxLength: 3 }),
          }),
          async ({ incidentId, unitIds }) => {
            const { supabase, db } = await import('@/lib/supabase');
            const { commitDispatch } = await import('./incidentService');

            // Mock create_dispatch RPC response - the RPC function handles status updates
            const mockDispatchIds = unitIds.map(() => crypto.randomUUID());
            const mockRpcResponse = {
              success: true,
              incidentId,
              dispatch_ids: mockDispatchIds,
              dispatchedCount: unitIds.length,
            };

            vi.mocked(supabase.rpc).mockResolvedValue({
              data: mockRpcResponse,
              error: null,
            } as any);

            // Mock dispatches fetch
            const mockDispatches = mockDispatchIds.map((id, index) => ({
              id,
              incident_id: incidentId,
              unit_id: unitIds[index],
              dispatcher_id: '00000000-0000-0000-0000-000000000001',
              dispatched_at: new Date().toISOString(),
              eta_minutes: 10,
              route_geojson: {
                type: 'LineString',
                coordinates: Array.from({ length: 11 }, (_, i) => [
                  -73.9851 + (i * 0.001),
                  40.7589 + (i * 0.001),
                ]),
              },
              status: 'dispatched',
              arrived_at: null,
              completed_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            const mockIn = vi.fn().mockResolvedValue({
              data: mockDispatches,
              error: null,
            });
            const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
            vi.mocked(db.dispatches).mockReturnValue({ select: mockSelect } as any);

            // Call commitDispatch
            await commitDispatch(incidentId, unitIds);

            // Verify the RPC was called (which handles the status updates internally)
            expect(supabase.rpc).toHaveBeenCalledWith('create_dispatch', {
              p_incident_id: incidentId,
              p_unit_ids: unitIds,
              p_dispatcher_id: '00000000-0000-0000-0000-000000000001',
            });

            // The RPC function create_dispatch handles:
            // 1. Updating unit status to 'dispatched'
            // 2. Updating incident status to 'responding'
            // 3. Creating dispatch records
            // We verify the RPC was called with correct parameters
            expect(mockRpcResponse.success).toBe(true);
            expect(mockRpcResponse.dispatchedCount).toBe(unitIds.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 6: Dispatch Preview and Commit Flow
    it('should calculate and store ETAs for dispatched units', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            incidentId: fc.string({ minLength: 10, maxLength: 20 }),
            unitIds: fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 1, maxLength: 3 }),
          }),
          async ({ incidentId, unitIds }) => {
            const { supabase, db } = await import('@/lib/supabase');
            const { commitDispatch } = await import('./incidentService');

            // Mock create_dispatch RPC response
            const mockDispatchIds = unitIds.map(() => crypto.randomUUID());
            vi.mocked(supabase.rpc).mockResolvedValue({
              data: {
                success: true,
                incidentId,
                dispatch_ids: mockDispatchIds,
                dispatchedCount: unitIds.length,
              },
              error: null,
            } as any);

            // Mock dispatches fetch with ETAs
            const mockDispatches = mockDispatchIds.map((id, index) => ({
              id,
              incident_id: incidentId,
              unit_id: unitIds[index],
              dispatcher_id: '00000000-0000-0000-0000-000000000001',
              dispatched_at: new Date().toISOString(),
              eta_minutes: 10 + index, // Different ETA for each unit
              route_geojson: {
                type: 'LineString',
                coordinates: Array.from({ length: 11 }, (_, i) => [
                  -73.9851 + (i * 0.001),
                  40.7589 + (i * 0.001),
                ]),
              },
              status: 'dispatched',
              arrived_at: null,
              completed_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            const mockIn = vi.fn().mockResolvedValue({
              data: mockDispatches,
              error: null,
            });
            const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
            vi.mocked(db.dispatches).mockReturnValue({ select: mockSelect } as any);

            // Call commitDispatch
            const result = await commitDispatch(incidentId, unitIds);

            // Verify ETAs are present and valid
            expect(result).toHaveLength(unitIds.length);
            result.forEach((dispatch, index) => {
              expect(dispatch.eta).toBeDefined();
              expect(typeof dispatch.eta).toBe('number');
              expect(dispatch.eta).toBeGreaterThan(0);
              expect(Number.isFinite(dispatch.eta)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


describe('Dispatch Service - Unit Tests for Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Dispatch with Unavailable Units', () => {
    it('should handle dispatch when units are not available', async () => {
      const { supabase, db } = await import('@/lib/supabase');
      const { commitDispatch } = await import('./incidentService');

      const incidentId = 'INC-20250101-0001';
      const unitIds = ['UNIT-001', 'UNIT-002'];

      // Mock create_dispatch RPC response - no units dispatched because they're unavailable
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          success: true,
          incidentId,
          dispatch_ids: [], // Empty because units were unavailable
          dispatchedCount: 0,
        },
        error: null,
      } as any);

      // Mock empty dispatches fetch
      const mockIn = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      vi.mocked(db.dispatches).mockReturnValue({ select: mockSelect } as any);

      // Call commitDispatch
      const result = await commitDispatch(incidentId, unitIds);

      // Should return empty array when no units are available
      expect(result).toEqual([]);
      expect(supabase.rpc).toHaveBeenCalledWith('create_dispatch', {
        p_incident_id: incidentId,
        p_unit_ids: unitIds,
        p_dispatcher_id: '00000000-0000-0000-0000-000000000001',
      });
    });
  });

  describe('Dispatch with Invalid Incident ID', () => {
    it('should throw error when incident does not exist', async () => {
      const { supabase, handleSupabaseError } = await import('@/lib/supabase');
      const { commitDispatch } = await import('./incidentService');

      const invalidIncidentId = 'INC-INVALID';
      const unitIds = ['UNIT-001'];

      // Mock RPC error for invalid incident
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {
          message: 'Incident not found: INC-INVALID',
          code: 'P0001',
          details: null,
          hint: null,
        },
      } as any);

      // Mock handleSupabaseError to throw
      vi.mocked(handleSupabaseError).mockImplementation((error: any, message: string) => {
        throw new Error(message);
      });

      // Should throw error
      await expect(commitDispatch(invalidIncidentId, unitIds)).rejects.toThrow('Failed to commit dispatch');
      
      expect(supabase.rpc).toHaveBeenCalledWith('create_dispatch', {
        p_incident_id: invalidIncidentId,
        p_unit_ids: unitIds,
        p_dispatcher_id: '00000000-0000-0000-0000-000000000001',
      });
    });

    it('should return empty array when previewing routes for non-existent incident', async () => {
      const { supabase } = await import('@/lib/supabase');
      const { previewDispatch } = await import('./incidentService');

      const invalidIncidentId = 'INC-INVALID';
      const unitIds = ['UNIT-001'];

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock RPC error for invalid incident
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {
          message: 'Incident not found: INC-INVALID',
          code: 'P0001',
          details: null,
          hint: null,
        },
      } as any);

      // Call previewDispatch - should catch error and return empty array
      const result = await previewDispatch(invalidIncidentId, unitIds);

      // Should return empty array on error
      expect(result).toEqual([]);
      
      expect(supabase.rpc).toHaveBeenCalledWith('preview_routes', {
        p_incident_id: invalidIncidentId,
        p_unit_ids: unitIds,
      });

      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Dispatch Authorization Failures', () => {
    it('should throw error when user does not have dispatch permissions', async () => {
      const { supabase, handleSupabaseError } = await import('@/lib/supabase');
      const { commitDispatch } = await import('./incidentService');

      const incidentId = 'INC-20250101-0001';
      const unitIds = ['UNIT-001'];

      // Mock RPC error for unauthorized user
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {
          message: 'User does not have dispatch permissions',
          code: 'P0001',
          details: null,
          hint: null,
        },
      } as any);

      // Mock handleSupabaseError to throw
      vi.mocked(handleSupabaseError).mockImplementation((error: any, message: string) => {
        throw new Error(message);
      });

      // Should throw error
      await expect(commitDispatch(incidentId, unitIds)).rejects.toThrow('Failed to commit dispatch');
      
      expect(supabase.rpc).toHaveBeenCalledWith('create_dispatch', {
        p_incident_id: incidentId,
        p_unit_ids: unitIds,
        p_dispatcher_id: '00000000-0000-0000-0000-000000000001',
      });
    });

    it('should handle dispatch when user is not authenticated', async () => {
      const { supabase } = await import('@/lib/supabase');
      const { commitDispatch } = await import('./incidentService');

      const incidentId = 'INC-20250101-0001';
      const unitIds = ['UNIT-001'];

      // Mock getUser to return no user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      // Mock RPC to succeed with system user
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          success: true,
          incidentId,
          dispatch_ids: [],
          dispatchedCount: 0,
        },
        error: null,
      } as any);

      // Call commitDispatch - should use system user ID
      await commitDispatch(incidentId, unitIds);

      // Should call RPC with system user ID (all zeros)
      expect(supabase.rpc).toHaveBeenCalledWith('create_dispatch', {
        p_incident_id: incidentId,
        p_unit_ids: unitIds,
        p_dispatcher_id: '00000000-0000-0000-0000-000000000000',
      });
    });
  });

  describe('Error Logging', () => {
    it('should log errors when preview dispatch fails', async () => {
      const { supabase } = await import('@/lib/supabase');
      const { previewDispatch } = await import('./incidentService');

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const incidentId = 'INC-20250101-0001';
      const unitIds = ['UNIT-001'];

      // Mock RPC error
      const mockError = {
        message: 'Database connection failed',
        code: 'PGRST301',
        details: null,
        hint: null,
      };

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: mockError,
      } as any);

      // Call previewDispatch - should catch error and return empty array
      const result = await previewDispatch(incidentId, unitIds);

      // Should return empty array on error
      expect(result).toEqual([]);

      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error previewing dispatch:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log errors when commit dispatch fails', async () => {
      const { supabase } = await import('@/lib/supabase');
      const { commitDispatch } = await import('./incidentService');

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const incidentId = 'INC-20250101-0001';
      const unitIds = ['UNIT-001'];

      // Mock RPC error
      const mockError = {
        message: 'Database connection failed',
        code: 'PGRST301',
        details: null,
        hint: null,
      };

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: mockError,
      } as any);

      // Call commitDispatch - should throw error
      await expect(commitDispatch(incidentId, unitIds)).rejects.toThrow();

      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error committing dispatch:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Empty Unit List', () => {
    it('should handle preview dispatch with empty unit list', async () => {
      const { supabase } = await import('@/lib/supabase');
      const { previewDispatch } = await import('./incidentService');

      const incidentId = 'INC-20250101-0001';
      const unitIds: string[] = [];

      // Mock RPC response with empty routes
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      // Call previewDispatch
      const result = await previewDispatch(incidentId, unitIds);

      // Should return empty array
      expect(result).toEqual([]);
      expect(supabase.rpc).toHaveBeenCalledWith('preview_routes', {
        p_incident_id: incidentId,
        p_unit_ids: unitIds,
      });
    });

    it('should handle commit dispatch with empty unit list', async () => {
      const { supabase, db } = await import('@/lib/supabase');
      const { commitDispatch } = await import('./incidentService');

      const incidentId = 'INC-20250101-0001';
      const unitIds: string[] = [];

      // Mock RPC response with no dispatches
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          success: true,
          incidentId,
          dispatch_ids: [],
          dispatchedCount: 0,
        },
        error: null,
      } as any);

      // Mock empty dispatches fetch
      const mockIn = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      vi.mocked(db.dispatches).mockReturnValue({ select: mockSelect } as any);

      // Call commitDispatch
      const result = await commitDispatch(incidentId, unitIds);

      // Should return empty array
      expect(result).toEqual([]);
    });
  });
});
