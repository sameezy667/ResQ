/**
 * Property-Based Tests for Incident Verification
 * 
 * Tests Property 7 from the design document:
 * - Property 7: Incident Verification Toggle with Metadata
 * 
 * @module services/incidentVerification.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { verifyIncident } from './incidentService';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockDb = {
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
  };

  return {
    supabase: {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ 
          data: { user: { id: 'test-user-id' } }, 
          error: null 
        })),
      },
    },
    db: mockDb,
    handleSupabaseError: vi.fn((error: any, message: string) => {
      throw new Error(message);
    }),
  };
});

describe('Incident Verification - Property-Based Tests', () => {
  describe('Property 7: Incident Verification Toggle with Metadata', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // Feature: resq-emergency-response-system, Property 7: Incident Verification Toggle with Metadata
    it('should toggle verification status from false to true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 20 }), // incident ID
          async (incidentId) => {
            const { db } = await import('@/lib/supabase');
            const { verifyIncident } = await import('./incidentService');

            // Mock current state: incident is not verified
            const mockCurrentData = {
              is_verified: false,
            };

            // Mock updated state: incident is now verified
            const mockUpdatedIncident = {
              id: incidentId,
              type: 'fire',
              status: 'pending',
              severity: 'high',
              description: 'Test incident',
              lat: 40.7589,
              lng: -73.9851,
              reported_by_name: 'Test User',
              reported_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              is_verified: true, // Toggled to true
              assigned_unit_ids: [],
              address: null,
              reported_by: null,
              verified_by: null,
              verified_at: null,
              updated_at: new Date().toISOString(),
            };

            // Setup mocks for select (get current state)
            const mockSelectSingle = vi.fn().mockResolvedValue({
              data: mockCurrentData,
              error: null,
            });
            const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
            const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

            // Setup mocks for update
            const mockUpdateSingle = vi.fn().mockResolvedValue({
              data: mockUpdatedIncident,
              error: null,
            });
            const mockUpdateSelect = vi.fn().mockReturnValue({ single: mockUpdateSingle });
            const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelect });
            const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

            // Mock the incidents() call to return different mocks for select vs update
            let callCount = 0;
            vi.mocked(db.incidents).mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // First call is select
                return { select: mockSelect } as any;
              } else {
                // Second call is update
                return { update: mockUpdate } as any;
              }
            });

            // Call verifyIncident
            const result = await verifyIncident(incidentId);

            // Verify the incident was queried for current state
            expect(mockSelect).toHaveBeenCalledWith('is_verified');
            expect(mockSelectEq).toHaveBeenCalledWith('id', incidentId);

            // Verify the incident was updated with toggled status
            expect(mockUpdate).toHaveBeenCalledWith({ is_verified: true });
            expect(mockUpdateEq).toHaveBeenCalledWith('id', incidentId);

            // Verify the result has the toggled status
            expect(result.isVerified).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 7: Incident Verification Toggle with Metadata
    it('should toggle verification status from true to false', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 20 }), // incident ID
          async (incidentId) => {
            const { db } = await import('@/lib/supabase');
            const { verifyIncident } = await import('./incidentService');

            // Mock current state: incident is verified
            const mockCurrentData = {
              is_verified: true,
            };

            // Mock updated state: incident is now unverified
            const mockUpdatedIncident = {
              id: incidentId,
              type: 'medical',
              status: 'responding',
              severity: 'critical',
              description: 'Test incident',
              lat: 40.7589,
              lng: -73.9851,
              reported_by_name: 'Test User',
              reported_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              is_verified: false, // Toggled to false
              assigned_unit_ids: [],
              address: null,
              reported_by: null,
              verified_by: null,
              verified_at: null,
              updated_at: new Date().toISOString(),
            };

            // Setup mocks for select (get current state)
            const mockSelectSingle = vi.fn().mockResolvedValue({
              data: mockCurrentData,
              error: null,
            });
            const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
            const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

            // Setup mocks for update
            const mockUpdateSingle = vi.fn().mockResolvedValue({
              data: mockUpdatedIncident,
              error: null,
            });
            const mockUpdateSelect = vi.fn().mockReturnValue({ single: mockUpdateSingle });
            const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelect });
            const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

            // Mock the incidents() call to return different mocks for select vs update
            let callCount = 0;
            vi.mocked(db.incidents).mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // First call is select
                return { select: mockSelect } as any;
              } else {
                // Second call is update
                return { update: mockUpdate } as any;
              }
            });

            // Call verifyIncident
            const result = await verifyIncident(incidentId);

            // Verify the incident was updated with toggled status
            expect(mockUpdate).toHaveBeenCalledWith({ is_verified: false });

            // Verify the result has the toggled status
            expect(result.isVerified).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 7: Incident Verification Toggle with Metadata
    it('should handle verification toggle for any incident type and status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 20 }), // incident ID
          fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other'), // incident type
          fc.constantFrom('pending', 'responding', 'resolved'), // incident status
          fc.boolean(), // current verification status
          async (incidentId, incidentType, incidentStatus, currentlyVerified) => {
            const { db } = await import('@/lib/supabase');
            const { verifyIncident } = await import('./incidentService');

            // Mock current state
            const mockCurrentData = {
              is_verified: currentlyVerified,
            };

            // Mock updated state with toggled verification
            const mockUpdatedIncident = {
              id: incidentId,
              type: incidentType,
              status: incidentStatus,
              severity: 'high',
              description: 'Test incident',
              lat: 40.7589,
              lng: -73.9851,
              reported_by_name: 'Test User',
              reported_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              is_verified: !currentlyVerified, // Toggled
              assigned_unit_ids: [],
              address: null,
              reported_by: null,
              verified_by: null,
              verified_at: null,
              updated_at: new Date().toISOString(),
            };

            // Setup mocks
            const mockSelectSingle = vi.fn().mockResolvedValue({
              data: mockCurrentData,
              error: null,
            });
            const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
            const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

            const mockUpdateSingle = vi.fn().mockResolvedValue({
              data: mockUpdatedIncident,
              error: null,
            });
            const mockUpdateSelect = vi.fn().mockReturnValue({ single: mockUpdateSingle });
            const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelect });
            const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

            let callCount = 0;
            vi.mocked(db.incidents).mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                return { select: mockSelect } as any;
              } else {
                return { update: mockUpdate } as any;
              }
            });

            // Call verifyIncident
            const result = await verifyIncident(incidentId);

            // Verify the status was toggled correctly
            expect(result.isVerified).toBe(!currentlyVerified);
            expect(mockUpdate).toHaveBeenCalledWith({ is_verified: !currentlyVerified });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Incident Verification - Unit Tests', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should handle database errors gracefully', async () => {
      const { db } = await import('@/lib/supabase');
      const { verifyIncident } = await import('./incidentService');
      const { handleSupabaseError } = await import('@/lib/supabase');

      const incidentId = 'INC-20250101-0001';

      // Mock database error on select
      const mockSelectSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'PGRST301' },
      });
      const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      vi.mocked(db.incidents).mockReturnValue({ select: mockSelect } as any);

      // Should throw error
      await expect(verifyIncident(incidentId)).rejects.toThrow();
    });

    it('should log errors when verification fails', async () => {
      const { db } = await import('@/lib/supabase');
      const { verifyIncident } = await import('./incidentService');

      const incidentId = 'INC-20250101-0001';

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock database error
      const mockSelectSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST500' },
      });
      const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      vi.mocked(db.incidents).mockReturnValue({ select: mockSelect } as any);

      // Call verifyIncident and expect it to throw
      try {
        await verifyIncident(incidentId);
      } catch (error) {
        // Expected to throw
      }

      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error verifying incident:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing incident gracefully', async () => {
      const { db } = await import('@/lib/supabase');
      const { verifyIncident } = await import('./incidentService');

      const incidentId = 'INC-NONEXISTENT';

      // Mock no data found
      const mockSelectSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

      vi.mocked(db.incidents).mockReturnValue({ select: mockSelect } as any);

      // Call verifyIncident - should handle null data
      try {
        await verifyIncident(incidentId);
      } catch (error) {
        // May throw or handle gracefully depending on implementation
      }

      // Verify select was called
      expect(mockSelect).toHaveBeenCalledWith('is_verified');
      expect(mockSelectEq).toHaveBeenCalledWith('id', incidentId);
    });
  });
});
