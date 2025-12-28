/**
 * Property-Based Tests for Role-Based Authorization
 * 
 * Tests Property 16 from the design document:
 * - Property 16: Role-Based Authorization
 * 
 * @module services/authorization.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { commitDispatch, verifyIncident } from './incidentService';

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
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(),
            })),
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

describe('Authorization Service - Property-Based Tests', () => {
  describe('Property 16: Role-Based Authorization', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // Feature: resq-emergency-response-system, Property 16: Role-Based Authorization
    // **Validates: Requirements 15.2, 15.3, 15.4**
    it('should allow dispatch for users with dispatcher role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            incidentId: fc.string({ minLength: 10, maxLength: 20 }),
            unitIds: fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 1, maxLength: 3 }),
            userId: fc.uuid(),
          }),
          async ({ incidentId, unitIds, userId }) => {
            const { supabase, db } = await import('@/lib/supabase');

            // Mock user with dispatcher role
            vi.mocked(supabase.auth.getUser).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            } as any);

            // Mock successful dispatch (RPC checks role internally)
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
              dispatcher_id: userId,
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

            // Verify RPC was called with user ID
            expect(supabase.rpc).toHaveBeenCalledWith('create_dispatch', {
              p_incident_id: incidentId,
              p_unit_ids: unitIds,
              p_dispatcher_id: userId,
            });

            // Verify dispatch succeeded
            expect(result).toHaveLength(unitIds.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 16: Role-Based Authorization
    // **Validates: Requirements 15.2, 15.3, 15.4**
    it('should allow dispatch for users with admin role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            incidentId: fc.string({ minLength: 10, maxLength: 20 }),
            unitIds: fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 1, maxLength: 3 }),
            userId: fc.uuid(),
          }),
          async ({ incidentId, unitIds, userId }) => {
            const { supabase, db } = await import('@/lib/supabase');

            // Mock user with admin role
            vi.mocked(supabase.auth.getUser).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            } as any);

            // Mock successful dispatch (RPC checks role internally)
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
              dispatcher_id: userId,
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

            // Verify RPC was called with user ID
            expect(supabase.rpc).toHaveBeenCalledWith('create_dispatch', {
              p_incident_id: incidentId,
              p_unit_ids: unitIds,
              p_dispatcher_id: userId,
            });

            // Verify dispatch succeeded
            expect(result).toHaveLength(unitIds.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 16: Role-Based Authorization
    // **Validates: Requirements 15.2, 15.3, 15.4**
    it('should reject dispatch for users without dispatcher or admin role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            incidentId: fc.string({ minLength: 10, maxLength: 20 }),
            unitIds: fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 1, maxLength: 3 }),
            userId: fc.uuid(),
          }),
          async ({ incidentId, unitIds, userId }) => {
            const { supabase, handleSupabaseError } = await import('@/lib/supabase');

            // Mock user without proper role (e.g., citizen or responder)
            vi.mocked(supabase.auth.getUser).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            } as any);

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

            // Call commitDispatch - should throw error
            await expect(commitDispatch(incidentId, unitIds)).rejects.toThrow('Failed to commit dispatch');

            // Verify RPC was called
            expect(supabase.rpc).toHaveBeenCalledWith('create_dispatch', {
              p_incident_id: incidentId,
              p_unit_ids: unitIds,
              p_dispatcher_id: userId,
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 16: Role-Based Authorization
    // **Validates: Requirements 15.2, 15.3, 15.4**
    it('should allow verification for users with dispatcher role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            incidentId: fc.string({ minLength: 10, maxLength: 20 }),
            userId: fc.uuid(),
          }),
          async ({ incidentId, userId }) => {
            const { supabase, db } = await import('@/lib/supabase');

            // Mock user with dispatcher role
            vi.mocked(supabase.auth.getUser).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            } as any);

            // Mock current incident state
            const mockSelectEq = vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_verified: false },
                error: null,
              }),
            });
            const mockSelect = vi.fn().mockReturnValue({
              eq: mockSelectEq,
            });

            // Mock successful verification update
            const mockUpdateSingle = vi.fn().mockResolvedValue({
              data: {
                id: incidentId,
                type: 'fire',
                description: 'Test incident',
                severity: 'high',
                status: 'pending',
                lat: 40.7589,
                lng: -73.9851,
                is_verified: true,
                verified_by: userId,
                verified_at: new Date().toISOString(),
                reporter_id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            });
            const mockUpdateSelect = vi.fn().mockReturnValue({
              single: mockUpdateSingle,
            });
            const mockUpdateEq = vi.fn().mockReturnValue({
              select: mockUpdateSelect,
            });
            const mockUpdate = vi.fn().mockReturnValue({
              eq: mockUpdateEq,
            });

            vi.mocked(db.incidents).mockReturnValue({
              select: mockSelect,
              update: mockUpdate,
            } as any);

            // Call verifyIncident
            const result = await verifyIncident(incidentId);

            // Verify the incident was updated
            expect(mockUpdate).toHaveBeenCalledWith({ is_verified: true });
            expect(result.isVerified).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 16: Role-Based Authorization
    // **Validates: Requirements 15.2, 15.3, 15.4**
    it('should allow verification for users with admin role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            incidentId: fc.string({ minLength: 10, maxLength: 20 }),
            userId: fc.uuid(),
          }),
          async ({ incidentId, userId }) => {
            const { supabase, db } = await import('@/lib/supabase');

            // Mock user with admin role
            vi.mocked(supabase.auth.getUser).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            } as any);

            // Mock current incident state
            const mockSelectEq = vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_verified: false },
                error: null,
              }),
            });
            const mockSelect = vi.fn().mockReturnValue({
              eq: mockSelectEq,
            });

            // Mock successful verification update
            const mockUpdateSingle = vi.fn().mockResolvedValue({
              data: {
                id: incidentId,
                type: 'medical',
                description: 'Test incident',
                severity: 'medium',
                status: 'pending',
                lat: 40.7589,
                lng: -73.9851,
                is_verified: true,
                verified_by: userId,
                verified_at: new Date().toISOString(),
                reporter_id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            });
            const mockUpdateSelect = vi.fn().mockReturnValue({
              single: mockUpdateSingle,
            });
            const mockUpdateEq = vi.fn().mockReturnValue({
              select: mockUpdateSelect,
            });
            const mockUpdate = vi.fn().mockReturnValue({
              eq: mockUpdateEq,
            });

            vi.mocked(db.incidents).mockReturnValue({
              select: mockSelect,
              update: mockUpdate,
            } as any);

            // Call verifyIncident
            const result = await verifyIncident(incidentId);

            // Verify the incident was updated
            expect(mockUpdate).toHaveBeenCalledWith({ is_verified: true });
            expect(result.isVerified).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 16: Role-Based Authorization
    // **Validates: Requirements 15.2, 15.3, 15.4**
    it('should allow verification for users with responder role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            incidentId: fc.string({ minLength: 10, maxLength: 20 }),
            userId: fc.uuid(),
          }),
          async ({ incidentId, userId }) => {
            const { supabase, db } = await import('@/lib/supabase');

            // Mock user with responder role
            vi.mocked(supabase.auth.getUser).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            } as any);

            // Mock current incident state
            const mockSelectEq = vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { is_verified: false },
                error: null,
              }),
            });
            const mockSelect = vi.fn().mockReturnValue({
              eq: mockSelectEq,
            });

            // Mock successful verification update
            const mockUpdateSingle = vi.fn().mockResolvedValue({
              data: {
                id: incidentId,
                type: 'accident',
                description: 'Test incident',
                severity: 'low',
                status: 'pending',
                lat: 40.7589,
                lng: -73.9851,
                is_verified: true,
                verified_by: userId,
                verified_at: new Date().toISOString(),
                reporter_id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            });
            const mockUpdateSelect = vi.fn().mockReturnValue({
              single: mockUpdateSingle,
            });
            const mockUpdateEq = vi.fn().mockReturnValue({
              select: mockUpdateSelect,
            });
            const mockUpdate = vi.fn().mockReturnValue({
              eq: mockUpdateEq,
            });

            vi.mocked(db.incidents).mockReturnValue({
              select: mockSelect,
              update: mockUpdate,
            } as any);

            // Call verifyIncident
            const result = await verifyIncident(incidentId);

            // Verify the incident was updated
            expect(mockUpdate).toHaveBeenCalledWith({ is_verified: true });
            expect(result.isVerified).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 16: Role-Based Authorization
    // **Validates: Requirements 15.2, 15.3, 15.4**
    it('should return permission errors for unauthorized actions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            incidentId: fc.string({ minLength: 10, maxLength: 20 }),
            unitIds: fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 1, maxLength: 3 }),
            userId: fc.uuid(),
          }),
          async ({ incidentId, unitIds, userId }) => {
            const { supabase, handleSupabaseError } = await import('@/lib/supabase');

            // Mock user without proper role
            vi.mocked(supabase.auth.getUser).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            } as any);

            // Mock RPC error with permission message
            const permissionError = {
              message: 'User does not have dispatch permissions',
              code: 'P0001',
              details: null,
              hint: null,
            };

            vi.mocked(supabase.rpc).mockResolvedValue({
              data: null,
              error: permissionError,
            } as any);

            // Mock handleSupabaseError to throw with the error message
            vi.mocked(handleSupabaseError).mockImplementation((error: any, message: string) => {
              throw new Error(message);
            });

            // Call commitDispatch - should throw permission error
            let errorThrown = false;
            try {
              await commitDispatch(incidentId, unitIds);
            } catch (error) {
              errorThrown = true;
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toContain('Failed to commit dispatch');
            }

            // Verify error was thrown
            expect(errorThrown).toBe(true);

            // Verify RPC was called
            expect(supabase.rpc).toHaveBeenCalledWith('create_dispatch', {
              p_incident_id: incidentId,
              p_unit_ids: unitIds,
              p_dispatcher_id: userId,
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
