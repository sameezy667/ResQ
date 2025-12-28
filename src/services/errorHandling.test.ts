/**
 * Property-Based Tests for Error Handling
 * 
 * Tests Property 15 from the design document:
 * - Property 15: Error Handling Without Crashes
 * 
 * Validates Requirements 14.1, 14.2, 14.3, 14.4:
 * - Database failures are logged and handled
 * - Real-time failures don't crash the app
 * - Invalid data is filtered and logged
 * - Unauthorized actions show error messages
 * 
 * @module services/errorHandling.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import type { IncidentType } from '@/types';

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mockDb = {
    incidents: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      select: vi.fn(() => ({
        order: vi.fn(),
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
    units: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(),
      })),
    })),
    dispatches: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          order: vi.fn(),
        })),
      })),
    })),
  };

  return {
    supabase: {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      },
      rpc: vi.fn(),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn((callback) => {
          if (typeof callback === 'function') {
            callback('SUBSCRIBED');
          }
          return { unsubscribe: vi.fn() };
        }),
        unsubscribe: vi.fn(),
      })),
    },
    db: mockDb,
    handleSupabaseError: vi.fn((error: any, message: string) => {
      throw new Error(message);
    }),
  };
});

describe('Error Handling - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Property 15: Error Handling Without Crashes', () => {
    // Feature: resq-emergency-response-system, Property 15: Error Handling Without Crashes
    // Validates: Requirements 14.1
    it('should log database failures and return empty array without crashing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            errorCode: fc.constantFrom('PGRST301', 'PGRST500', '08006', '57P03'),
            errorMessage: fc.string({ minLength: 5, maxLength: 100 }),
          }),
          async (errorData) => {
            const { db } = await import('@/lib/supabase');
            const { getIncidents, getUnits, getDispatchRoutes } = await import('./incidentService');

            // Spy on console.error to verify logging
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            // Mock database error for incidents
            const mockOrder = vi.fn().mockResolvedValue({
              data: null,
              error: { message: errorData.errorMessage, code: errorData.errorCode },
            });
            const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
            vi.mocked(db.incidents).mockReturnValue({ select: mockSelect } as any);

            // Call getIncidents - should not throw
            const incidentsResult = await getIncidents();

            // Verify error was logged
            expect(consoleErrorSpy).toHaveBeenCalledWith(
              'Error fetching incidents:',
              expect.objectContaining({ message: errorData.errorMessage })
            );

            // Verify empty array returned (graceful degradation)
            expect(incidentsResult).toEqual([]);
            expect(Array.isArray(incidentsResult)).toBe(true);

            // Reset mocks for units test
            vi.clearAllMocks();
            consoleErrorSpy.mockClear();

            // Mock database error for units
            const mockOrderUnits = vi.fn().mockResolvedValue({
              data: null,
              error: { message: errorData.errorMessage, code: errorData.errorCode },
            });
            const mockSelectUnits = vi.fn().mockReturnValue({ order: mockOrderUnits });
            vi.mocked(db.units).mockReturnValue({ select: mockSelectUnits } as any);

            // Call getUnits - should not throw
            const unitsResult = await getUnits();

            // Verify error was logged
            expect(consoleErrorSpy).toHaveBeenCalledWith(
              'Error fetching units:',
              expect.objectContaining({ message: errorData.errorMessage })
            );

            // Verify empty array returned
            expect(unitsResult).toEqual([]);
            expect(Array.isArray(unitsResult)).toBe(true);

            consoleErrorSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 15: Error Handling Without Crashes
    // Validates: Requirements 14.2
    it('should handle real-time synchronization failures without crashing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            errorType: fc.constantFrom('CHANNEL_ERROR', 'SUBSCRIPTION_ERROR', 'WEBSOCKET_ERROR'),
            shouldRecover: fc.boolean(),
          }),
          async (testData) => {
            const { supabase } = await import('@/lib/supabase');
            const { useResQStore } = await import('@/store/useResQStore');

            // Spy on console.error and console.log
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            // Mock channel with potential error
            const mockChannel = {
              on: vi.fn().mockReturnThis(),
              subscribe: vi.fn((callback) => {
                if (typeof callback === 'function') {
                  // Simulate subscription status
                  if (testData.shouldRecover) {
                    callback('SUBSCRIBED');
                  } else {
                    callback('CHANNEL_ERROR');
                  }
                }
                return { unsubscribe: vi.fn() };
              }),
              unsubscribe: vi.fn(),
            };

            vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

            // Initialize realtime - should not throw even if subscription fails
            const store = useResQStore.getState();
            
            // This should not throw regardless of subscription status
            expect(() => store.initializeRealtime()).not.toThrow();

            // Verify subscriptions were attempted
            expect(supabase.channel).toHaveBeenCalled();

            // Cleanup should also not throw
            expect(() => store.cleanupRealtime()).not.toThrow();

            consoleErrorSpy.mockRestore();
            consoleLogSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 15: Error Handling Without Crashes
    // Validates: Requirements 14.3
    it('should filter invalid data and log warnings without crashing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 10, maxLength: 20 }),
              type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other') as fc.Arbitrary<IncidentType>,
              status: fc.constantFrom('pending', 'responding', 'resolved'),
              severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
              description: fc.string({ minLength: 10, maxLength: 200 }),
              // Generate mix of valid and invalid coordinates
              lat: fc.oneof(
                fc.double({ min: -90, max: 90, noNaN: true }),
                fc.constant(NaN),
                fc.constant(Infinity),
                fc.constant(-Infinity),
                fc.constant(null as any)
              ),
              lng: fc.oneof(
                fc.double({ min: -180, max: 180, noNaN: true }),
                fc.constant(NaN),
                fc.constant(Infinity),
                fc.constant(-Infinity),
                fc.constant(null as any)
              ),
              reported_by_name: fc.string({ minLength: 3, maxLength: 50 }),
              reported_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2030-12-31') }).map(ts => new Date(ts).toISOString()),
              created_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2030-12-31') }).map(ts => new Date(ts).toISOString()),
              is_verified: fc.boolean(),
              assigned_unit_ids: fc.array(fc.string()),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (mockData) => {
            const { db } = await import('@/lib/supabase');
            const { getIncidents } = await import('./incidentService');

            // Spy on console.warn to verify invalid data is logged
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            // Add required fields for database schema
            const completeData = mockData.map(item => ({
              ...item,
              address: null,
              reported_by: null,
              verified_by: null,
              verified_at: null,
              updated_at: item.created_at,
            }));

            // Mock database response with mix of valid and invalid data
            const mockOrder = vi.fn().mockResolvedValue({
              data: completeData,
              error: null,
            });
            const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
            vi.mocked(db.incidents).mockReturnValue({ select: mockSelect } as any);

            // Call getIncidents - should not throw
            const result = await getIncidents();

            // Verify result is an array (even if empty)
            expect(Array.isArray(result)).toBe(true);

            // Count how many items have valid coordinates
            const validCount = completeData.filter(item => {
              const latValid = typeof item.lat === 'number' && 
                              Number.isFinite(item.lat) && 
                              item.lat >= -90 && 
                              item.lat <= 90;
              const lngValid = typeof item.lng === 'number' && 
                              Number.isFinite(item.lng) && 
                              item.lng >= -180 && 
                              item.lng <= 180;
              return latValid && lngValid;
            }).length;

            // Result should only contain valid items
            expect(result.length).toBe(validCount);

            // If there were invalid items, warnings should have been logged
            const invalidCount = completeData.length - validCount;
            if (invalidCount > 0) {
              expect(consoleWarnSpy).toHaveBeenCalled();
            }

            // All returned items should have valid coordinates
            result.forEach(incident => {
              expect(Number.isFinite(incident.location.lat)).toBe(true);
              expect(Number.isFinite(incident.location.lng)).toBe(true);
              expect(incident.location.lat).toBeGreaterThanOrEqual(-90);
              expect(incident.location.lat).toBeLessThanOrEqual(90);
              expect(incident.location.lng).toBeGreaterThanOrEqual(-180);
              expect(incident.location.lng).toBeLessThanOrEqual(180);
            });

            consoleWarnSpy.mockRestore();
            consoleLogSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 15: Error Handling Without Crashes
    // Validates: Requirements 14.4
    it('should handle unauthorized actions with error messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            incidentId: fc.string({ minLength: 10, maxLength: 30 }),
            unitIds: fc.array(fc.string({ minLength: 5, maxLength: 15 }), { minLength: 1, maxLength: 5 }),
            errorMessage: fc.constantFrom(
              'Permission denied',
              'Unauthorized',
              'Insufficient privileges',
              'Access denied'
            ),
          }),
          async (testData) => {
            const { supabase, handleSupabaseError } = await import('@/lib/supabase');
            const { commitDispatch } = await import('./incidentService');

            // Mock unauthorized error from RPC
            vi.mocked(supabase.rpc).mockResolvedValue({
              data: null,
              error: {
                message: testData.errorMessage,
                code: '42501', // PostgreSQL insufficient privilege error
                details: 'User does not have required role',
                hint: null,
              },
            });

            // Spy on console.error
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            // Call commitDispatch - should throw with user-friendly message
            await expect(
              commitDispatch(testData.incidentId, testData.unitIds)
            ).rejects.toThrow();

            // Verify error was logged
            expect(consoleErrorSpy).toHaveBeenCalledWith(
              'Error committing dispatch:',
              expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 15: Error Handling Without Crashes
    // Validates: Requirements 14.2, 14.3
    it('should handle real-time updates with invalid coordinates without crashing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            eventType: fc.constantFrom('INSERT', 'UPDATE'),
            incidentData: fc.record({
              id: fc.string({ minLength: 10, maxLength: 20 }),
              type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other') as fc.Arbitrary<IncidentType>,
              status: fc.constantFrom('pending', 'responding', 'resolved'),
              severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
              description: fc.string({ minLength: 10, maxLength: 200 }),
              // Invalid coordinates
              lat: fc.constantFrom(NaN, Infinity, -Infinity, null as any),
              lng: fc.constantFrom(NaN, Infinity, -Infinity, null as any),
              reported_by_name: fc.string({ minLength: 3, maxLength: 50 }),
              reported_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2030-12-31') }).map(ts => new Date(ts).toISOString()),
              created_at: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2030-12-31') }).map(ts => new Date(ts).toISOString()),
              is_verified: fc.boolean(),
              assigned_unit_ids: fc.array(fc.string()),
            }),
          }),
          async (testData) => {
            const { supabase } = await import('@/lib/supabase');
            const { useResQStore } = await import('@/store/useResQStore');

            // Spy on console.warn to verify invalid data is logged
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            let realtimeHandler: ((payload: any) => void) | null = null;

            // Mock channel to capture the realtime handler
            const mockChannel = {
              on: vi.fn((event, config, handler) => {
                if (config.table === 'incidents') {
                  realtimeHandler = handler;
                }
                return mockChannel;
              }),
              subscribe: vi.fn((callback) => {
                if (typeof callback === 'function') {
                  callback('SUBSCRIBED');
                }
                return { unsubscribe: vi.fn() };
              }),
              unsubscribe: vi.fn(),
            };

            vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

            // Initialize realtime
            const store = useResQStore.getState();
            store.initializeRealtime();

            // Simulate realtime event with invalid coordinates
            if (realtimeHandler) {
              const payload = {
                eventType: testData.eventType,
                new: testData.incidentData,
                old: null,
              };

              // This should not throw even with invalid coordinates
              expect(() => realtimeHandler!(payload)).not.toThrow();

              // Verify warning was logged about invalid coordinates
              expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('[Realtime] Dropped incident'),
                expect.any(Object)
              );

              // Verify incident was NOT added to store (filtered out)
              const incidents = useResQStore.getState().incidents;
              const addedIncident = incidents.find(i => i.id === testData.incidentData.id);
              expect(addedIncident).toBeUndefined();
            }

            // Cleanup
            store.cleanupRealtime();

            consoleWarnSpy.mockRestore();
            consoleLogSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: resq-emergency-response-system, Property 15: Error Handling Without Crashes
    // Validates: Requirements 14.1, 14.2
    it('should continue operating with cached data when database operations fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            cachedIncidents: fc.array(
              fc.record({
                id: fc.string({ minLength: 10, maxLength: 20 }),
                type: fc.constantFrom('fire', 'medical', 'accident', 'crime', 'other') as fc.Arbitrary<IncidentType>,
                status: fc.constantFrom('pending', 'responding', 'resolved'),
                severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
                description: fc.string({ minLength: 10, maxLength: 200 }),
                location: fc.record({
                  lat: fc.double({ min: -90, max: 90, noNaN: true }),
                  lng: fc.double({ min: -180, max: 180, noNaN: true }),
                  address: fc.string(),
                }),
                reportedBy: fc.string({ minLength: 3, maxLength: 50 }),
                reportedAt: fc.integer({ min: Date.parse('2020-01-01'), max: Date.parse('2030-12-31') }).map(ts => new Date(ts)),
                isVerified: fc.boolean(),
              }),
              { minLength: 0, maxLength: 10 }
            ),
          }),
          async (testData) => {
            const { db } = await import('@/lib/supabase');
            const { useResQStore } = await import('@/store/useResQStore');

            // Spy on console.error
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            // Get store and set cached data
            const store = useResQStore.getState();
            store.setIncidents(testData.cachedIncidents);

            // Mock database error
            const mockOrder = vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Connection timeout', code: 'PGRST301' },
            });
            const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
            vi.mocked(db.incidents).mockReturnValue({ select: mockSelect } as any);

            // Attempt to load incidents - should fail but not crash
            await expect(store.loadIncidents()).resolves.not.toThrow();

            // Get fresh state after load
            const freshState = useResQStore.getState();

            // Verify error was logged
            expect(consoleErrorSpy).toHaveBeenCalled();

            // Store should still be accessible and functional (no crash)
            expect(() => freshState.setActiveFilter('fire')).not.toThrow();
            expect(() => freshState.setSelectedIncident('test-id')).not.toThrow();
            expect(() => freshState.toggleTheme()).not.toThrow();

            // Verify incidents is still an array (graceful degradation)
            expect(Array.isArray(freshState.incidents)).toBe(true);

            consoleErrorSpy.mockRestore();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
